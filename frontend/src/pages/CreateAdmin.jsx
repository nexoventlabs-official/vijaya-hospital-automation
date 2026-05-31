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
  const [msg, setMsg] = useState('');
  const [pwId, setPwId] = useState(null);
  const [pwValue, setPwValue] = useState('');

  async function load() {
    try {
      const r = await api.get('/admins');
      setAdmins(r.data || []);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Failed to load admins'));
    }
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.post('/admins', form);
      setMsg('✅ Admin created');
      setForm({ name: '', phone: '', email: '', password: '' });
      await load();
      setTimeout(() => setMsg(''), 2500);
    } catch (e2) {
      setMsg('❌ ' + (e2.response?.data?.error || 'Failed to create admin'));
    } finally { setSaving(false); }
  }

  async function toggleActive(a) {
    try {
      await api.put(`/admins/${a.id}`, { active: !a.active });
      await load();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Update failed'));
    }
  }

  async function remove(a) {
    if (!confirm(`Delete admin "${a.name || a.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admins/${a.id}`);
      await load();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Delete failed'));
    }
  }

  async function resetPassword(a) {
    if (!pwValue) { setMsg('❌ Enter a new password first'); return; }
    try {
      await api.post(`/admins/${a.id}/password`, { password: pwValue });
      setMsg('✅ Password updated for ' + (a.name || a.username));
      setPwId(null); setPwValue('');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Password reset failed'));
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-900">Create Admin</h1>

      {/* Create form */}
      <form onSubmit={create} className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="md:col-span-2 flex items-center justify-between">
          {msg ? <div className="text-sm">{msg}</div> : <span />}
          <button className="btn-primary" disabled={saving}>
            <UserPlus size={16} /> {saving ? 'Creating…' : 'Create Admin'}
          </button>
        </div>
      </form>

      {/* Admin list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-700">Hospital Admins</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-2">Name</th>
              <th className="text-left px-5 py-2">Mobile</th>
              <th className="text-left px-5 py-2">Email</th>
              <th className="text-left px-5 py-2">Plan</th>
              <th className="text-left px-5 py-2">Status</th>
              <th className="text-right px-5 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400">No admins yet</td></tr>
            )}
            {admins.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 align-top">
                <td className="px-5 py-3 font-medium text-slate-800">{a.name}</td>
                <td className="px-5 py-3">{a.phone || a.username}</td>
                <td className="px-5 py-3">{a.email || '—'}</td>
                <td className="px-5 py-3">
                  {a.subscription?.active ? (
                    <span className="badge bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                      <Crown size={12} /> {a.subscription.planName} · till {fmtDate(a.subscription.endsAt)}
                    </span>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-500">No active plan</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {a.active
                    ? <span className="badge bg-emerald-100 text-emerald-700">Active</span>
                    : <span className="badge bg-rose-100 text-rose-700">Disabled</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(a)} className="btn-ghost" title={a.active ? 'Disable' : 'Enable'}>
                        {a.active ? <X size={15} /> : <Check size={15} />}
                      </button>
                      <button onClick={() => { setPwId(pwId === a.id ? null : a.id); setPwValue(''); }} className="btn-ghost" title="Reset password">
                        <KeyRound size={15} />
                      </button>
                      <button onClick={() => remove(a)} className="btn-ghost text-rose-600" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {pwId === a.id && (
                      <div className="flex items-center gap-2">
                        <input className="input py-1" placeholder="New password" value={pwValue} onChange={(e) => setPwValue(e.target.value)} />
                        <button onClick={() => resetPassword(a)} className="btn-primary py-1">Save</button>
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
  );
}
