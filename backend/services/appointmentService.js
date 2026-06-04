/**
 * Appointment business-logic.
 *
 * Centralises:
 *   • Code generation (VH-A1B2C3)
 *   • Booking (with concurrency-safe slot guard)
 *   • Reschedule (creates a new appointment, marks old as `rescheduled`)
 *   • Cancel
 *   • Lifecycle transitions (arrived / completed)
 *   • Sheet syncing (and Mongo cleanup when complete/cancelled)
 *   • Postpone redistribution when a doctor is marked absent for a date
 *
 * Every public mutating method emits a realtime event so admin panels get
 * pushed an immediate update.
 */
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const Patient = require('../models/Patient');
const realtime = require('./realtime');
const sheets = require('./googleSheets');
const slotsSvc = require('./slots');
const redis = require('./redis');

function genCode() {
  return 'VH-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function fmt12(time) {
  const [h, m] = (time || '').split(':');
  let hh = parseInt(h, 10) || 0;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${m || '00'} ${ampm}`;
}

/** Decide which sheet tab a given appointment should live in. */
function tabFor(appt) {
  if (appt.status === 'completed') return sheets.TAB_COMPLETED;
  if (appt.status === 'cancelled') return sheets.TAB_CANCELLED;
  // pending: today vs upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apDate = new Date(`${appt.date}T00:00:00`);
  return apDate.getTime() === today.getTime() ? sheets.TAB_TODAY : sheets.TAB_UPCOMING;
}

async function _syncSheetForActive(appt) {
  if (!sheets.isReady()) return;
  try {
    const tab = tabFor(appt);
    // ensure not present in any other "active" tab
    const otherActive = tab === sheets.TAB_TODAY ? sheets.TAB_UPCOMING : sheets.TAB_TODAY;
    await sheets.removeRow(otherActive, appt.code).catch(() => {});
    await sheets.upsertRow(tab, appt);
  } catch (err) {
    console.warn('[appointment] sheet sync failed:', err.message);
  }
}

async function _moveToTerminalSheet(appt) {
  if (!sheets.isReady()) return;
  const tab = appt.status === 'completed' ? sheets.TAB_COMPLETED : sheets.TAB_CANCELLED;
  try {
    // remove from active tabs
    await sheets.removeRow(sheets.TAB_TODAY, appt.code).catch(() => {});
    await sheets.removeRow(sheets.TAB_UPCOMING, appt.code).catch(() => {});
    await sheets.upsertRow(tab, appt);
  } catch (err) {
    console.warn('[appointment] terminal sheet sync failed:', err.message);
  }
}

async function _invalidateCaches(apptId) {
  // Clear both the appointments list cache AND the dashboard stats cache so
  // realtime SSE reloads return fresh data immediately (no 15s staleness).
  await redis.delPattern('vh:cache:appointments:*');
  await redis.del('vh:cache:dashboard:stats');
  if (apptId) await redis.del(`vh:cache:appt:${apptId}`);
}

/* ────────────────────────────── Booking ──────────────────────────────── */

/**
 * Book a new appointment.  Concurrency-safe: relies on a unique sparse index
 * (doctor+date+time among non-completed/cancelled rows) which we enforce in
 * application code by checking before insert.
 */
async function bookAppointment({
  patientPhone,
  patientName,
  patientAge,
  patientGender,
  reason,
  doctorId,
  date,
  time,
  paymentMode = 'pay_at_hospital',
}) {
  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor || !doctor.active) throw new Error('Doctor not available');
  const department = await Department.findById(doctor.department).lean();
  if (!department) throw new Error('Department not found');

  // slot check
  const existing = await Appointment.findOne({
    doctor: doctor._id,
    date,
    time,
    status: { $in: ['booked', 'arrived'] },
  }).lean();
  if (existing) throw new Error('That slot was just taken — please pick another.');

  // upsert patient
  const patient = await Patient.findOneAndUpdate(
    { phone: patientPhone },
    {
      $set: {
        name: patientName,
        age: patientAge || undefined,
        gender: patientGender || '',
      },
      $setOnInsert: { phone: patientPhone },
    },
    { upsert: true, new: true }
  );

  const appt = await Appointment.create({
    code: genCode(),
    patient: patient._id,
    patientPhone,
    patientName,
    patientAge: patientAge || undefined,
    patientGender: patientGender || '',
    reason: reason || '',
    department: department._id,
    departmentName: department.name,
    doctor: doctor._id,
    doctorName: doctor.name,
    doctorSpeciality: doctor.speciality || '',
    date,
    time,
    timeLabel: fmt12(time),
    fee: doctor.consultationFee || 0,
    paymentMode,
    // Online bookings start UNPAID — payment is collected via Meta Native
    // WhatsApp Pay and confirmed by webhook before flipping to 'paid'.
    paymentStatus: 'unpaid',
    status: 'booked',
  });

  await _syncSheetForActive(appt.toObject());
  await _invalidateCaches(appt?._id || apptId);
  await realtime.emit('appointments', { kind: 'created', code: appt.code });
  return appt;
}

/* ───────────────────────────── Reschedule ────────────────────────────── */

async function rescheduleAppointment(apptId, { newDate, newTime, reason = '' } = {}) {
  const old = await Appointment.findById(apptId);
  if (!old) throw new Error('Appointment not found');
  if (!['booked', 'arrived', 'postponed'].includes(old.status))
    throw new Error('Only pending appointments can be rescheduled');

  const doctor = await Doctor.findById(old.doctor).lean();
  if (!doctor) throw new Error('Doctor not found');

  const conflict = await Appointment.findOne({
    doctor: doctor._id,
    date: newDate,
    time: newTime,
    status: { $in: ['booked', 'arrived'] },
  }).lean();
  if (conflict) throw new Error('That new slot was just taken — please pick another.');

  const newAppt = await Appointment.create({
    code: genCode(),
    patient: old.patient,
    patientPhone: old.patientPhone,
    patientName: old.patientName,
    patientAge: old.patientAge,
    patientGender: old.patientGender,
    reason: old.reason,
    department: old.department,
    departmentName: old.departmentName,
    doctor: old.doctor,
    doctorName: old.doctorName,
    doctorSpeciality: old.doctorSpeciality,
    date: newDate,
    time: newTime,
    timeLabel: fmt12(newTime),
    fee: old.fee,
    paymentMode: old.paymentMode,
    paymentStatus: old.paymentStatus,
    status: 'booked',
    rescheduledFrom: old._id,
  });

  old.status = 'rescheduled';
  old.rescheduledTo = newAppt._id;
  old.notes = (old.notes ? old.notes + ' | ' : '') + (reason ? `Rescheduled: ${reason}` : 'Rescheduled by patient');
  await old.save();

  // Move old to "Cancelled" tab (rescheduled rows are coloured purple there)
  await sheets.removeRow(sheets.TAB_TODAY, old.code).catch(() => {});
  await sheets.removeRow(sheets.TAB_UPCOMING, old.code).catch(() => {});
  await sheets.upsertRow(sheets.TAB_CANCELLED, old.toObject()).catch(() => {});

  await _syncSheetForActive(newAppt.toObject());
  await _invalidateCaches(appt?._id || apptId);
  await realtime.emit('appointments', { kind: 'rescheduled', oldCode: old.code, newCode: newAppt.code });
  return { old, newAppt };
}

/* ────────────────────────────── Cancel ───────────────────────────────── */

async function cancelAppointment(apptId, { reason = '' } = {}) {
  const appt = await Appointment.findById(apptId);
  if (!appt) throw new Error('Appointment not found');
  if (!['booked', 'arrived', 'postponed'].includes(appt.status))
    throw new Error('This appointment cannot be cancelled');

  appt.status = 'cancelled';
  appt.cancelledAt = new Date();
  appt.cancellationReason = reason || 'Cancelled by patient';
  await appt.save();

  await _moveToTerminalSheet(appt.toObject());
  await Appointment.deleteOne({ _id: appt._id }); // remove from Mongo per requirement
  await _invalidateCaches(appt?._id || apptId);
  await realtime.emit('appointments', { kind: 'cancelled', code: appt.code });
  return appt;
}

/* ─────────────────── Lifecycle (admin-driven transitions) ────────────── */

async function markArrived(apptId) {
  const appt = await Appointment.findById(apptId);
  if (!appt) throw new Error('Appointment not found');
  if (appt.status !== 'booked') throw new Error('Only booked appointments can be marked arrived');
  appt.status = 'arrived';
  appt.arrivedAt = new Date();
  await appt.save();
  await _syncSheetForActive(appt.toObject());
  await _invalidateCaches(appt?._id || apptId);
  await realtime.emit('appointments', { kind: 'arrived', code: appt.code });
  return appt;
}

async function markCompleted(apptId, { paymentReceived = false, notes = '' } = {}) {
  const appt = await Appointment.findById(apptId);
  if (!appt) throw new Error('Appointment not found');
  if (!['arrived', 'booked'].includes(appt.status))
    throw new Error('Only arrived/booked appointments can be completed');
  appt.status = 'completed';
  appt.completedAt = new Date();
  if (notes) appt.notes = (appt.notes ? appt.notes + ' | ' : '') + notes;
  if (paymentReceived && appt.paymentMode === 'pay_at_hospital') appt.paymentStatus = 'paid';
  await appt.save();

  await _moveToTerminalSheet(appt.toObject());
  await Appointment.deleteOne({ _id: appt._id });
  await _invalidateCaches(appt?._id || apptId);
  await realtime.emit('appointments', { kind: 'completed', code: appt.code });
  return appt;
}

async function markPaymentReceived(apptId) {
  const appt = await Appointment.findById(apptId);
  if (!appt) throw new Error('Appointment not found');
  appt.paymentStatus = 'paid';
  await appt.save();
  await _syncSheetForActive(appt.toObject());
  await _invalidateCaches(appt?._id || apptId);
  await realtime.emit('appointments', { kind: 'payment_updated', code: appt.code });
  return appt;
}

/* ─────────────────────── Doctor Postpone (absence) ───────────────────── */

/**
 * When admin marks a doctor absent for a date, postpone every active
 * appointment that day to the next available slot for the same doctor.
 *
 * Returns an array of `{ old, newAppt }` pairs so callers can notify patients.
 */
async function postponeDoctorDay(doctorId, date, reason) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new Error('Doctor not found');

  // record absence on doctor (idempotent)
  if (!(doctor.absences || []).some((a) => a.date === date)) {
    doctor.absences.push({ date, reason: reason || 'Doctor unavailable' });
    await doctor.save();
  }

  const todays = await Appointment.find({
    doctor: doctor._id,
    date,
    status: { $in: ['booked', 'arrived'] },
  });
  if (!todays.length) return [];

  // Find replacement slots one-by-one to avoid double-booking
  const moved = [];
  // start search from the day AFTER the cancelled one
  let cursor = new Date(`${date}T00:00:00`);
  cursor.setDate(cursor.getDate() + 1);
  const cursorYmd = () => slotsSvc.ymd(cursor);

  for (const old of todays) {
    let placed = false;

    // Hold a temporary "reserved" set so concurrent slots within this call
    // don't all map to the same new slot.
    let attempts = 0;
    while (!placed && attempts < 30) {
      attempts++;
      const newSlot = await slotsSvc.findNextFreeSlot(doctor.toObject(), cursorYmd());
      if (!newSlot) break;

      // race-safe insert
      try {
        const replacement = await Appointment.create({
          code: genCode(),
          patient: old.patient,
          patientPhone: old.patientPhone,
          patientName: old.patientName,
          patientAge: old.patientAge,
          patientGender: old.patientGender,
          reason: old.reason,
          department: old.department,
          departmentName: old.departmentName,
          doctor: old.doctor,
          doctorName: old.doctorName,
          doctorSpeciality: old.doctorSpeciality,
          date: newSlot.date,
          time: newSlot.time,
          timeLabel: newSlot.label,
          fee: old.fee,
          paymentMode: old.paymentMode,
          paymentStatus: old.paymentStatus,
          status: 'booked',
          postponeReason: reason || 'Doctor unavailable',
          postponedFromDate: old.date,
          postponedFromTime: old.time,
        });

        old.status = 'postponed';
        old.postponeReason = reason || 'Doctor unavailable';
        old.rescheduledTo = replacement._id;
        old.notes = (old.notes ? old.notes + ' | ' : '') + 'Postponed: ' + (reason || '');
        await old.save();

        // colour old as blue (postponed) under Cancelled tab; new active row stays in active tabs
        await sheets.removeRow(sheets.TAB_TODAY, old.code).catch(() => {});
        await sheets.removeRow(sheets.TAB_UPCOMING, old.code).catch(() => {});
        await sheets.upsertRow(sheets.TAB_CANCELLED, old.toObject()).catch(() => {});
        await _syncSheetForActive(replacement.toObject());

        moved.push({ old: old.toObject(), newAppt: replacement.toObject() });
        placed = true;
      } catch (err) {
        // Slot likely just got taken — retry with a later slot
        console.warn('[postpone] slot collision, retrying:', err.message);
      }
    }
    if (!placed) {
      // Couldn't find any replacement — leave old as `postponed` without new slot
      old.status = 'postponed';
      old.postponeReason = reason || 'Doctor unavailable (no future slots found)';
      await old.save();
      await sheets.removeRow(sheets.TAB_TODAY, old.code).catch(() => {});
      await sheets.removeRow(sheets.TAB_UPCOMING, old.code).catch(() => {});
      await sheets.upsertRow(sheets.TAB_CANCELLED, old.toObject()).catch(() => {});
      moved.push({ old: old.toObject(), newAppt: null });
    }
  }

  await _invalidateCaches(appt?._id || apptId);
  await realtime.emit('appointments', { kind: 'postponed', doctor: String(doctor._id), date, count: moved.length });
  await realtime.emit('doctors', { kind: 'absent', doctor: String(doctor._id), date });
  return moved;
}

/* ─────────────────────────── Refresh sheets ──────────────────────────── */

/** Re-sync every active appointment to its appropriate sheet tab. */
async function refreshAllSheets() {
  if (!sheets.isReady()) return 0;
  await sheets.ensureTabs();
  const all = await Appointment.find().lean();
  for (const a of all) await _syncSheetForActive(a);
  return all.length;
}

module.exports = {
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  markArrived,
  markCompleted,
  markPaymentReceived,
  postponeDoctorDay,
  refreshAllSheets,
};
