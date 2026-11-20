import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Users, Stethoscope, IndianRupee, UserPlus, Clock,
  ArrowRight, RefreshCw,
} from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonStats, SkeletonTable } from '../components/Skeleton.jsx';

const cards = [
  {
    key: 'todayAppts',
    label: "Today's Consultations",
    icon: Calendar,
    to: '/appointments?status=today',
    badge: 'Today',
    iconBg: 'bg-brand-yellow/15 text-amber-700 dark:text-amber-300',
    borderHover: 'hover:border-brand-yellow',
  },
  {
    key: 'upcoming',
    label: 'Upcoming Bookings',
    icon: Clock,
    to: '/appointments?status=upcoming',
    badge: 'Next 21 Days',
    iconBg: 'bg-brand-sky/15 text-brand-sky',
    borderHover: 'hover:border-brand-sky',
  },
  {
    key: 'doctors',
    label: 'Active Specialists',
    icon: Stethoscope,
    to: '/doctors',
    badge: 'On Duty',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    borderHover: 'hover:border-emerald-500',
  },
  {
    key: 'departments',
    label: 'Clinical Sections',
    icon: Users,
    to: '/departments',
    badge: 'Specialties',
    iconBg: 'bg-brand-violet/15 text-brand-violet',
    borderHover: 'hover:border-brand-violet',
  },
  {
    key: 'pendingPay',
    label: 'Pending Payments',
    icon: IndianRupee,
    to: '/appointments?status=active',
    badge: 'Pay at Hospital',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    borderHover: 'hover:border-rose-500',
  },
  {
    key: 'patients',
    label: 'Registered Patients',
    icon: UserPlus,
    to: '/appointments',
    badge: 'Verified WhatsApp',
    iconBg: 'bg-brand-blue/15 text-brand-blue',
    borderHover: 'hover:border-brand-blue',
  },
];

export default function Dashboard() {
  const [data, setData] = useState({ stats: {}, recent: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const r = await api.get('/dashboard/stats');
      setData(r.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    const off = subscribe('appointments', () => load(true));
    return off;
  }, []);

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-edge/40">
        <PairedHeading
          eyebrow="Live Operations."
          headline="Hospital Care Overview."
          description="Real-time pulse of bookings, attending doctors, and WhatsApp patient flows."
          badge={
            <span className="badge bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              Realtime Synced
            </span>
          }
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary text-sm h-11"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh Feed'}</span>
          </button>
          <Link to="/appointments" className="btn-primary text-sm h-11">
            <span>All Bookings</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* 6 Candy-Colored Metric Capability Cards */}
      {loading ? (
        <SkeletonStats count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map(({ key, label, icon: Icon, to, badge, iconBg, borderHover }) => (
            <Link
              key={key}
              to={to}
              className={`card-feature flex items-center justify-between group border border-edge/50 dark:border-edge/40 ${borderHover} transition-all duration-200 hover:-translate-y-1 shadow-sm`}
            >
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted dark:text-dark-muted tracking-tight">
                  {label}
                </span>
                <div className="text-4xl font-medium tracking-tight text-ink dark:text-white">
                  {data.stats?.[key] ?? 0}
                </div>
                <div className="pt-2">
                  <span className="badge text-[11px] bg-control dark:bg-dark-canvas text-muted dark:text-dark-muted border border-edge/40">
                    {badge}
                  </span>
                </div>
              </div>
              <div
                className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-110 ${iconBg}`}
              >
                <Icon size={24} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Bookings Chapter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-ink dark:text-white">
              Recent Consultations
            </h2>
            <p className="text-sm text-muted dark:text-dark-muted">
              Live patient arrivals and completed consults.
            </p>
          </div>
          <Link to="/appointments" className="text-sm font-medium text-brand-blue hover:underline flex items-center gap-1">
            <span>View Full Log</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : !data.recent?.length ? (
          <div className="card-feature text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-stage-gray/50 flex items-center justify-center text-muted">
              <Calendar size={24} />
            </div>
            <div className="text-base font-medium text-ink dark:text-white">No bookings yet today</div>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Once patients send a WhatsApp message or book via bot, appointments appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="card-feature p-0 overflow-hidden border border-edge/50 dark:border-edge/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f4f4f5]/60 dark:bg-dark-card/40 border-b border-edge/60 text-xs font-medium text-muted uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-6 py-4 whitespace-nowrap">Appointment ID</th>
                    <th className="text-left px-6 py-4">Patient Profile</th>
                    <th className="text-left px-6 py-4">Physician & Section</th>
                    <th className="text-left px-6 py-4">Date & Slot</th>
                    <th className="text-left px-6 py-4">Status</th>
                    <th className="text-right px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/40">
                  {data.recent.map((a) => (
                    <tr key={a._id} className="hover:bg-control/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-brand-blue bg-brand-tint dark:bg-brand-blue/20 py-1 px-3 rounded-full border border-brand-blue/30 whitespace-nowrap inline-block">
                          {a.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-ink dark:text-white text-sm">
                          {a.patientName}
                        </div>
                        <div className="text-xs text-muted">
                          +{a.patientPhone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-ink dark:text-white text-sm">
                          {a.doctorName}
                        </div>
                        <div className="text-xs text-muted">
                          {a.departmentName || 'General'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-ink dark:text-white font-medium text-xs">
                          {a.date}
                        </div>
                        <div className="text-[11px] text-muted">
                          {a.timeLabel || a.time}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge status-${a.status}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/appointments/${a._id}`}
                          className="btn-sm bg-control dark:bg-dark-card text-brand-blue hover:bg-stage-gray"
                        >
                          View File
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
