/**
 * Smoke tests — purely in-process, no Mongo / Meta calls. Verifies that the
 * core service modules load and basic helpers behave.
 */

const path = require('path');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/vijya_hospital_test';

describe('i18n', () => {
  const { t } = require('../services/i18n');
  test('returns English for default lang', () => {
    expect(t('svc_book_appointment', 'en')).toMatch(/Book Appointment/i);
  });
  test('returns Telugu when asked', () => {
    expect(t('svc_book_appointment', 'te').length).toBeGreaterThan(0);
  });
  test('substitutes vars', () => {
    expect(t('pay_sub', 'en', { fee: 500 })).toMatch(/500/);
  });
});

describe('flowJson', () => {
  const { buildFlowJSON } = require('../services/flowJson');
  test('builds a valid flow object with the expected screens', () => {
    const j = buildFlowJSON();
    const ids = j.screens.map((s) => s.id);
    expect(ids).toContain('SERVICE_SELECT');
    expect(ids).toContain('BOOK_DEPT');
    expect(ids).toContain('BOOK_DOCTOR');
    expect(ids).toContain('BOOK_FORM');
    expect(ids).toContain('BOOK_PAYMENT');
    expect(ids).toContain('MY_APPTS');
    expect(ids).toContain('RESCHEDULE_PICK');
    expect(ids).not.toContain('CANCEL_PICK');
    expect(ids).toContain('INFO');
  });
});

describe('slots helpers', () => {
  const slots = require('../services/slots');
  test('expandSlotsForDate returns nothing on a non-matching weekday', () => {
    const fakeDoc = { weeklySlots: [{ weekday: 1, startTime: '10:00', endTime: '11:00', duration: 15 }] };
    const r = slots.expandSlotsForDate(fakeDoc, '2030-01-06'); // Sunday
    expect(r).toEqual([]);
  });
  test('expandSlotsForDate steps through the window', () => {
    const monday = '2030-01-07';
    const fakeDoc = { weeklySlots: [{ weekday: 1, startTime: '10:00', endTime: '11:00', duration: 15 }] };
    const r = slots.expandSlotsForDate(fakeDoc, monday);
    expect(r.map((s) => s.time)).toEqual(['10:00', '10:15', '10:30', '10:45']);
  });
});

describe('redis fallback', () => {
  const redis = require('../services/redis');
  test('memory get/set/del round-trips', async () => {
    await redis.set('vh:test:k', { x: 1 }, 60);
    const v = await redis.get('vh:test:k');
    expect(v).toEqual({ x: 1 });
    await redis.del('vh:test:k');
    expect(await redis.get('vh:test:k')).toBeNull();
  });
});
