import { useEffect, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import api from '../api';

const BLANK = { code: '', name: '', durationDays: 30, price: 0, mrp: 0, description: '', sortOrder: 0, active: true };

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [msg, setMsg] = useState(null); // { type: 'success' | 'error', text: '...' }
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState(BLANK);

  async function load() {
    try {
      const r = await api.get('/plans/all');
      setPlans(r.data || []);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Failed to load plans' });
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
    setMsg(null);
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
      setMsg({ type: 'success', text: `Saved plan details for ${p.name}` });
      await load();
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Save failed' });
    }
  }

  async function remove(p) {
    if (!confirm(`Delete plan "${p.name}"?`)) return;
    try {
      await api.delete(`/plans/${p.id || p._id}`);
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Delete failed' });
    }
  }

  async function create(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/plans', newPlan);
      setMsg({ type: 'success', text: 'Plan created successfully' });
      setNewPlan(BLANK);
      setCreating(false);
      await load();
      setTimeout(() => setMsg(null), 2000);
    } catch (e2) {
      setMsg({ type: 'error', text: e2.response?.data?.error || 'Create failed' });
    }
  }

  return (
    <div className="space-y-6 max-w-5xl font-mint">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Plans</h1>
          <p className="text-sm text-soft-stone mt-1">Configure pricing tiers, MRP discounts, active days, and listing sorting.</p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="btn-secondary py-2.5 px-4 text-xs font-semibold">
          <Plus size={14} /> New Plan
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
          msg.type === 'success'
            ? 'bg-pale-mint/30 border-pale-mint text-zenith-teal'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {creating && (
        <form onSubmit={create} className="card p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-pale-amber/10 border-arctic-mist">
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
            <button className="btn-primary py-2.5 px-4 text-xs font-semibold"><Plus size={14} /> Create Plan</button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {plans.map((p) => {
          const id = p.id || p._id;
          return (
            <div key={id} className="card p-6 hover:border-zenith-teal/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-arctic-mist pb-3">
                <div className="font-semibold text-lg text-midnight-pine font-grenette flex items-center gap-2">
                  {p.name} <span className="text-xs font-mono text-soft-stone font-normal">({p.code})</span>
                  {discount(p) > 0 && <span className="badge bg-pale-mint/40 text-zenith-teal border-pale-mint font-semibold">{discount(p)}% OFF</span>}
                </div>
                <button onClick={() => remove(p)} className="btn-ghost py-1.5 px-2.5 text-xs text-rose-600 hover:text-rose-700">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="label">Name</label>
                  <input className="input text-sm py-1.5 px-2" value={p.name} onChange={(e) => setField(id, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Duration (days)</label>
                  <input type="number" className="input text-sm py-1.5 px-2" value={p.durationDays} onChange={(e) => setField(id, 'durationDays', e.target.value)} />
                </div>
                <div>
                  <label className="label">Price (₹)</label>
                  <input type="number" className="input text-sm py-1.5 px-2" value={p.price} onChange={(e) => setField(id, 'price', e.target.value)} />
                </div>
                <div>
                  <label className="label">MRP (₹)</label>
                  <input type="number" className="input text-sm py-1.5 px-2" value={p.mrp} onChange={(e) => setField(id, 'mrp', e.target.value)} />
                </div>
                <div>
                  <label className="label">Sort</label>
                  <input type="number" className="input text-sm py-1.5 px-2" value={p.sortOrder} onChange={(e) => setField(id, 'sortOrder', e.target.value)} />
                </div>
                <div>
                  <label className="label">Active</label>
                  <select className="input text-sm py-1.5 px-2" value={p.active ? '1' : '0'} onChange={(e) => setField(id, 'active', e.target.value === '1')}>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-5">
                  <label className="label">Description</label>
                  <input className="input text-sm py-2 px-3" value={p.description || ''} onChange={(e) => setField(id, 'description', e.target.value)} />
                </div>
                <div className="flex items-end col-span-2 md:col-span-1">
                  <button onClick={() => save(p)} className="btn-primary w-full py-2.5 text-xs font-semibold">
                    <Save size={14} /> Save
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
