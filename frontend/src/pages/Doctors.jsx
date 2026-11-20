import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, CalendarOff, Stethoscope, Clock, IndianRupee, X, Check } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonDoctor } from '../components/Skeleton.jsx';

export default function Doctors() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [absentFor, setAbsentFor] = useState(null);
  const [absentDate, setAbsentDate] = useState(new Date().toISOString().slice(0, 10));
  const [absentReason, setAbsentReason] = useState('Doctor unavailable');
  const [movedMsg, setMovedMsg] = useState(null);
  const [postponing, setPostponing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [d, deps] = await Promise.all([api.get('/doctors'), api.get('/departments')]);
      setItems(d.data || []);
      setDepartments(deps.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const off1 = subscribe('doctors', () => load());
    const off2 = subscribe('appointments', () => {});
    return () => { off1(); off2(); };
  }, []);

  async function del(d) {
    if (!confirm(`Are you sure you want to remove Dr. "${d.name}"?`)) return;
    await api.delete(`/doctors/${d._id}`);
    load();
  }

  async function postpone() {
    setMovedMsg(null);
    setPostponing(true);
    try {
      const r = await api.post(`/doctors/${absentFor._id}/absent`, { date: absentDate, reason: absentReason });
      setMovedMsg({
        type: 'success',
        text: `Postponed ${r.data.moved} appointment(s). Patients notified on WhatsApp.`,
      });
      setTimeout(() => {
        setAbsentFor(null);
        setMovedMsg(null);
        load();
      }, 1500);
    } catch (e) {
      setMovedMsg({ type: 'error', text: e.response?.data?.error || 'Operation failed' });
    } finally {
      setPostponing(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-edge/40">
        <PairedHeading
          eyebrow="Clinical Faculty."
          headline="Specialists & Availability."
          description="Manage consultant profiles, daily consultation fees, and emergency absence postponements."
        />
        <Link to="/doctors/new" className="btn-primary h-11 text-sm font-medium">
          <Plus size={16} />
          <span>Register Doctor</span>
        </Link>
      </div>

      {/* Grid of Doctor Cards */}
      {loading ? (
        <SkeletonDoctor count={6} />
      ) : !items.length ? (
        <div className="card-feature text-center py-16 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-[24px] bg-brand-tint dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center">
            <Stethoscope size={28} />
          </div>
          <div>
            <h3 className="text-xl font-medium text-ink dark:text-white">No doctors registered yet</h3>
            <p className="text-xs text-muted max-w-md mx-auto mt-1">
              Add your hospital's doctors to enable WhatsApp patients to select departments and book appointments.
            </p>
          </div>
          <Link to="/doctors/new" className="btn-primary h-10 px-6 text-xs inline-flex">
            Add First Specialist
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((d) => (
            <div
              key={d._id}
              className="card-feature p-6 flex flex-col justify-between border border-edge/50 dark:border-edge/40 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div>
                <div className="flex items-start gap-4">
                  {d.photoUrl ? (
                    <img
                      src={d.photoUrl}
                      alt={d.name}
                      className="w-16 h-16 rounded-full object-cover border-4 border-canvas shadow-portrait-lift flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-brand-tint dark:bg-dark-card border-4 border-canvas text-brand-blue flex items-center justify-center font-medium text-xl shadow-portrait-lift flex-shrink-0">
                      {d.name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base text-ink dark:text-white truncate">
                      {d.name}
                    </h3>
                    <div className="text-xs text-muted truncate mt-0.5">
                      {d.speciality || 'General Medicine'}
                    </div>
                    <div className="mt-2">
                      <span className="badge bg-brand-tint text-brand-blue border border-brand-blue/30 text-[11px] font-medium">
                        {d.department?.name || 'Department'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-edge/40 space-y-2 text-xs text-muted">
                  <div className="flex justify-between items-center">
                    <span>Consultation Fee:</span>
                    <strong className="text-ink dark:text-white font-medium text-sm">₹{d.consultationFee}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Experience:</span>
                    <strong className="text-ink dark:text-white font-medium">{d.experienceYears || 0} Years</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Weekly Slot Windows:</span>
                    <strong className="text-ink dark:text-white font-medium">{(d.weeklySlots || []).length} Slots</strong>
                  </div>
                </div>

                {(d.absences || []).length > 0 && (
                  <div className="mt-4 p-3 rounded-[14px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <CalendarOff size={13} />
                      <span>Upcoming Absence:</span>
                    </div>
                    <div className="font-mono text-[11px]">{d.absences.map((a) => a.date).join(', ')}</div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-edge/40 flex items-center justify-between">
                <span
                  className={`badge ${
                    d.active
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-control text-muted'
                  }`}
                >
                  {d.active ? 'Available' : 'Hidden'}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAbsentFor(d)}
                    title="Mark Absent & Postpone"
                    className="p-2 rounded-full text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                  >
                    <CalendarOff size={16} />
                  </button>
                  <Link
                    to={`/doctors/${d._id}`}
                    title="Edit profile & schedule"
                    className="p-2 rounded-full text-brand-blue hover:bg-brand-tint dark:hover:bg-brand-blue/20 transition-colors"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => del(d)}
                    title="Remove doctor"
                    className="p-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mark Absent Modal Dialog */}
      {absentFor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-feature w-full max-w-lg bg-canvas dark:bg-dark-card border border-edge shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-edge/40 pb-4">
              <div>
                <h3 className="text-xl font-medium text-ink dark:text-white">
                  Mark Doctor Absent
                </h3>
                <div className="text-xs text-muted mt-0.5">
                  Dr. {absentFor.name} · Automated WhatsApp Postponement
                </div>
              </div>
              <button
                onClick={() => setAbsentFor(null)}
                className="p-1.5 rounded-full text-muted hover:bg-control"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-[16px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              Every booked appointment on this date will automatically be shifted to the doctor's next open slot window, and an update message will be dispatched to each patient on WhatsApp.
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Absence Date</label>
                <input
                  type="date"
                  className="input"
                  value={absentDate}
                  onChange={(e) => setAbsentDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Reason (Sent to Patients)</label>
                <input
                  className="input"
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                  placeholder="e.g. Doctor attending emergency surgery"
                />
              </div>
            </div>

            {movedMsg && (
              <div
                className={`p-3.5 rounded-[14px] text-xs font-medium flex items-center gap-2 border ${
                  movedMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{movedMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setAbsentFor(null)}
                className="btn-secondary h-11 px-5 text-xs"
              >
                Dismiss
              </button>
              <button
                onClick={postpone}
                disabled={postponing}
                className="btn-primary h-11 px-6 text-xs"
              >
                {postponing ? 'Postponing & Notifying…' : 'Confirm Postpone & Send Notifications'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
