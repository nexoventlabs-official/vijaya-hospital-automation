/**
 * Slot computation helpers.
 *
 * A Doctor has weekly slot windows (e.g. "Mon 10:00-13:00 step=15min"). On any
 * given date this expands into discrete time slots, then we subtract:
 *   • hospital holidays
 *   • doctor absences
 *   • already-booked appointments at that time
 *
 * Used by:
 *   • Flow endpoint when listing available slots for booking / reschedule
 *   • Postpone service when redistributing a doctor's appointments
 */
const Holiday = require('../models/Holiday');
const Appointment = require('../models/Appointment');

/** Local YYYY-MM-DD for any Date. */
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "10:00" → "10:00 AM" */
function fmt12(time) {
  const [hRaw, mRaw] = time.split(':');
  let h = parseInt(hRaw, 10);
  const m = mRaw || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** Convert "HH:mm" → minutes since midnight. */
function toMinutes(t) {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Expand the doctor's weekly slot windows for the given date (no booking checks). */
function expandSlotsForDate(doctor, date) {
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.getDay();
  const out = [];
  for (const w of doctor.weeklySlots || []) {
    if (w.weekday !== weekday) continue;
    const start = toMinutes(w.startTime);
    const end = toMinutes(w.endTime);
    const step = Math.max(5, w.duration || 15);
    for (let t = start; t + step <= end; t += step) {
      const time = toHHMM(t);
      out.push({ date, time, label: fmt12(time) });
    }
  }
  return out;
}

async function listAvailableSlots(doctor, { fromDate, days = 14, excludeAppointmentId, skipToday = false } = {}) {
  const start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);
  // When skipToday is set (and no explicit fromDate), begin from tomorrow so
  // today's date never appears as a bookable slot.
  if (skipToday && !fromDate) {
    start.setDate(start.getDate() + 1);
  }

  const holidays = new Set((await Holiday.find().lean()).map((h) => h.date));
  const absentDates = new Set((doctor.absences || []).map((a) => a.date));

  const todayKey = ymd(new Date());
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = ymd(d);
    if (skipToday && key === todayKey) continue; // never offer today
    if (holidays.has(key)) continue;
    if (absentDates.has(key)) continue;
    dates.push(key);
  }

  // pull existing booked appointments for this doctor in window (booked / arrived)
  const existing = await Appointment.find({
    doctor: doctor._id,
    date: { $in: dates },
    status: { $in: ['booked', 'arrived'] },
  })
    .select('date time _id')
    .lean();

  const taken = new Set();
  for (const a of existing) {
    if (excludeAppointmentId && String(a._id) === String(excludeAppointmentId)) continue;
    taken.add(`${a.date}|${a.time}`);
  }

  const now = new Date();
  const out = [];
  for (const date of dates) {
    for (const slot of expandSlotsForDate(doctor, date)) {
      const key = `${date}|${slot.time}`;
      if (taken.has(key)) continue;
      // hide past slots for today
      if (date === ymd(now)) {
        const slotDate = new Date(`${date}T${slot.time}:00`);
        if (slotDate <= now) continue;
      }
      out.push(slot);
    }
  }
  return out;
}

/** Find the next free slot ≥ a given date (used by postpone). */
async function findNextFreeSlot(doctor, fromDate) {
  const slots = await listAvailableSlots(doctor, { fromDate, days: 30 });
  return slots[0] || null;
}

module.exports = { ymd, fmt12, expandSlotsForDate, listAvailableSlots, findNextFreeSlot };
