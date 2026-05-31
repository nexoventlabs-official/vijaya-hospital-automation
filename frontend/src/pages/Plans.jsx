import { useEffect, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import api from '../api';

const BLANK = { code: '', name: '', durationDays: 30, price: 0, mrp: 0, description: '', sortOrder: 0, active: true };

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [msg, setMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState(BLANK);

  async function load() {
    try {
      const r = await api.get('/plans/all');
      setPlans(r.data || []);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Failed to load plans'));
    }
  }
  useEffect(() => { load(); }, []);

  function discount(p) {
    if (!p.mrp || p.mrp <= p.price) return 0;
    return Math.round(((p.mrp - p.price) / p.mrp) * 100);
  }

  function setField(id, key, val) {
    setPlans((ps) => ps.map((p) => ((p.id || p._id) === id ? { ...p, [key]: val } : p)));
  }

  async function save(p) {
    setMsg('');
    try {
      await api.put(`/plans/${p.id || p._id}`, {
        name: p.name,
        durationDays: Number(p.durationDays),
        price: Number(p.price),
        mrp: Number(p.mrp),
        description: p.description,
        sortOrder: Number(p.sortOrder),
        active: !!p.active,
      });
      setMsg('✅ Saved ' + p.name);
      await load();
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Save failed'));
    }
  }

  async function remove(p) {
    if (!confirm(`Delete plan "${p.name}"?`)) return;
    try {
      await api.delete(`/plans/${p.id || p._id}`);
      await load();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Delete failed'));
    }
  }

  async function create(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/plans', newPlan);
      setMsg('✅ Plan created');
      setNewPlan(BLANK);
      setCreating(false);
      await load();
      setTimeout(() => setMsg(''), 2000);
    } catch (e2) {
      setMsg('❌ ' + (e2.response?.data?.error || 'Create failed'));
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Plans</h1>
          <p className="text-sm text-slate-500">Set plan prices, durations and discounts. Admins purchase these to unlock automation.</p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="btn-secondary"><Plus size={16} /> New Plan</button>
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      {creating && (
        <form onSubmit={create} className="card p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Code (unique)</label>
            <input className="input" value={newPlan.code} onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })} placeholder="quarterly" required />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="3 Months" required />
          </div>
          <div>
            <label className="label">Duration (days)</label>
            <input type="number" className="input" value={newPlan.durationDays} onChange={(e) => setNewPlan({ ...newPlan, durationDays: e.target.value })} required />
          </div>
          <div>
            <label className="label">Price (₹)</label>
            <input type="number" className="input" value={newPlan.price} onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })} required />
          </div>
          <div>
            <label className="label">MRP (₹, for discount)</label>
            <input type="number" className="input" value={newPlan.mrp} onChange={(e) => setNewPlan({ ...newPlan, mrp: e.target.value })} />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input type="number" className="input" value={newPlan.sortOrder} onChange={(e) => setNewPlan({ ...newPlan, sortOrder: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <label className="label">Description</label>
            <input className="input" value={newPlan.description} onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="btn-primary"><Plus size={16} /> Create Plan</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {plans.map((p) => {
          const id = p.id || p._id;
          return (
            <div key={id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-brand-900">
                  {p.name} <span className="text-xs text-slate-400">({p.code})</span>
                  {discount(p) > 0 && <span className="ml-2 badge bg-emerald-100 text-emerald-700">{discount(p)}% OFF</span>}
                </div>
                <button onClick={() => remove(p)} className="btn-ghost text-rose-600"><Trash2 size={15} /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={p.name} onChange={(e) => setField(id, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Duration (days)</label>
                  <input type="number" className="input" value={p.durationDays} onChange={(e) => setField(id, 'durationDays', e.target.value)} />
                </div>
                <div>
                  <label className="label">Price (₹)</label>
                  <input type="number" className="input" value={p.price} onChange={(e) => setField(id, 'price', e.target.value)} />
                </div>
                <div>
                  <label className="label">MRP (₹)</label>
                  <input type="number" className="input" value={p.mrp} onChange={(e) => setField(id, 'mrp', e.target.value)} />
                </div>
                <div>
                  <label className="label">Sort</label>
                  <input type="number" className="input" value={p.sortOrder} onChange={(e) => setField(id, 'sortOrder', e.target.value)} />
                </div>
                <div>
                  <label className="label">Active</label>
                  <select className="input" value={p.active ? '1' : '0'} onChange={(e) => setField(id, 'active', e.target.value === '1')}>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-5">
                  <label className="label">Description</label>
                  <input className="input" value={p.description || ''} onChange={(e) => setField(id, 'description', e.target.value)} />
                </div>
                <div className="flex items-end">
                  <button onClick={() => save(p)} className="btn-primary w-full"><Save size={15} /> Save</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
