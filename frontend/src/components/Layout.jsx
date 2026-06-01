import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Stethoscope, CalendarOff, Image as ImageIcon,
  Settings as SettingsIcon, LogOut, UserPlus, CreditCard, Receipt, Crown, ShoppingCart,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api';
import { ensureOpen, close as closeRealtime } from '../realtime';

// Pages every hospital admin can access (everything EXCEPT Flow Images).
const ADMIN_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/departments', label: 'Departments', icon: Users },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/holidays', label: 'Holidays', icon: CalendarOff },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

// Super admin: all admin pages + Flow Images + platform management pages.
const SUPER_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/departments', label: 'Departments', icon: Users },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/holidays', label: 'Holidays', icon: CalendarOff },
  { to: '/flow-images', label: 'Flow Images', icon: ImageIcon },
  { to: '/create-admin', label: 'Create Admin', icon: UserPlus },
  { to: '/plans', label: 'Plans', icon: CreditCard },
  { to: '/plan-history', label: 'Plan History', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Layout({ user, setAuth }) {
  const nav = useNavigate();
  const isSuper = user?.role === 'superadmin';
  const NAV = isSuper ? SUPER_NAV : ADMIN_NAV;
  const [status, setStatus] = useState(null);

  useEffect(() => { ensureOpen(); }, []);

  // Periodically re-validate the session against the backend. If the super
  // admin deletes or disables this account, the next check returns 401 and the
  // api interceptor clears the token + redirects to /login automatically —
  // even if the admin is idle and making no other requests.
  useEffect(() => {
    const id = setInterval(() => {
      api.get('/auth/verify').catch(() => { /* 401 handled by api interceptor */ });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  async function loadStatus() {
    if (isSuper) return; // super admin doesn't purchase plans
    try {
      const r = await api.get('/billing/status');
      setStatus(r.data || null);
    } catch { /* ignore */ }
  }
  useEffect(() => { loadStatus(); }, [isSuper]);

  function logout() {
    localStorage.removeItem('vh_token');
    closeRealtime();
    setAuth(null);
    nav('/login', { replace: true });
  }

  const premium = !isSuper && status?.active;

  return (
    <div className="h-screen flex font-mint overflow-hidden">
      <aside className="w-60 bg-midnight-pine text-white flex flex-col border-r border-arctic-mist/10">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="font-bold text-lg flex items-center gap-2 font-grenette tracking-wide">
            Vijya Hospital
            {premium && <Crown size={16} className="text-pale-mint fill-pale-mint" title="Premium — active plan" />}
          </div>
          <div className="text-xs text-soft-stone mt-1">{isSuper ? 'Super Admin Panel' : 'Admin Panel'}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-zenith-teal text-pale-mint font-medium shadow-none'
                    : 'text-arctic-mist/80 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="text-xs text-soft-stone mb-1.5">Signed in as</div>
          <div className="text-sm font-medium flex items-center gap-1.5 text-white">
            {user?.name || user?.username || 'Admin'}
            {premium && <Crown size={13} className="text-pale-mint fill-pale-mint" />}
          </div>
          <button
            onClick={logout}
            className="mt-3.5 w-full inline-flex items-center justify-center gap-2 text-xs bg-white/5 hover:bg-white/15 text-white px-3 py-2 rounded-buttons transition-all duration-200"
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-canvas-white overflow-auto flex flex-col text-midnight-pine">
        {/* Top bar — purchase / plan status (admins only) */}
        {!isSuper && (
          <div className="sticky top-0 z-10 bg-canvas-white border-b border-arctic-mist px-6 py-3 flex items-center justify-end gap-3">
            {status?.active ? (
              <div className="flex items-center gap-3">
                <span className="badge bg-pale-mint/40 text-zenith-teal border-pale-mint inline-flex items-center gap-1.5 px-3 py-1 font-semibold">
                  <Crown size={13} className="fill-zenith-teal" /> Premium
                </span>
                <span className="text-sm text-soft-stone">
                  {status.plan?.planName} · <strong>{status.daysLeft}</strong> day{status.daysLeft === 1 ? '' : 's'} left
                </span>
                <button onClick={() => nav('/purchase')} className="btn-secondary py-1.5 px-3.5 text-xs font-semibold">
                  <CreditCard size={14} /> Renew
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm text-rose-600 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                  No active plan — WhatsApp automation is off
                </span>
                <button onClick={() => nav('/purchase')} className="btn-primary py-1.5 px-3.5 text-xs font-semibold">
                  <ShoppingCart size={14} /> Purchase
                </button>
              </div>
            )}
          </div>
        )}
        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
