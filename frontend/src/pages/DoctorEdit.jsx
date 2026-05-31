import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Save, ArrowLeft } from 'lucide-react';
import api from '../api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    api.get('/departments').then((r) => setDepartments(r.data));
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
    setForm({ ...form, weeklySlots: [...form.weeklySlots, { weekday: 1, startTime: '10:00', endTime: '12:00', duration: 15 }] });
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
    setSaving(true); setErr('');
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
      setErr(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => nav('/doctors')} className="btn-ghost text-sm"><ArrowLeft size={14} /> Back</button>
      <h1 className="text-2xl font-bold text-brand-900">{isNew ? 'Add Doctor' : 'Edit Doctor'}</h1>

      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Name (English) *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input label="Name (Telugu)" value={form.nameTe} onChange={(v) => setForm({ ...form, nameTe: v })} />
        <div>
          <label className="label">Department *</label>
          <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            <option value="">— Select —</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        <Input label="Speciality" value={form.speciality} onChange={(v) => setForm({ ...form, speciality: v })} />
        <Input label="Speciality (Telugu)" value={form.specialityTe} onChange={(v) => setForm({ ...form, specialityTe: v })} />
        <Input label="Qualifications" value={form.qualifications} onChange={(v) => setForm({ ...form, qualifications: v })} />
        <Input label="Experience (years)" type="number" value={form.experienceYears} onChange={(v) => setForm({ ...form, experienceYears: v })} />
        <Input label="Consultation Fee (₹) *" type="number" value={form.consultationFee} onChange={(v) => setForm({ ...form, consultationFee: v })} />
        <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(v) => setForm({ ...form, sortOrder: v })} />
        <div>
          <label className="label">Active</label>
          <select className="input" value={form.active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}>
            <option value="true">Yes</option>
            <option value="false">No (hidden)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Photo</label>
          {photoUrl && <img src={photoUrl} alt="" className="w-24 h-24 rounded-lg object-cover mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand-900">Weekly Availability</h2>
          <button onClick={addSlot} className="btn-secondary"><Plus size={14} /> Add slot window</button>
        </div>
        <div className="space-y-2">
          {form.weeklySlots.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <label className="label">Day</label>
                <select className="input" value={s.weekday} onChange={(e) => updateSlot(i, { weekday: parseInt(e.target.value, 10) })}>
                  {WEEKDAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <label className="label">Start</label>
                <input type="time" className="input" value={s.startTime} onChange={(e) => updateSlot(i, { startTime: e.target.value })} />
              </div>
              <div className="col-span-3">
                <label className="label">End</label>
                <input type="time" className="input" value={s.endTime} onChange={(e) => updateSlot(i, { endTime: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Min/slot</label>
                <input type="number" min="5" className="input" value={s.duration} onChange={(e) => updateSlot(i, { duration: parseInt(e.target.value, 10) })} />
              </div>
              <div className="col-span-1">
                <button onClick={() => delSlot(i)} className="btn-ghost text-rose-600 mt-5"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {!form.weeklySlots.length && <div className="text-sm text-slate-500">No slots configured. Add at least one.</div>}
        </div>
      </div>

      {err && <div className="text-sm text-rose-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={() => nav('/doctors')} className="btn-secondary">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving…' : 'Save Doctor'}</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
