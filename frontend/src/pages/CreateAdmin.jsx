import { useEffect, useState } from 'react';
import { UserPlus, Trash2, KeyRound, Check, X, Crown, Shield, Lock } from 'lucide-react';
import api from '../api';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CreateAdmin() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pwId, setPwId] = useState(null);
  const [pwValue, setPwValue] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/admins');
      setAdmins(r.data || []);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Failed to load administrators' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post('/admins', form);
      setMsg({ type: 'success', text: `Admin account for "${form.name}" created successfully!` });
      setForm({ name: '', phone: '', email: '', password: '' });
      await load();
      setTimeout(() => setMsg(null), 3000);
    } catch (e2) {
      setMsg({ type: 'error', text: e2.response?.data?.error || 'Failed to create admin account' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a) {
    try {
      await api.put(`/admins/${a.id}`, { active: !a.active });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Update failed' });
    }
  }

  async function remove(a) {
    if (!confirm(`Permanently remove administrator "${a.name || a.username}"?`)) return;
    try {
      await api.delete(`/admins/${a.id}`);
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Delete failed' });
    }
  }

  async function resetPassword(a) {
    if (!pwValue) {
      setMsg({ type: 'error', text: 'Please enter a replacement password first.' });
      return;
    }
    try {
      await api.post(`/admins/${a.id}/password`, { password: pwValue });
      setMsg({ type: 'success', text: `Password successfully updated for ${a.name || a.username}.` });
      setPwId(null);
      setPwValue('');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Password reset failed' });
    }
  }

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <PairedHeading
        eyebrow="Administrative Access."
        headline="Hospital Administrators."
        description="Register clinic admin accounts, manage active licenses, and update credentials."
      />

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

      {/* Create Admin Form Shell */}
      <form
        onSubmit={create}
        className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-edge/40">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
            <UserPlus size={18} />
          </div>
          <div>
            <h3 className="font-medium text-lg text-ink dark:text-white">Register New Hospital Administrator</h3>
            <div className="text-xs text-muted">Creates credentials with access to clinical console</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Dr. Vijya Admin"
              required
            />
          </div>

          <div>
            <label className="label">Mobile Number (Login Identifier) *</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          <div>
            <label className="label">Billing Email (Invoices Sent Here) *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@vijyahospital.com"
              required
            />
          </div>

          <div>
            <label className="label">Initial Access Password *</label>
            <input
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Assign a secure password"
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary h-11 px-7 text-xs font-semibold shadow-glow-blue"
          >
            <UserPlus size={15} />
            <span>{saving ? 'Creating Account…' : 'Create Admin Account'}</span>
          </button>
        </div>
      </form>

      {/* Admin List Table */}
      {loading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : (
        <div className="card-feature p-0 overflow-hidden border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f4f4f5]/60 dark:bg-dark-card/40 border-b border-edge/60 text-xs font-medium text-muted uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-4">Administrator</th>
                  <th className="text-left px-6 py-4">Mobile & Login</th>
                  <th className="text-left px-6 py-4">Billing Email</th>
                  <th className="text-left px-6 py-4">Plan Status</th>
                  <th className="text-left px-6 py-4">Access Status</th>
                  <th className="text-right px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/40">
                {admins.map((a) => (
                  <tr key={a.id} className="hover:bg-control/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink dark:text-white text-sm">
                        {a.name || a.username}
                      </div>
                      <div className="text-xs text-muted">Created: {fmtDate(a.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-brand-blue">
                      {a.phone || a.username}
                    </td>
                    <td className="px-6 py-4 text-muted text-xs">
                      {a.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {a.plan ? (
                        <div>
                          <span className="badge bg-brand-tint text-brand-blue border border-brand-blue/30 text-xs">
                            {a.plan.planName}
                          </span>
                          <div className="text-[11px] text-muted mt-0.5">
                            Until {fmtDate(a.plan.endsAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="badge bg-control text-muted text-xs">
                          No Plan
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(a)}
                        className={`badge cursor-pointer ${
                          a.active
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {a.active ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPwId(pwId === a.id ? null : a.id)}
                          className="p-2 rounded-full text-brand-blue hover:bg-brand-tint dark:hover:bg-brand-blue/20 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => remove(a)}
                          className="p-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Remove admin"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Inline password reset row */}
                      {pwId === a.id && (
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <input
                            className="input h-9 text-xs w-48"
                            placeholder="New password"
                            value={pwValue}
                            onChange={(e) => setPwValue(e.target.value)}
                          />
                          <button
                            onClick={() => resetPassword(a)}
                            className="btn-sm bg-brand-blue text-white hover:bg-[#1a79ff] text-xs h-9"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setPwId(null)}
                            className="btn-sm bg-control text-muted text-xs h-9"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!admins.length && (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-muted text-sm space-y-2">
                      <div className="font-medium text-ink dark:text-white">No administrators registered</div>
                      <div className="text-xs">Use the form above to add an administrator account.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
