import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Stethoscope, IndianRupee, UserPlus, Clock } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';

const cards = [
  { key: 'todayAppts', label: "Today's Appointments", icon: Calendar, to: '/appointments?status=today', color: 'bg-pale-amber text-amber-800 border-amber-200/50' },
  { key: 'upcoming', label: 'Upcoming', icon: Clock, to: '/appointments?status=upcoming', color: 'bg-sky-50 text-sky-800 border-sky-200/50' },
  { key: 'doctors', label: 'Doctors', icon: Stethoscope, to: '/doctors', color: 'bg-pale-mint/40 text-zenith-teal border-pale-mint/70' },
  { key: 'departments', label: 'Departments', icon: Users, to: '/departments', color: 'bg-purple-50 text-purple-800 border-purple-200/50' },
  { key: 'pendingPay', label: 'Pending Payments', icon: IndianRupee, to: '/appointments?status=active', color: 'bg-rose-50 text-rose-800 border-rose-200/50' },
  { key: 'patients', label: 'Patients', icon: UserPlus, to: '#', color: 'bg-slate-50 text-midnight-pine border-slate-200/60' },
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
    <div className="space-y-8 max-w-6xl font-mint">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Dashboard</h1>
        <p className="text-sm text-soft-stone mt-1">Live overview of bookings, doctors, and operations.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(({ key, label, icon: Icon, to, color }) => (
          <Link key={key} to={to} className="card p-6 hover:border-zenith-teal/50 hover:bg-pale-amber/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-soft-stone">{label}</div>
                <div className="text-3xl font-semibold text-midnight-pine mt-2 font-grenette">
                  {loading ? '…' : (data.stats?.[key] ?? 0)}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${color}`}>
                <Icon size={20} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-arctic-mist font-semibold text-midnight-pine bg-pale-amber/10 font-grenette text-lg">
          Recent Bookings
        </div>
        {!data.recent?.length ? (
          <div className="p-8 text-sm text-soft-stone text-center">No bookings yet.</div>
        ) : (
          <ul className="divide-y divide-arctic-mist">
            {data.recent.map((a) => (
              <li key={a._id} className="px-6 py-4 flex items-center gap-4 hover:bg-pale-amber/5 transition-colors duration-150">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-midnight-pine truncate font-grenette tracking-wide">
                    {a.code} — {a.patientName}
                  </div>
                  <div className="text-xs text-soft-stone mt-1">
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
