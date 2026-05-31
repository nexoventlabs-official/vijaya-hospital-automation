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
    <div className="min-h-screen flex">
      <aside className="w-60 bg-brand-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="font-bold text-lg flex items-center gap-2">
            Vijya Hospital
            {premium && <Crown size={16} className="text-amber-300" title="Premium — active plan" />}
          </div>
          <div className="text-xs text-brand-200">{isSuper ? 'Super Admin Panel' : 'Admin Panel'}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="text-xs text-brand-200 mb-1">Signed in as</div>
          <div className="text-sm font-medium flex items-center gap-1">
            {user?.name || user?.username || 'Admin'}
            {premium && <Crown size={13} className="text-amber-300" />}
          </div>
          <button onClick={logout} className="mt-3 w-full inline-flex items-center justify-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-slate-50 overflow-auto">
        {/* Top bar — purchase / plan status (admins only) */}
        {!isSuper && (
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3">
            {status?.active ? (
              <div className="flex items-center gap-3">
                <span className="badge bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                  <Crown size={13} /> Premium
                </span>
                <span className="text-sm text-slate-600">
                  {status.plan?.planName} · <strong>{status.daysLeft}</strong> day{status.daysLeft === 1 ? '' : 's'} left
                </span>
                <button onClick={() => nav('/purchase')} className="btn-secondary">
                  <CreditCard size={16} /> Renew
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm text-rose-600 font-medium">No active plan — WhatsApp automation is off</span>
                <button onClick={() => nav('/purchase')} className="btn-primary">
                  <ShoppingCart size={16} /> Purchase
                </button>
              </>
            )}
          </div>
        )}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
