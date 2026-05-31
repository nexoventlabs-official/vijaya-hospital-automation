import { useEffect, useState } from 'react';
import { Save, KeyRound } from 'lucide-react';
import api from '../api';

export default function Settings({ user }) {
  const [s, setS] = useState({});
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success' | 'error', text: '...' }

  // Change-password state
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { type: 'success' | 'error', text: '...' }

  async function load() {
    const r = await api.get('/settings');
    setS(r.data || {});
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMsg(null);
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
      setMsg({ type: 'success', text: 'Settings saved successfully' });
      setFile(null);
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Save failed' });
    } finally { setSaving(false); }
  }

  function f(k, label, opts = {}) {
    return (
      <div className={opts.full ? 'md:col-span-2' : ''}>
        <label className="label">{label}</label>
        {opts.textarea ? (
          <textarea className="input" rows={2} value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
        ) : (
          <input type={opts.type || 'text'} className="input" value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
        )}
      </div>
    );
  }

  async function changePassword() {
    setPwMsg(null);
    if (!pw.currentPassword || !pw.newPassword) {
      setPwMsg({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPwMsg({ type: 'success', text: 'Password updated successfully' });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setPwMsg(null), 2500);
    } catch (e) {
      setPwMsg({ type: 'error', text: e.response?.data?.error || 'Password change failed' });
    } finally { setPwSaving(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl font-mint">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Settings</h1>
        <p className="text-sm text-soft-stone mt-1">Configure clinical details, contact numbers, map settings, and login credentials.</p>
      </div>

      <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          {s.logoUrl && <img src={s.logoUrl} alt="" className="w-24 h-24 rounded-elements object-cover mb-3 border border-arctic-mist" />}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              id="hosp-logo-upload"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="hosp-logo-upload"
              className="btn-secondary py-2 px-3.5 text-xs font-semibold cursor-pointer"
            >
              Choose Logo
            </label>
            <span className="text-xs text-soft-stone">
              {file ? file.name : 'No file chosen'}
            </span>
          </div>
        </div>
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
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary py-2.5 px-5 text-xs font-semibold">
          <Save size={14} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Change password */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 text-midnight-pine font-semibold font-grenette text-lg border-b border-arctic-mist pb-3">
          <KeyRound size={18} className="text-zenith-teal" /> Change Password
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input text-sm" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input text-sm" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input text-sm" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
        </div>
        
        {pwMsg && (
          <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
            pwMsg.type === 'success'
              ? 'bg-pale-mint/30 border-pale-mint text-zenith-teal'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {pwMsg.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{pwMsg.text}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={changePassword} disabled={pwSaving} className="btn-primary py-2.5 px-5 text-xs font-semibold">
            <KeyRound size={14} /> {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
