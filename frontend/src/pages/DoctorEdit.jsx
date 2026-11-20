import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Save, ArrowLeft, Upload, Clock, User, Stethoscope } from 'lucide-react';
import api from '../api';
import PairedHeading from '../components/PairedHeading.jsx';

const WEEKDAYS = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

const blank = {
  name: '', nameTe: '', department: '', speciality: '', specialityTe: '',
  qualifications: '', experienceYears: 0, consultationFee: 0,
  weeklySlots: [], active: true, sortOrder: 0,
};

export default function DoctorEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState(blank);
  const [departments, setDepartments] = useState([]);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data || []));
    if (!isNew) {
      api.get(`/doctors/${id}`).then((r) => {
        const d = r.data;
        setForm({
          name: d.name, nameTe: d.nameTe || '',
          department: d.department?._id || d.department,
          speciality: d.speciality || '', specialityTe: d.specialityTe || '',
          qualifications: d.qualifications || '',
          experienceYears: d.experienceYears || 0,
          consultationFee: d.consultationFee || 0,
          weeklySlots: d.weeklySlots || [],
          active: !!d.active, sortOrder: d.sortOrder || 0,
        });
        setPhotoUrl(d.photoUrl || '');
      });
    }
  }, [id]);

  function addSlot() {
    setForm({
      ...form,
      weeklySlots: [
        ...form.weeklySlots,
        { weekday: 1, startTime: '10:00', endTime: '13:00', duration: 15 },
      ],
    });
  }

  function updateSlot(i, patch) {
    const next = form.weeklySlots.slice();
    next[i] = { ...next[i], ...patch };
    setForm({ ...form, weeklySlots: next });
  }

  function delSlot(i) {
    setForm({ ...form, weeklySlots: form.weeklySlots.filter((_, idx) => idx !== i) });
  }

  async function save() {
    setSaving(true);
    setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'weeklySlots') fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      if (file) fd.append('photo', file);
      if (isNew) await api.post('/doctors', fd);
      else await api.put(`/doctors/${id}`, fd);
      nav('/doctors');
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed. Please check required fields.');
    } finally {
      setSaving(false);
    }
  }

  function InputField({ label, value, onChange, type = 'text', required = false }) {
    return (
      <div>
        <label className="label">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <input
          type={type}
          className="input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between pb-4 border-b border-edge/40">
        <button
          onClick={() => nav('/doctors')}
          className="btn-secondary h-10 px-4 text-xs font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Back to Specialists</span>
        </button>

        <button
          onClick={save}
          disabled={saving}
          className="btn-primary h-11 px-7 text-sm font-medium shadow-glow-blue"
        >
          {saving ? (
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Save size={15} />
          )}
          <span>{saving ? 'Saving Specialist…' : 'Save Specialist'}</span>
        </button>
      </div>

      {/* Paired Chapter Heading */}
      <PairedHeading
        eyebrow={isNew ? 'New Specialist Registration.' : 'Update Specialist Dossier.'}
        headline={isNew ? 'Register Doctor.' : `Edit — ${form.name || 'Doctor'}`}
        description="Configure clinical qualifications, bilingual patient naming, consultation fees, and recurring weekly schedules."
      />

      {err && (
        <div className="p-4 rounded-[16px] text-sm font-medium flex items-center gap-2 border bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>{err}</span>
        </div>
      )}

      {/* Profile Details Shell */}
      <div className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-edge/40">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <h3 className="font-medium text-lg text-ink dark:text-white">Doctor Details</h3>
            <div className="text-xs text-muted">Bilingual patient information</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField
            label="Name (English)"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />
          <InputField
            label="Name (Telugu - తెలుగు)"
            value={form.nameTe}
            onChange={(v) => setForm({ ...form, nameTe: v })}
          />

          <div>
            <label className="label">Department / Medical Section *</label>
            <select
              className="input"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              required
            >
              <option value="">— Select Medical Department —</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.nameTe || 'General'})
                </option>
              ))}
            </select>
          </div>

          <InputField
            label="Speciality (English)"
            value={form.speciality}
            onChange={(v) => setForm({ ...form, speciality: v })}
          />

          <InputField
            label="Speciality (Telugu - తెలుగు)"
            value={form.specialityTe}
            onChange={(v) => setForm({ ...form, specialityTe: v })}
          />

          <InputField
            label="Qualifications (e.g. MBBS, MD)"
            value={form.qualifications}
            onChange={(v) => setForm({ ...form, qualifications: v })}
          />

          <InputField
            label="Experience (in years)"
            type="number"
            value={form.experienceYears}
            onChange={(v) => setForm({ ...form, experienceYears: Number(v) })}
          />

          <InputField
            label="Consultation Fee (₹)"
            type="number"
            value={form.consultationFee}
            onChange={(v) => setForm({ ...form, consultationFee: Number(v) })}
            required
          />

          <InputField
            label="Listing Sort Order"
            type="number"
            value={form.sortOrder}
            onChange={(v) => setForm({ ...form, sortOrder: Number(v) })}
          />

          <div>
            <label className="label">Active on WhatsApp Flow</label>
            <select
              className="input"
              value={form.active ? 'true' : 'false'}
              onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
            >
              <option value="true">Active & Available for Booking</option>
              <option value="false">Hidden / Temporary Leave</option>
            </select>
          </div>

          {/* Photo Upload with circular preview */}
          <div className="md:col-span-2 pt-2">
            <label className="label">Doctor Photograph</label>
            <div className="flex items-center gap-5">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover border-4 border-canvas shadow-portrait-lift"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-brand-tint dark:bg-dark-card border-4 border-canvas text-brand-blue flex items-center justify-center font-medium text-2xl shadow-portrait-lift">
                  {form.name ? form.name.charAt(0) : <Stethoscope size={24} />}
                </div>
              )}
              <div className="space-y-1.5">
                <input
                  type="file"
                  accept="image/*"
                  id="doc-photo-upload"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="doc-photo-upload"
                  className="btn-secondary h-10 px-5 text-xs font-semibold cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={14} />
                  <span>Choose Photo File</span>
                </label>
                <div className="text-xs text-muted">
                  {file ? file.name : 'Square JPG/PNG recommended.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Availability Slot Windows Shell */}
      <div className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-edge/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-violet/15 text-brand-violet flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-medium text-lg text-ink dark:text-white">Weekly Availability Windows</h3>
              <div className="text-xs text-muted">Generate slots for patient booking on WhatsApp</div>
            </div>
          </div>

          <button
            type="button"
            onClick={addSlot}
            className="btn-secondary h-10 px-5 text-xs font-medium self-start"
          >
            <Plus size={14} />
            <span>Add Slot Window</span>
          </button>
        </div>

        {!form.weeklySlots.length ? (
          <div className="p-8 text-center text-muted text-xs border border-dashed border-edge/60 rounded-[18px]">
            No weekly windows added. Click "Add Slot Window" above to open consultation timings.
          </div>
        ) : (
          <div className="space-y-3">
            {form.weeklySlots.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 rounded-[18px] bg-control dark:bg-dark-card border border-edge/40"
              >
                <div className="sm:col-span-4">
                  <label className="label text-[11px]">Weekday</label>
                  <select
                    className="input h-10 text-xs"
                    value={s.weekday}
                    onChange={(e) => updateSlot(i, { weekday: parseInt(e.target.value, 10) })}
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="label text-[11px]">Start Time</label>
                  <input
                    type="time"
                    className="input h-10 text-xs"
                    value={s.startTime}
                    onChange={(e) => updateSlot(i, { startTime: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="label text-[11px]">End Time</label>
                  <input
                    type="time"
                    className="input h-10 text-xs"
                    value={s.endTime}
                    onChange={(e) => updateSlot(i, { endTime: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => delSlot(i)}
                    className="p-2.5 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Remove slot"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
