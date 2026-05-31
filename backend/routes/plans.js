/**
 * Subscription plans.
 *
 *   GET    /api/plans            — list active plans (any authenticated user; admins see these on Purchase)
 *   GET    /api/plans/all        — list all plans (super admin)
 *   POST   /api/plans            — create a plan (super admin)
 *   PUT    /api/plans/:id        — update a plan / its price (super admin)
 *   DELETE /api/plans/:id        — delete a plan (super admin)
 */
const express = require('express');
const Plan = require('../models/Plan');
const plansSvc = require('../services/plans');
const { auth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

/** Active plans — visible to admins on the Purchase page. */
router.get('/', auth, async (req, res) => {
  try {
    const plans = await plansSvc.listActive();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** All plans — super admin management view. */
router.get('/all', auth, requireSuperAdmin, async (req, res) => {
  try {
    const plans = await plansSvc.listAll();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { code, name, durationDays, price, mrp, description, sortOrder, active } = req.body || {};
    if (!code || !name || !durationDays || price === undefined) {
      return res.status(400).json({ error: 'code, name, durationDays and price are required' });
    }
    const exists = await Plan.findOne({ code: String(code).trim() });
    if (exists) return res.status(409).json({ error: 'A plan with this code already exists' });
    const plan = await Plan.create({
      code: String(code).trim(),
      name,
      durationDays: parseInt(durationDays, 10),
      price: Number(price),
      mrp: Number(mrp) || 0,
      description: description || '',
      sortOrder: Number(sortOrder) || 0,
      active: active === undefined ? true : !!active,
    });
    res.status(201).json(plan.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const { name, durationDays, price, mrp, description, sortOrder, active } = req.body || {};
    if (name !== undefined) plan.name = name;
    if (durationDays !== undefined) plan.durationDays = parseInt(durationDays, 10);
    if (price !== undefined) plan.price = Number(price);
    if (mrp !== undefined) plan.mrp = Number(mrp) || 0;
    if (description !== undefined) plan.description = description;
    if (sortOrder !== undefined) plan.sortOrder = Number(sortOrder) || 0;
    if (active !== undefined) plan.active = !!active;
    await plan.save();
    res.json(plan.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    await plan.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
