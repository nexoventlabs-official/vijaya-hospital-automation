import { useEffect, useState } from 'react';
import { Save, KeyRound, Building2, MapPin, Phone, Upload, Lock, ShieldCheck } from 'lucide-react';
import api from '../api';
import PairedHeading from '../components/PairedHeading.jsx';

export default function Settings({ user }) {
  const [s, setS] = useState({});
  const [file, setFile] = useState(null);
  const [stampConfirmed, setStampConfirmed] = useState(null);
  const [stampCompleted, setStampCompleted] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const isSuper = user?.role === 'superadmin';

  // Password state
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  async function load() {
    try {
      const r = await api.get('/settings');
      setS(r.data || {});
    } catch {}
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      [
        'hospitalName', 'hospitalNameTe', 'contactPhone', 'contactPhoneAlt',
        'websiteUrl', 'addressLine', 'addressLineTe', 'locationLabel',
        'googleMapsPlaceId', 'googleMapsUrl',
      ].forEach((k) => {
        if (s[k] !== undefined) fd.append(k, s[k] ?? '');
      });
      if (file) fd.append('logo', file);
      if (stampConfirmed) fd.append('stampConfirmed', stampConfirmed);
      if (stampCompleted) fd.append('stampCompleted', stampCompleted);
      const r = await api.put('/settings', fd);
      setS(r.data || {});
      setMsg({ type: 'success', text: 'Hospital settings saved and updated across WhatsApp bot flows.' });
      setFile(null);
      setStampConfirmed(null);
      setStampCompleted(null);
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Save failed. Please check inputs.' });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwMsg(null);
    if (!pw.currentPassword || !pw.newPassword) {
      setPwMsg({ type: 'error', text: 'Please fill in both current and new passwords.' });
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPwMsg({ type: 'success', text: 'Access password updated successfully.' });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setPwMsg(null), 3000);
    } catch (e) {
      setPwMsg({ type: 'error', text: e.response?.data?.error || 'Password change failed.' });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-edge/40">
        <PairedHeading
          eyebrow="Hospital Configuration."
          headline="Identity, Maps & Security."
          description="Update clinic contact details, WhatsApp auto-directions, printable header logos, and credentials."
        />
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary h-11 px-7 text-sm font-medium shadow-glow-blue"
        >
          {saving ? (
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Save size={16} />
          )}
          <span>{saving ? 'Saving Changes…' : 'Save Hospital Settings'}</span>
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
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Settings Card Shell */}
      <div className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-edge/40">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div>
            <h3 className="font-medium text-lg text-ink dark:text-white">Hospital Information</h3>
            <div className="text-xs text-muted">Bilingual naming, phone numbers & location</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label">Hospital Name (English)</label>
            <input
              className="input"
              value={s.hospitalName || ''}
              onChange={(e) => setS({ ...s, hospitalName: e.target.value })}
              placeholder="e.g. Vijya Hospital"
            />
          </div>

          <div>
            <label className="label">Hospital Name (Telugu - తెలుగు)</label>
            <input
              className="input"
              value={s.hospitalNameTe || ''}
              onChange={(e) => setS({ ...s, hospitalNameTe: e.target.value })}
              placeholder="e.g. విజయ హాస్పిటల్"
            />
          </div>

          <div>
            <label className="label">Primary Phone (Used by WhatsApp Call CTA)</label>
            <input
              className="input"
              value={s.contactPhone || ''}
              onChange={(e) => setS({ ...s, contactPhone: e.target.value })}
              placeholder="e.g. 919876543210"
            />
          </div>

          <div>
            <label className="label">Secondary / Reception Phone</label>
            <input
              className="input"
              value={s.contactPhoneAlt || ''}
              onChange={(e) => setS({ ...s, contactPhoneAlt: e.target.value })}
              placeholder="e.g. 0866-2456789"
            />
          </div>

          <div>
            <label className="label">Official Website URL</label>
            <input
              className="input"
              value={s.websiteUrl || ''}
              onChange={(e) => setS({ ...s, websiteUrl: e.target.value })}
              placeholder="https://vijyahospital.com"
            />
          </div>

          <div>
            <label className="label">Location Branch Label</label>
            <input
              className="input"
              value={s.locationLabel || ''}
              onChange={(e) => setS({ ...s, locationLabel: e.target.value })}
              placeholder="e.g. Main Branch, MG Road"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Address (English)</label>
            <textarea
              className="input h-20 py-2.5 resize-none"
              value={s.addressLine || ''}
              onChange={(e) => setS({ ...s, addressLine: e.target.value })}
              placeholder="Complete hospital street address"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Address (Telugu - తెలుగు)</label>
            <textarea
              className="input h-20 py-2.5 resize-none"
              value={s.addressLineTe || ''}
              onChange={(e) => setS({ ...s, addressLineTe: e.target.value })}
              placeholder="పూర్తి హాస్పిటల్ చిరునామా"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Google Maps Link (Auto-Directions for WhatsApp)</label>
            <input
              className="input"
              value={s.googleMapsUrl || ''}
              onChange={(e) => setS({ ...s, googleMapsUrl: e.target.value })}
              placeholder="https://maps.app.goo.gl/..."
            />
            <p className="text-[11px] text-muted mt-1.5">
              Open Google Maps → search your hospital → tap <strong>Share</strong> → copy link. Patients receive a "Get Directions" button after booking.
            </p>
          </div>

          {/* Hospital Logo Upload */}
          <div className="md:col-span-2 pt-2">
            <label className="label">Hospital Brand Logo (Printed on PDF passes)</label>
            <div className="flex items-center gap-5">
              {s.logoUrl && (
                <img
                  src={s.logoUrl}
                  alt="Hospital Logo"
                  className="w-16 h-16 rounded-[14px] object-contain bg-canvas dark:bg-dark-card border border-edge p-1 shadow-sm"
                />
              )}
              <div className="space-y-1.5">
                <input
                  type="file"
                  accept="image/*"
                  id="hosp-logo-file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="hosp-logo-file"
                  className="btn-secondary h-10 px-4 text-xs font-semibold cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={14} />
                  <span>{file ? file.name : 'Choose Logo Image'}</span>
                </label>
                <div className="text-xs text-muted">
                  PNG with transparent background recommended.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Management Card */}
      <div className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-edge/40">
          <div className="w-10 h-10 rounded-xl bg-brand-violet/15 text-brand-violet flex items-center justify-center">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="font-medium text-lg text-ink dark:text-white">Security & Password</h3>
            <div className="text-xs text-muted">Update administrative credentials</div>
          </div>
        </div>

        {pwMsg && (
          <div
            className={`p-3.5 rounded-[14px] text-xs font-medium flex items-center gap-2 border ${
              pwMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{pwMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              placeholder="••••••••••••"
            />
          </div>

          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              placeholder="••••••••••••"
            />
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={changePassword}
            disabled={pwSaving}
            className="btn-secondary h-11 px-6 text-xs font-medium"
          >
            <KeyRound size={14} />
            <span>{pwSaving ? 'Updating Password…' : 'Update Access Password'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
