import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Eye, RefreshCw } from 'lucide-react';
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">Appointments</h1>
        <button onClick={syncSheets} className="btn-secondary"><RefreshCw size={14} /> Sync to Sheets</button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearch({ status: t.key })}
            className={`btn ${status === t.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
        <input className="input ml-auto w-64" placeholder="Search code / patient / doctor…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Date / Time</th>
              <th className="text-left px-4 py-3">Patient</th>
              <th className="text-left px-4 py-3">Doctor</th>
              <th className="text-left px-4 py-3">Fee</th>
              <th className="text-left px-4 py-3">Payment</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <tr key={a._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-brand-700">{a.code}</td>
                <td className="px-4 py-3">{a.date} <span className="text-slate-500">{a.timeLabel || a.time}</span></td>
                <td className="px-4 py-3">
                  <div className="font-medium">{a.patientName}</div>
                  <div className="text-xs text-slate-500">+{a.patientPhone}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{a.doctorName}</div>
                  <div className="text-xs text-slate-500">{a.departmentName}</div>
                </td>
                <td className="px-4 py-3">₹{a.fee}</td>
                <td className="px-4 py-3">
                  <div>{a.paymentMode === 'online' ? 'Online' : 'At hospital'}</div>
                  <span className={`text-xs ${a.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{a.paymentStatus}</span>
                </td>
                <td className="px-4 py-3"><span className={`badge status-${a.status}`}>{a.status}</span></td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/appointments/${a._id}`} className="btn-ghost"><Eye size={16} /></Link>
                </td>
              </tr>
            ))}
            {!loading && !filtered.length && <tr><td colSpan="8" className="py-8 text-center text-slate-500">No appointments.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
