import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Eye, RefreshCw, Search } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'active', label: 'All Active' },
];

export default function Appointments() {
  const [search, setSearch] = useSearchParams();
  const status = search.get('status') || 'today';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await api.get(`/appointments?status=${status}`);
      setItems(r.data);
    } finally { setLoading(false); }
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
      [a.code, a.patientName, a.patientPhone, a.doctorName, a.departmentName].some((s) => (s || '').toLowerCase().includes(ql))
    );
  }, [items, q]);

  async function syncSheets() {
    await api.post('/appointments/sync-sheets');
    alert('Synced active appointments to Google Sheets.');
  }

  return (
    <div className="space-y-6 max-w-6xl font-mint">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Appointments</h1>
          <p className="text-sm text-soft-stone mt-1">Manage and view real-time patient reservations.</p>
        </div>
        <button onClick={syncSheets} className="btn-secondary py-2.5 px-4 text-xs font-semibold">
          <RefreshCw size={14} /> Sync to Sheets
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-pale-amber/10 p-4 rounded-xl border border-arctic-mist">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSearch({ status: t.key })}
              className={`btn py-2 px-4 text-xs font-semibold ${
                status === t.key
                  ? 'bg-zenith-teal text-white border border-transparent'
                  : 'bg-canvas-white text-midnight-pine hover:bg-pale-mint border border-arctic-mist'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-soft-stone/50">
            <Search size={15} />
          </span>
          <input
            className="input pl-9 py-2 text-xs"
            placeholder="Search code, patient or doctor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-pale-amber/20 text-midnight-pine border-b border-arctic-mist font-grenette text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-4">Code</th>
                <th className="text-left px-6 py-4">Date / Time</th>
                <th className="text-left px-6 py-4">Patient</th>
                <th className="text-left px-6 py-4">Doctor</th>
                <th className="text-left px-6 py-4">Fee</th>
                <th className="text-left px-6 py-4">Payment</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-right px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arctic-mist/70">
              {filtered.map((a) => (
                <tr key={a._id} className="hover:bg-pale-amber/5 transition-colors duration-150">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-zenith-teal">{a.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-midnight-pine">{a.date}</div>
                    <div className="text-xs text-soft-stone mt-0.5">{a.timeLabel || a.time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-midnight-pine">{a.patientName}</div>
                    <div className="text-xs text-soft-stone mt-0.5">+{a.patientPhone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-midnight-pine">{a.doctorName}</div>
                    <div className="text-xs text-soft-stone mt-0.5">{a.departmentName}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-midnight-pine">₹{a.fee}</td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-semibold text-midnight-pine">
                      {a.paymentMode === 'online' ? 'Online' : 'Hospital'}
                    </div>
                    <span className={`text-[11px] font-medium mt-0.5 block ${a.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {a.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge status-${a.status}`}>{a.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/appointments/${a._id}`} className="btn-ghost py-1 px-2.5 text-xs">
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !filtered.length && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-soft-stone text-sm">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
