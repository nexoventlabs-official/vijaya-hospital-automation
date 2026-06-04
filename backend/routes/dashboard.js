const express = require('express');
const { auth } = require('../middleware/auth');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const redis = require('../services/redis');
const slotsSvc = require('../services/slots');

const router = express.Router();
const CACHE_KEY = 'vh:cache:dashboard:stats';
const CACHE_TTL = 120; // 2 minutes — stats don't need to be real-time to the second

router.get('/stats', auth, async (req, res) => {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const today = slotsSvc.ymd(new Date());
    const [departments, doctors, todayAppts, upcoming, pendingPay, patients, recent] = await Promise.all([
      Department.countDocuments({ active: true }),
      Doctor.countDocuments({ active: true }),
      Appointment.countDocuments({ date: today, status: { $in: ['booked', 'arrived'] } }),
      Appointment.countDocuments({ date: { $gt: today }, status: { $in: ['booked', 'arrived'] } }),
      Appointment.countDocuments({ paymentStatus: 'unpaid', status: { $in: ['booked', 'arrived'] } }),
      Patient.estimatedDocumentCount(),
      Appointment.find({}, { code: 1, patientName: 1, doctorName: 1, date: 1, time: 1, timeLabel: 1, status: 1, createdAt: 1 })
        .sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const data = {
      stats: { departments, doctors, todayAppts, upcoming, pendingPay, patients },
      recent,
    };
    await redis.set(CACHE_KEY, data, CACHE_TTL);
    res.json(data);
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
