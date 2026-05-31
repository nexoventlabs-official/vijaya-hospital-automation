import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Stethoscope, IndianRupee, UserPlus, Clock } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';

const cards = [
  { key: 'todayAppts', label: "Today's Appointments", icon: Calendar, to: '/appointments?status=today', color: 'bg-amber-100 text-amber-700' },
  { key: 'upcoming', label: 'Upcoming', icon: Clock, to: '/appointments?status=upcoming', color: 'bg-sky-100 text-sky-700' },
  { key: 'doctors', label: 'Doctors', icon: Stethoscope, to: '/doctors', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'departments', label: 'Departments', icon: Users, to: '/departments', color: 'bg-purple-100 text-purple-700' },
  { key: 'pendingPay', label: 'Pending Payments', icon: IndianRupee, to: '/appointments?status=active', color: 'bg-rose-100 text-rose-700' },
  { key: 'patients', label: 'Patients', icon: UserPlus, to: '#', color: 'bg-brand-100 text-brand-700' },
];

export default function Dashboard() {
  const [data, setData] = useState({ stats: {}, recent: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await api.get('/dashboard/stats');
      setData(r.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    const off = subscribe('appointments', () => load());
    return off;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Live overview of bookings, doctors and operations.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ key, label, icon: Icon, to, color }) => (
          <Link key={key} to={to} className="card p-5 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">{label}</div>
                <div className="text-3xl font-bold text-brand-900 mt-1">
                  {loading ? '…' : (data.stats?.[key] ?? 0)}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={22} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 font-semibold text-brand-800">
          Recent Bookings
        </div>
        {!data.recent?.length ? (
          <div className="p-6 text-sm text-slate-500 text-center">No bookings yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent.map((a) => (
              <li key={a._id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.code} — {a.patientName}</div>
                  <div className="text-xs text-slate-500">
                    {a.doctorName} • {a.date} {a.timeLabel || a.time}
                  </div>
                </div>
                <span className={`badge status-${a.status}`}>{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
