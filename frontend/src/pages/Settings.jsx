import { useEffect, useState } from 'react';
import { Save, KeyRound } from 'lucide-react';
import api from '../api';

export default function Settings({ user }) {
  const [s, setS] = useState({});
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Change-password state
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  async function load() {
    const r = await api.get('/settings');
    setS(r.data || {});
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMsg('');
    try {
      const fd = new FormData();
      [
        'hospitalName', 'hospitalNameTe', 'contactPhone', 'contactPhoneAlt',
        'websiteUrl', 'addressLine', 'addressLineTe', 'locationLabel',
        'googleMapsPlaceId', 'locationLat', 'locationLng',
      ].forEach((k) => {
        if (s[k] !== undefined) fd.append(k, s[k] ?? '');
      });
      if (file) fd.append('logo', file);
      const r = await api.put('/settings', fd);
      setS(r.data || {});
      setMsg('✅ Saved');
      setFile(null);
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Save failed'));
    } finally { setSaving(false); }
  }

  function f(k, label, opts = {}) {
    return (
      <div className={opts.full ? 'md:col-span-2' : ''}>
        <label className="label">{label}</label>
        {opts.textarea
          ? <textarea className="input" rows={2} value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
          : <input type={opts.type || 'text'} className="input" value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />}
      </div>
    );
  }

  async function changePassword() {
    setPwMsg('');
    if (!pw.currentPassword || !pw.newPassword) { setPwMsg('❌ Fill in all password fields'); return; }
    if (pw.newPassword !== pw.confirm) { setPwMsg('❌ New passwords do not match'); return; }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPwMsg('✅ Password updated');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setPwMsg(''), 2500);
    } catch (e) {
      setPwMsg('❌ ' + (e.response?.data?.error || 'Password change failed'));
    } finally { setPwSaving(false); }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-900">Settings</h1>

      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {f('hospitalName', 'Hospital Name (English)')}
        {f('hospitalNameTe', 'Hospital Name (Telugu)')}
        {f('contactPhone', 'Contact Phone (primary, used by Call CTA)')}
        {f('contactPhoneAlt', 'Contact Phone (alt)')}
        {f('websiteUrl', 'Website URL')}
        {f('addressLine', 'Address (English)', { textarea: true, full: true })}
        {f('addressLineTe', 'Address (Telugu)', { textarea: true, full: true })}
        {f('locationLabel', 'Location label (e.g. Main Branch)')}
        {f('googleMapsPlaceId', 'Google Maps Place ID (optional)')}
        {f('locationLat', 'Location latitude', { type: 'number' })}
        {f('locationLng', 'Location longitude', { type: 'number' })}

        <div className="md:col-span-2">
          <label className="label">Hospital Logo</label>
          {s.logoUrl && <img src={s.logoUrl} alt="" className="w-24 h-24 rounded-lg object-cover mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      {msg && <div className="text-sm">{msg}</div>}
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}</button>
      </div>

      {/* Change password */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 text-brand-900 font-semibold">
          <KeyRound size={18} /> Change Password
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          {pwMsg ? <div className="text-sm">{pwMsg}</div> : <span />}
          <button onClick={changePassword} disabled={pwSaving} className="btn-primary">
            <KeyRound size={16} /> {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
