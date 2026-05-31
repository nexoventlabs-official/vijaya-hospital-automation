import { useEffect, useState } from 'react';
import { UserPlus, Trash2, KeyRound, Check, X, Crown } from 'lucide-react';
import api from '../api';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CreateAdmin() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success' | 'error', text: '...' }
  const [pwId, setPwId] = useState(null);
  const [pwValue, setPwValue] = useState('');

  async function load() {
    try {
      const r = await api.get('/admins');
      setAdmins(r.data || []);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Failed to load admins' });
    }
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      await api.post('/admins', form);
      setMsg({ type: 'success', text: 'Administrator account successfully created' });
      setForm({ name: '', phone: '', email: '', password: '' });
      await load();
      setTimeout(() => setMsg(null), 2500);
    } catch (e2) {
      setMsg({ type: 'error', text: e2.response?.data?.error || 'Failed to create admin' });
    } finally { setSaving(false); }
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
    if (!confirm(`Delete admin "${a.name || a.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admins/${a.id}`);
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Delete failed' });
    }
  }

  async function resetPassword(a) {
    if (!pwValue) {
      setMsg({ type: 'error', text: 'Please enter a new password first' });
      return;
    }
    try {
      await api.post(`/admins/${a.id}/password`, { password: pwValue });
      setMsg({ type: 'success', text: `Password successfully updated for ${a.name || a.username}` });
      setPwId(null); setPwValue('');
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Password reset failed' });
    }
  }

  return (
    <div className="space-y-6 max-w-5xl font-mint">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Create Admin</h1>
        <p className="text-sm text-soft-stone mt-1">Register hospital admin accounts and manage their subscriptions.</p>
      </div>

      {/* Create form */}
      <form onSubmit={create} className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Admin Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hospital Admin" />
        </div>
        <div>
          <label className="label">Mobile Number (used as login)</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" required />
        </div>
        <div>
          <label className="label">Email (invoices sent here)</label>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@hospital.com" required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a password" required />
        </div>
        
        {msg && (
          <div className={`md:col-span-2 p-4 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
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

        <div className="md:col-span-2 flex justify-end">
          <button className="btn-primary py-2.5 px-5 text-xs font-semibold" disabled={saving}>
            <UserPlus size={14} /> {saving ? 'Creating…' : 'Create Admin'}
          </button>
        </div>
      </form>

      {/* Admin list */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-arctic-mist font-semibold text-midnight-pine bg-pale-amber/10 font-grenette text-lg">
          Hospital Administrators
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-pale-amber/20 text-midnight-pine border-b border-arctic-mist font-grenette text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Mobile</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arctic-mist/75">
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-soft-stone text-sm">
                    No admins created yet
                  </td>
                </tr>
              )}
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-pale-amber/5 transition-colors duration-150 align-top">
                  <td className="px-5 py-4 font-semibold text-midnight-pine text-sm font-grenette">{a.name}</td>
                  <td className="px-5 py-4 font-mono text-xs">{a.phone || a.username}</td>
                  <td className="px-5 py-4 text-soft-stone">{a.email || '—'}</td>
                  <td className="px-5 py-4">
                    {a.subscription?.active ? (
                      <span className="badge bg-pale-mint/40 text-zenith-teal border-pale-mint inline-flex items-center gap-1">
                        <Crown size={12} className="fill-zenith-teal" /> {a.subscription.planName} · till {fmtDate(a.subscription.endsAt)}
                      </span>
                    ) : (
                      <span className="badge bg-slate-50 text-soft-stone border-arctic-mist">No active plan</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {a.active ? (
                      <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200">Active</span>
                    ) : (
                      <span className="badge bg-rose-50 text-rose-800 border-rose-200">Disabled</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-end gap-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActive(a)} className="btn-ghost py-1 px-2 text-xs" title={a.active ? 'Disable' : 'Enable'}>
                          {a.active ? <X size={14} className="text-rose-600" /> : <Check size={14} className="text-emerald-600" />}
                        </button>
                        <button onClick={() => { setPwId(pwId === a.id ? null : a.id); setPwValue(''); }} className="btn-ghost py-1 px-2 text-xs" title="Reset password">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => remove(a)} className="btn-ghost py-1 px-2 text-xs text-rose-600 hover:text-rose-700" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {pwId === a.id && (
                        <div className="flex items-center gap-2 mt-1 bg-pale-amber/30 p-2 rounded-xl border border-arctic-mist">
                          <input className="input py-1.5 px-2 text-xs w-40" placeholder="New password" value={pwValue} onChange={(e) => setPwValue(e.target.value)} />
                          <button onClick={() => resetPassword(a)} className="btn-primary py-1.5 px-3 text-xs font-semibold">Save</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
