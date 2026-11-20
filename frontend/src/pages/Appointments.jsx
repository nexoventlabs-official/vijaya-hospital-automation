import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Eye, RefreshCw, Search, Calendar, FileSpreadsheet, Filter } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

const TABS = [
  { key: 'today', label: 'Today', desc: "Active today" },
  { key: 'upcoming', label: 'Upcoming', desc: "Next 21 days" },
  { key: 'arrived', label: 'Arrived', desc: "In waiting room" },
  { key: 'active', label: 'All Active', desc: "Booked & arrived" },
];

export default function Appointments() {
  const [search, setSearch] = useSearchParams();
  const status = search.get('status') || 'today';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get(`/appointments?status=${status}`);
      setItems(r.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const off = subscribe('appointments', () => load());
    return off;
  }, [status]);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const ql = q.trim().toLowerCase();
    return items.filter((a) =>
      [a.code, a.patientName, a.patientPhone, a.doctorName, a.departmentName].some((s) =>
        (s || '').toLowerCase().includes(ql)
      )
    );
  }, [items, q]);

  async function syncSheets() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      await api.post('/appointments/sync-sheets');
      setSyncMsg({ type: 'success', text: 'All active consultations successfully synced to Google Sheets!' });
      setTimeout(() => setSyncMsg(null), 3000);
    } catch (e) {
      setSyncMsg({ type: 'error', text: e.response?.data?.error || 'Failed to sync with Google Sheets' });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-edge/40">
        <PairedHeading
          eyebrow="Consultations."
          headline="Real-Time Schedule Flow."
          description="Filter active reservations, track patient arrival statuses, and sync records."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={syncSheets}
            disabled={syncing}
            className="btn-secondary h-11 text-sm font-medium"
          >
            {syncing ? (
              <RefreshCw size={15} className="animate-spin text-brand-blue" />
            ) : (
              <FileSpreadsheet size={15} className="text-emerald-500" />
            )}
            <span>{syncing ? 'Syncing Sheets…' : 'Sync to Google Sheets'}</span>
          </button>
        </div>
      </div>

      {syncMsg && (
        <div
          className={`p-4 rounded-[16px] text-sm font-medium flex items-center gap-2 border ${
            syncMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{syncMsg.text}</span>
        </div>
      )}

      {/* Control Strip: Segmented Status Selector & Search Input */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 bg-control dark:bg-dark-card rounded-[22px] border border-edge/50">
        {/* Segmented Interval/Status Selector */}
        <div className="flex flex-wrap p-1 gap-1.5 bg-stage-gray/60 dark:bg-dark-canvas rounded-full">
          {TABS.map((t) => {
            const active = status === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSearch({ status: t.key })}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  active
                    ? 'bg-canvas dark:bg-dark-card text-brand-blue font-semibold shadow-segment'
                    : 'text-muted hover:text-ink dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 44px Pill Search Box */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted pointer-events-none">
            <Search size={16} />
          </span>
          <input
            className="input pl-11 h-11 text-xs rounded-full bg-canvas dark:bg-dark-canvas"
            placeholder="Search code, patient, phone or doctor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Appointment Records Table / Skeletons */}
      {loading ? (
        <SkeletonTable rows={6} cols={8} />
      ) : (
        <div className="card-feature p-0 overflow-hidden border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f4f4f5]/60 dark:bg-dark-card/40 border-b border-edge/60 text-xs font-medium text-muted uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-4">Reference</th>
                  <th className="text-left px-6 py-4">Date & Time</th>
                  <th className="text-left px-6 py-4">Patient Profile</th>
                  <th className="text-left px-6 py-4">Doctor & Section</th>
                  <th className="text-left px-6 py-4">Fee</th>
                  <th className="text-left px-6 py-4">Payment</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-right px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/40">
                {filtered.map((a) => (
                  <tr key={a._id} className="hover:bg-control/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-brand-blue bg-brand-tint dark:bg-brand-blue/20 py-1 px-2.5 rounded-full border border-brand-blue/30">
                        {a.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink dark:text-white text-xs">{a.date}</div>
                      <div className="text-[11px] text-muted mt-0.5">{a.timeLabel || a.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink dark:text-white text-sm">{a.patientName}</div>
                      <div className="text-xs text-muted">+{a.patientPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink dark:text-white text-sm">{a.doctorName}</div>
                      <div className="text-xs text-muted">{a.departmentName || 'General'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-ink dark:text-white text-sm">
                      ₹{a.fee}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-ink dark:text-white">
                        {a.paymentMode === 'online' ? 'Online Gateway' : 'Pay at Hospital'}
                      </div>
                      <span
                        className={`text-[11px] font-semibold block mt-0.5 ${
                          a.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {a.paymentStatus === 'paid' ? 'Paid in Full' : 'Pending Counter'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge status-${a.status}`}>{a.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/appointments/${a._id}`}
                        className="btn-sm bg-control dark:bg-dark-card text-brand-blue hover:bg-stage-gray inline-flex items-center gap-1.5"
                      >
                        <Eye size={13} />
                        <span>Details</span>
                      </Link>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-muted text-sm space-y-2">
                      <div className="w-12 h-12 rounded-full bg-stage-gray/50 flex items-center justify-center mx-auto text-muted mb-2">
                        <Calendar size={20} />
                      </div>
                      <div className="font-medium text-ink dark:text-white">No appointments found</div>
                      <div className="text-xs">
                        Try changing the status filter or clearing your search term.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
