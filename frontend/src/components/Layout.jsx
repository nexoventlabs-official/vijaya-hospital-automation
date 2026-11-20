import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Stethoscope, CalendarOff, Image as ImageIcon,
  Settings as SettingsIcon, LogOut, UserPlus, CreditCard, Receipt, Crown, ShoppingCart,
  Menu, X, Sun, Moon, ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api';
import { ensureOpen, close as closeRealtime } from '../realtime';
import { useTheme } from './ThemeContext.jsx';

const ADMIN_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'text-brand-sky bg-brand-sky/10', end: true },
  { to: '/appointments', label: 'Appointments', icon: Calendar, color: 'text-brand-blue bg-brand-blue/10' },
  { to: '/departments', label: 'Departments', icon: Users, color: 'text-brand-violet bg-brand-violet/10' },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope, color: 'text-emerald-500 bg-emerald-500/10' },
  { to: '/holidays', label: 'Holidays', icon: CalendarOff, color: 'text-brand-gold bg-brand-gold/10' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, color: 'text-muted bg-stage-gray/50' },
];

const SUPER_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'text-brand-sky bg-brand-sky/10', end: true },
  { to: '/appointments', label: 'Appointments', icon: Calendar, color: 'text-brand-blue bg-brand-blue/10' },
  { to: '/departments', label: 'Departments', icon: Users, color: 'text-brand-violet bg-brand-violet/10' },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope, color: 'text-emerald-500 bg-emerald-500/10' },
  { to: '/holidays', label: 'Holidays', icon: CalendarOff, color: 'text-brand-gold bg-brand-gold/10' },
  { to: '/flow-images', label: 'Flow Images', icon: ImageIcon, color: 'text-pink-500 bg-pink-500/10' },
  { to: '/create-admin', label: 'Create Admin', icon: UserPlus, color: 'text-brand-blue bg-brand-blue/10' },
  { to: '/plans', label: 'Plans', icon: CreditCard, color: 'text-brand-violet bg-brand-violet/10' },
  { to: '/plan-history', label: 'Plan History', icon: Receipt, color: 'text-brand-gold bg-brand-gold/10' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, color: 'text-muted bg-stage-gray/50' },
];

export default function Layout({ user, setAuth }) {
  const nav = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isSuper = user?.role === 'superadmin';
  const NAV = isSuper ? SUPER_NAV : ADMIN_NAV;
  const [status, setStatus] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { ensureOpen(); }, []);

  useEffect(() => {
    const id = setInterval(() => {
      api.get('/auth/verify').catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  async function loadStatus() {
    if (isSuper) return;
    try {
      const r = await api.get('/billing/status');
      setStatus(r.data || null);
    } catch {}
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
    <div className="h-screen w-screen flex font-effra bg-canvas text-ink overflow-hidden">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: Fixed, full-height, independently scrolling navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-full bg-canvas dark:bg-dark-canvas border-r border-edge/60 flex flex-col flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:static lg:h-full lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Lockup */}
        <div className="p-6 border-b border-edge/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-brand-blue text-white flex items-center justify-center font-bold text-xl shadow-glow-blue flex-shrink-0">
              +
            </div>
            <div>
              <div className="font-medium text-lg leading-tight tracking-tight flex items-center gap-1.5 text-ink dark:text-white">
                Vijya Care
                {premium && <Crown size={15} className="text-brand-gold fill-brand-gold" title="Active Plan" />}
              </div>
              <div className="text-xs text-muted dark:text-dark-muted font-normal mt-0.5">
                {isSuper ? 'Platform Superadmin' : 'Hospital Operations'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-full text-muted hover:bg-control"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted dark:text-dark-muted px-3 py-2">
            Navigation Menu
          </div>
          {NAV.map(({ to, label, icon: Icon, color, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm font-semibold'
                    : 'text-ink dark:text-white hover:bg-control dark:hover:bg-dark-card'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        isActive ? 'bg-white/20 text-white' : color
                      }`}
                    >
                      <Icon size={15} />
                    </span>
                    <span>{label}</span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`transition-transform opacity-0 group-hover:opacity-100 ${
                      isActive ? 'opacity-100 text-white' : 'text-muted'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme and User Footer Box */}
        <div className="p-4 border-t border-edge/50 bg-[#f7f7f7]/60 dark:bg-dark-card/30 space-y-3 flex-shrink-0">
          {/* Theme Selector Pill */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-full bg-canvas dark:bg-dark-card border border-edge/60 text-xs text-ink dark:text-white hover:bg-control transition-colors"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? <Moon size={14} className="text-brand-violet" /> : <Sun size={14} className="text-brand-yellow" />}
              <span>{theme === 'dark' ? 'Charcoal Theatre' : 'Bright Canvas'}</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-control dark:bg-dark-canvas text-muted">
              Toggle
            </span>
          </button>

          {/* User badge */}
          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0 pr-2">
              <div className="text-xs text-muted dark:text-dark-muted">Signed in as</div>
              <div className="text-sm font-medium truncate text-ink dark:text-white">
                {user?.name || user?.username || 'Admin'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-full text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area: Independently scrolling, full height */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        {/* Sticky 44px Navigation Bar */}
        <header className="sticky top-0 z-30 h-14 bg-canvas/90 dark:bg-dark-canvas/90 backdrop-blur-md border-b border-edge/50 px-4 sm:px-8 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-full text-ink dark:text-white hover:bg-control"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 lg:hidden font-medium text-ink dark:text-white">
              <div className="w-7 h-7 rounded-lg bg-brand-blue text-white flex items-center justify-center font-bold text-sm">
                +
              </div>
              <span>Vijya Care</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Meta WhatsApp Cloud Engine Active</span>
            </div>
          </div>

          {/* Header Action controls */}
          <div className="flex items-center gap-3">
            {!isSuper && (
              status?.active ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="badge bg-brand-tint text-brand-blue border border-brand-blue/30 hidden sm:inline-flex items-center gap-1.5">
                    <Crown size={13} className="text-brand-blue" />
                    <span>{status.plan?.planName || 'Active'}</span>
                    <span className="text-muted">({status.daysLeft}d left)</span>
                  </span>
                  <button
                    onClick={() => nav('/purchase')}
                    className="btn-sm bg-control text-brand-blue hover:bg-stage-gray"
                  >
                    Renew
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs text-rose-500 font-medium hidden sm:inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Automation Disabled
                  </span>
                  <button
                    onClick={() => nav('/purchase')}
                    className="btn-sm bg-brand-blue text-white hover:bg-[#1a79ff]"
                  >
                    <ShoppingCart size={13} />
                    <span>Purchase Plan</span>
                  </button>
                </div>
              )
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-muted hover:text-ink hover:bg-control transition-colors"
              title="Toggle Light / Charcoal Theatre"
            >
              {theme === 'dark' ? <Sun size={17} className="text-brand-yellow" /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {/* Page Container: Full width, removed large side gap */}
        <div className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
