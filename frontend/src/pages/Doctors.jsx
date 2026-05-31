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
  const [movedMsg, setMovedMsg] = useState(null); // { type: 'success' | 'error', text: '...' }

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
    setMovedMsg(null);
    try {
      const r = await api.post(`/doctors/${absentFor._id}/absent`, { date: absentDate, reason: absentReason });
      setMovedMsg({ type: 'success', text: `Postponed ${r.data.moved} appointment(s) successfully.` });
      setTimeout(() => { setAbsentFor(null); setMovedMsg(null); load(); }, 1200);
    } catch (e) {
      setMovedMsg({ type: 'error', text: e.response?.data?.error || 'Operation failed' });
    }
  }

  return (
    <div className="space-y-6 max-w-6xl font-mint">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Doctors</h1>
          <p className="text-sm text-soft-stone mt-1">Manage physicians, schedules, fees, and daily absences.</p>
        </div>
        <Link to="/doctors/new" className="btn-primary py-2.5 px-4 text-xs font-semibold">
          <Plus size={14} /> Add Doctor
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((d) => (
          <div key={d._id} className="card p-5 flex flex-col justify-between hover:border-zenith-teal/50 hover:bg-pale-amber/10 transition-all duration-300">
            <div>
              <div className="flex gap-4">
                {d.photoUrl ? (
                  <img src={d.photoUrl} alt="" className="w-16 h-16 rounded-elements object-cover border border-arctic-mist shadow-none" />
                ) : (
                  <div className="w-16 h-16 rounded-elements bg-pale-amber/50 flex items-center justify-center text-soft-stone border border-arctic-mist font-semibold text-lg font-grenette">
                    {d.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base text-midnight-pine truncate font-grenette">{d.name}</div>
                  <div className="text-xs text-soft-stone truncate mt-0.5">{d.speciality}</div>
                  <div className="text-xs font-semibold text-zenith-teal mt-2 bg-pale-mint/40 py-0.5 px-2 rounded-md inline-block">
                    {d.department?.name || '—'}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-arctic-mist/75 text-xs text-soft-stone space-y-1">
                <div>Consultation Fee: <strong className="text-midnight-pine">₹{d.consultationFee}</strong></div>
                <div>Experience: <strong className="text-midnight-pine">{d.experienceYears || 0} years</strong></div>
              </div>

              {(d.absences || []).length > 0 && (
                <div className="mt-3 p-2 bg-pale-amber/70 border border-amber-200/50 rounded-lg text-xs text-amber-800">
                  <div className="font-semibold">Upcoming Absences:</div>
                  <div className="mt-0.5 font-mono">{d.absences.map((abs) => abs.date).join(', ')}</div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-arctic-mist/75 flex items-center justify-between gap-2">
              <span className={`badge ${d.active ? 'bg-pale-mint/40 text-zenith-teal border-pale-mint' : 'bg-slate-50 text-soft-stone border-arctic-mist'}`}>
                {d.active ? 'Active' : 'Hidden'}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setAbsentFor(d)} title="Mark absent" className="btn-ghost py-1.5 px-2.5 text-xs text-amber-700 hover:bg-amber-50">
                  <CalendarOff size={14} />
                </button>
                <Link to={`/doctors/${d._id}`} className="btn-ghost py-1.5 px-2.5 text-xs">
                  <Pencil size={14} />
                </Link>
                <button onClick={() => del(d)} className="btn-ghost py-1.5 px-2.5 text-xs text-rose-600 hover:text-rose-700">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="card p-8 text-sm text-soft-stone text-center col-span-full py-12">
            No doctors registered. {departments.length === 0 && 'Please register a department first.'}
          </div>
        )}
      </div>

      {absentFor && (
        <Modal title={`Mark Absent — ${absentFor.name}`} onClose={() => setAbsentFor(null)}>
          <p className="text-xs text-soft-stone mb-4 leading-relaxed bg-pale-amber/40 p-3 rounded-lg border border-amber-200/30">
            All booked appointments for that day will be postponed automatically to the doctor's next available slot, and patients will be notified automatically on WhatsApp.
          </p>
          <div className="space-y-4">
            <div>
              <label className="label">Absent date</label>
              <input type="date" className="input" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Reason (sent to patients)</label>
              <input className="input" value={absentReason} onChange={(e) => setAbsentReason(e.target.value)} />
            </div>
          </div>
          
          {movedMsg && (
            <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 mt-3 ${
              movedMsg.type === 'success'
                ? 'bg-pale-mint/30 border-pale-mint text-zenith-teal'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {movedMsg.type === 'success' ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <span>{movedMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 mt-6 border-t border-arctic-mist pt-4">
            <button onClick={() => setAbsentFor(null)} className="btn-secondary py-2 px-4 text-xs font-semibold">Cancel</button>
            <button onClick={postpone} className="btn-primary py-2 px-4 text-xs font-semibold">Postpone & Notify</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-midnight-pine/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 shadow-xl relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-arctic-mist pb-3.5 mb-5">
          <h2 className="font-semibold text-lg text-midnight-pine font-grenette">{title}</h2>
          <button onClick={onClose} className="text-soft-stone hover:text-midnight-pine w-8 h-8 rounded-full flex items-center justify-center hover:bg-pale-mint/30 transition-colors duration-150">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
