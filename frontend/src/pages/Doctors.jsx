import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, CalendarOff } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';

export default function Doctors() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [absentFor, setAbsentFor] = useState(null);
  const [absentDate, setAbsentDate] = useState(new Date().toISOString().slice(0, 10));
  const [absentReason, setAbsentReason] = useState('Doctor unavailable');
  const [movedMsg, setMovedMsg] = useState('');

  async function load() {
    const [d, deps] = await Promise.all([api.get('/doctors'), api.get('/departments')]);
    setItems(d.data);
    setDepartments(deps.data);
  }
  useEffect(() => {
    load();
    const off1 = subscribe('doctors', () => load());
    const off2 = subscribe('appointments', () => {}); // ensure stream open
    return () => { off1(); off2(); };
  }, []);

  async function del(d) {
    if (!confirm(`Delete doctor "${d.name}"?`)) return;
    await api.delete(`/doctors/${d._id}`);
    load();
  }

  async function postpone() {
    setMovedMsg('');
    try {
      const r = await api.post(`/doctors/${absentFor._id}/absent`, { date: absentDate, reason: absentReason });
      setMovedMsg(`✅ Postponed ${r.data.moved} appointment(s).`);
      setTimeout(() => { setAbsentFor(null); setMovedMsg(''); load(); }, 1200);
    } catch (e) {
      setMovedMsg('❌ ' + (e.response?.data?.error || 'Failed'));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">Doctors</h1>
        <Link to="/doctors/new" className="btn-primary"><Plus size={16} /> Add Doctor</Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((d) => (
          <div key={d._id} className="card p-4">
            <div className="flex gap-3">
              {d.photoUrl
                ? <img src={d.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                : <div className="w-16 h-16 rounded-lg bg-slate-100" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{d.name}</div>
                <div className="text-xs text-slate-500 truncate">{d.speciality}</div>
                <div className="text-xs text-brand-700 mt-1">{d.department?.name || '—'}</div>
                <div className="text-xs text-slate-500">Fee: ₹{d.consultationFee} • {d.experienceYears || 0} yrs exp</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={`badge ${d.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{d.active ? 'Active' : 'Hidden'}</span>
              <div className="flex gap-1">
                <button onClick={() => setAbsentFor(d)} title="Mark absent" className="btn-ghost text-amber-700"><CalendarOff size={14} /></button>
                <Link to={`/doctors/${d._id}`} className="btn-ghost"><Pencil size={14} /></Link>
                <button onClick={() => del(d)} className="btn-ghost text-rose-600"><Trash2 size={14} /></button>
              </div>
            </div>
            {(d.absences || []).length > 0 && (
              <div className="mt-2 text-xs text-amber-700">
                Absences: {d.absences.map((a) => a.date).join(', ')}
              </div>
            )}
          </div>
        ))}
        {!items.length && (
          <div className="card p-6 text-sm text-slate-500 text-center col-span-full">No doctors yet. {departments.length === 0 && 'Add a department first.'}</div>
        )}
      </div>

      {absentFor && (
        <Modal title={`Mark Absent — ${absentFor.name}`} onClose={() => setAbsentFor(null)}>
          <p className="text-sm text-slate-600 mb-3">All booked appointments for that day will be postponed automatically to the doctor's next available slot, and patients notified on WhatsApp.</p>
          <div className="space-y-3">
            <div>
              <label className="label">Absent date</label>
              <input type="date" className="input" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Reason (sent to patients)</label>
              <input className="input" value={absentReason} onChange={(e) => setAbsentReason(e.target.value)} />
            </div>
          </div>
          {movedMsg && <div className="mt-3 text-sm">{movedMsg}</div>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setAbsentFor(null)} className="btn-secondary">Cancel</button>
            <button onClick={postpone} className="btn-primary">Postpone & Notify</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
