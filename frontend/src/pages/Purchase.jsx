import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crown, Check } from 'lucide-react';
import api from '../api';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonStats } from '../components/Skeleton.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Purchase() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState({ configured: false });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [params, setParams] = useSearchParams();

  async function load() {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        api.get('/plans'),
        api.get('/billing/status'),
        api.get('/billing/config'),
      ]);
      setPlans(p.data || []);
      setStatus(s.data || null);
      setConfig(c.data || { configured: false });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Failed to load plans' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const result = params.get('payment');
    if (!result) return;
    if (result === 'success') {
      setMsg({
        type: 'success',
        text: 'Payment successful! Your hospital subscription plan is now active. WhatsApp automation is online.',
      });
    } else {
      const reason = params.get('reason');
      setMsg({
        type: 'error',
        text: 'Payment was not completed' + (reason ? ` (${reason})` : '') + '. Please try again.',
      });
    }
    params.delete('payment');
    params.delete('reason');
    setParams(params, { replace: true });
    load();
  }, []);

  async function buy(plan) {
    setMsg(null);
    if (!config.configured) {
      setMsg({
        type: 'warning',
        text: 'Payments are not configured yet on this instance. Please contact the platform owner.',
      });
      return;
    }
    setBusyId(plan.id || plan._id);
    try {
      const { data } = await api.post('/billing/link', { planId: plan.id || plan._id });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setMsg({ type: 'error', text: 'Could not initiate payment gateway session.' });
        setBusyId(null);
      }
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Could not start payment.' });
      setBusyId(null);
    }
  }

  const active = status?.active;

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-edge/40">
        <PairedHeading
          eyebrow="Flexible Subscriptions."
          headline="Automate Patient Care."
          description="Choose a transparent subscription tier to unlock instant WhatsApp bookings, automated rescheduling, and unlimited patient passes."
        />
      </div>

      {/* Current Active Plan Status Strip */}
      <div
        className={`card-feature p-6 border ${
          active
            ? 'bg-[#edf5ff] dark:bg-dark-card border-brand-blue/30'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
        }`}
      >
        {active ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue text-white flex items-center justify-center shadow-glow-blue flex-shrink-0">
                <Crown size={22} className="fill-white" />
              </div>
              <div>
                <div className="font-medium text-base text-ink dark:text-white flex items-center gap-2">
                  <span>Current Tier: <strong>{status.plan?.planName}</strong></span>
                  <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px]">
                    Active
                  </span>
                </div>
                <div className="text-xs text-muted dark:text-dark-muted mt-0.5">
                  Expires on {fmtDate(status.plan?.endsAt)} · <strong>{status.daysLeft}</strong> days remaining
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">WhatsApp Engine:</span>
              <span className="badge bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">
                Live Online
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-rose-800 dark:text-rose-200">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
            <div className="text-xs sm:text-sm font-medium">
              No active subscription found. WhatsApp automation is currently paused. Select a plan below to activate 24/7 patient self-booking.
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div
          className={`p-4 rounded-[16px] text-sm font-medium flex items-center gap-2 border ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : msg.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-brand-blue" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* 4-Column Plan Grid with Flexibits Recommended Plan Styling */}
      {loading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p, idx) => {
            const isRecommended = idx === 1 || p.code === 'quarterly' || p.code === 'popular';
            const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
            const isCurrent = active && (status.plan?.planCode === p.code || status.plan?.planId === p._id);

            return (
              <div
                key={p._id || p.id}
                className={`relative rounded-plan p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                  isRecommended
                    ? 'bg-[#edf5ff] dark:bg-dark-card border-2 border-brand-blue shadow-glow-blue'
                    : 'bg-card-gray dark:bg-dark-card border border-edge/60'
                }`}
              >
                {/* Diagonal Recommended Ribbon */}
                {isRecommended && (
                  <div className="absolute top-4 right-4">
                    <span className="badge bg-brand-blue text-white text-[11px] font-semibold uppercase tracking-wider px-3 py-1 shadow-sm">
                      Recommended
                    </span>
                  </div>
                )}

                <div>
                  {/* Plan Icon */}
                  <div
                    className={`w-12 h-12 rounded-[18px] flex items-center justify-center mb-5 ${
                      isRecommended
                        ? 'bg-brand-blue text-white shadow-glow-blue'
                        : 'bg-control dark:bg-dark-canvas text-brand-blue'
                    }`}
                  >
                    <Crown size={22} className={isRecommended ? 'fill-white' : ''} />
                  </div>

                  <h3 className="text-xl font-medium text-ink dark:text-white">
                    {p.name}
                  </h3>
                  <p className="text-xs text-muted dark:text-dark-muted mt-1 min-h-[32px]">
                    {p.description || `${p.durationDays} days of automated patient booking`}
                  </p>

                  {/* Price Section */}
                  <div className="mt-6 pt-5 border-t border-edge/40">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-medium tracking-tight text-ink dark:text-white">
                        ₹{p.price}
                      </span>
                      {p.mrp > p.price && (
                        <span className="text-sm text-muted line-through">
                          ₹{p.mrp}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Billed for {p.durationDays} days
                      {discount > 0 && (
                        <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                          Save {discount}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Plan Inclusions Checklist */}
                  <div className="mt-6 space-y-2.5 pt-5 border-t border-edge/40 text-xs text-muted dark:text-dark-muted">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue flex-shrink-0" />
                      <span>Bilingual WhatsApp Bot</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue flex-shrink-0" />
                      <span>Instant Consultation PDF Passes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue flex-shrink-0" />
                      <span>Automated Absence Postponements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue flex-shrink-0" />
                      <span>Google Sheets Sync</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <button
                    onClick={() => buy(p)}
                    disabled={busyId === (p.id || p._id)}
                    className={`w-full h-11 text-sm font-medium ${
                      isRecommended ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {busyId === (p.id || p._id) ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        <span>Connecting…</span>
                      </span>
                    ) : isCurrent ? (
                      'Renew Current Plan'
                    ) : (
                      'Subscribe Now'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
