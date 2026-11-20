import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, CreditCard, Sparkles, X } from 'lucide-react';
import api from '../api';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonStats } from '../components/Skeleton.jsx';

const BLANK = {
  code: '', name: '', durationDays: 30, price: 0, mrp: 0,
  description: '', sortOrder: 0, active: true,
};

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState(BLANK);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/plans/all');
      setPlans(r.data || []);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Failed to load plans' });
    } finally {
      setLoading(false);
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
      setMsg({ type: 'success', text: `Saved updates for tier: "${p.name}".` });
      await load();
      setTimeout(() => setMsg(null), 2500);
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
      setMsg({ type: 'success', text: `Plan "${newPlan.name}" created successfully!` });
      setNewPlan(BLANK);
      setCreating(false);
      await load();
      setTimeout(() => setMsg(null), 2500);
    } catch (e2) {
      setMsg({ type: 'error', text: e2.response?.data?.error || 'Create failed' });
    }
  }

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-edge/40">
        <PairedHeading
          eyebrow="Subscription Matrix."
          headline="Platform Pricing Tiers."
          description="Configure pricing levels, active durations, MRP strike-through discounts, and sort sequence."
        />
        <button
          onClick={() => setCreating((v) => !v)}
          className="btn-primary h-11 text-sm font-medium"
        >
          {creating ? <X size={16} /> : <Plus size={16} />}
          <span>{creating ? 'Cancel' : 'New Subscription Tier'}</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-[16px] text-sm font-medium flex items-center gap-2 border ${
            msg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-brand-blue" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Create New Plan Card Shell */}
      {creating && (
        <form
          onSubmit={create}
          className="card-feature border border-brand-blue/30 shadow-sm p-6 sm:p-8 space-y-5 animate-in fade-in"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-edge/40">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="font-medium text-lg text-ink dark:text-white">Create New Plan Tier</h3>
              <div className="text-xs text-muted">Available to hospital administrators upon checkout</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Plan Code (Unique Identifier) *</label>
              <input
                className="input"
                value={newPlan.code}
                onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })}
                placeholder="e.g. semi-annual"
                required
              />
            </div>
            <div>
              <label className="label">Display Name *</label>
              <input
                className="input"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                placeholder="e.g. 6 Months Full Care"
                required
              />
            </div>
            <div>
              <label className="label">Duration (Days) *</label>
              <input
                type="number"
                className="input"
                value={newPlan.durationDays}
                onChange={(e) => setNewPlan({ ...newPlan, durationDays: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Offer Price (₹) *</label>
              <input
                type="number"
                className="input"
                value={newPlan.price}
                onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">MRP (₹, for strikethrough)</label>
              <input
                type="number"
                className="input"
                value={newPlan.mrp}
                onChange={(e) => setNewPlan({ ...newPlan, mrp: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input
                type="number"
                className="input"
                value={newPlan.sortOrder}
                onChange={(e) => setNewPlan({ ...newPlan, sortOrder: e.target.value })}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Description / Feature Summary</label>
              <input
                className="input"
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                placeholder="e.g. Recommended for busy hospital OPDs with high booking volume"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="btn-secondary h-11 px-5 text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary h-11 px-7 text-xs font-semibold">
              <Plus size={15} />
              <span>Save & Publish Tier</span>
            </button>
          </div>
        </form>
      )}

      {/* Existing Plans Grid */}
      {loading ? (
        <SkeletonStats count={3} />
      ) : (
        <div className="space-y-4">
          {plans.map((p) => {
            const id = p.id || p._id;
            const disc = discount(p);

            return (
              <div
                key={id}
                className="card-feature p-6 sm:p-7 border border-edge/50 dark:border-edge/40 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-edge/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-violet/15 text-brand-violet flex items-center justify-center">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-lg text-ink dark:text-white">{p.name}</h3>
                        <span className="font-mono text-xs text-muted">({p.code})</span>
                        {disc > 0 && (
                          <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            {disc}% OFF
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">{p.durationDays} Days Active License</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => save(p)}
                      className="btn-sm bg-brand-blue text-white hover:bg-[#1a79ff] text-xs"
                    >
                      <Save size={13} />
                      <span>Update</span>
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="p-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete tier"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="label text-[11px]">Display Name</label>
                    <input
                      className="input h-10 text-xs"
                      value={p.name}
                      onChange={(e) => setField(id, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Price (₹)</label>
                    <input
                      type="number"
                      className="input h-10 text-xs"
                      value={p.price}
                      onChange={(e) => setField(id, 'price', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">MRP (₹)</label>
                    <input
                      type="number"
                      className="input h-10 text-xs"
                      value={p.mrp || 0}
                      onChange={(e) => setField(id, 'mrp', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Duration (Days)</label>
                    <input
                      type="number"
                      className="input h-10 text-xs"
                      value={p.durationDays}
                      onChange={(e) => setField(id, 'durationDays', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-1">
                  <div className="sm:col-span-8">
                    <label className="label text-[11px]">Description Line</label>
                    <input
                      className="input h-10 text-xs"
                      value={p.description || ''}
                      onChange={(e) => setField(id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-[11px]">Sort Order</label>
                    <input
                      type="number"
                      className="input h-10 text-xs"
                      value={p.sortOrder || 0}
                      onChange={(e) => setField(id, 'sortOrder', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-[11px]">Visibility</label>
                    <select
                      className="input h-10 text-xs"
                      value={p.active ? 'true' : 'false'}
                      onChange={(e) => setField(id, 'active', e.target.value === 'true')}
                    >
                      <option value="true">Active</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
