import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crown, Check, ShoppingCart, RefreshCw, CalendarClock } from 'lucide-react';
import api from '../api';

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
  const [msg, setMsg] = useState(null); // { type: 'success' | 'error' | 'warning', text: '...' }
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

  // Handle the redirect back from Razorpay's hosted payment page.
  useEffect(() => {
    const result = params.get('payment');
    if (!result) return;
    if (result === 'success') {
      setMsg({ type: 'success', text: 'Payment successful! Your subscription plan is now active. If your email is on file, the invoice has been sent.' });
    } else {
      const reason = params.get('reason');
      setMsg({ type: 'error', text: 'Payment was not completed' + (reason ? ` (${reason})` : '') + '. Please try again.' });
    }
    // Clear the query param and refresh status
    params.delete('payment');
    params.delete('reason');
    setParams(params, { replace: true });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buy(plan) {
    setMsg(null);
    if (!config.configured) {
      setMsg({ type: 'warning', text: 'Payments are not configured yet. Please contact the platform owner.' });
      return;
    }
    setBusyId(plan.id || plan._id);
    try {
      const { data } = await api.post('/billing/link', { planId: plan.id || plan._id });
      if (data?.url) {
        // Redirect to Razorpay's hosted payment page (no domain whitelisting needed).
        window.location.href = data.url;
      } else {
        setMsg({ type: 'error', text: 'Could not start payment. Please try again.' });
        setBusyId(null);
      }
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Could not start payment' });
      setBusyId(null);
    }
  }

  if (loading) return <div className="text-soft-stone py-12 text-center text-sm font-medium animate-pulse">Loading plans details…</div>;

  const active = status?.active;

  return (
    <div className="space-y-6 max-w-5xl font-mint">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Subscription Plans</h1>
        <p className="text-sm text-soft-stone mt-1">
          Select a subscription tier to unlock instant access to WhatsApp welcome messages, chatbot flows, and online bookings.
        </p>
      </div>

      {/* Current plan / renewal status */}
      <div className={`card p-5 border-l-4 ${
        active 
          ? 'border-l-zenith-teal bg-pale-amber/40 border border-arctic-mist' 
          : 'border-l-rose-500 bg-rose-50 border border-rose-200'
      }`}>
        {active ? (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2 text-zenith-teal font-semibold font-grenette text-base">
              <Crown size={18} className="fill-zenith-teal" /> Active Plan
            </div>
            <div className="text-sm text-midnight-pine"><span className="text-soft-stone">Plan:</span> <strong>{status.plan?.planName}</strong></div>
            <div className="text-sm text-midnight-pine flex items-center gap-1.5">
              <CalendarClock size={15} className="text-soft-stone" />
              <strong>{status.daysLeft}</strong> day{status.daysLeft === 1 ? '' : 's'} left
            </div>
            <div className="text-sm text-midnight-pine"><span className="text-soft-stone">Started:</span> {fmtDate(status.plan?.startsAt)}</div>
            <div className="text-sm text-midnight-pine"><span className="text-soft-stone">Expires:</span> {fmtDate(status.plan?.endsAt)}</div>
            {status.plan?.renewalCount > 0 && (
              <div className="text-sm text-midnight-pine"><span className="text-soft-stone">Renewed:</span> {status.plan.renewalCount}×</div>
            )}
          </div>
        ) : (
          <div className="text-rose-800 font-medium text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You have no active plan. WhatsApp automation is currently disabled. Patients messaging your number will not receive auto-responses until a plan is configured.</span>
          </div>
        )}
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
          msg.type === 'success'
            ? 'bg-pale-mint/30 border-pale-mint text-zenith-teal'
            : msg.type === 'warning'
            ? 'bg-pale-amber/60 border-amber-300 text-amber-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {!config.configured && (
        <div className="text-sm text-amber-800 bg-pale-amber/50 border border-amber-300 rounded-xl p-4 flex items-center gap-2.5">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Online payments are not configured yet. Please request the platform owner to set up the Razorpay API keys.</span>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const id = plan.id || plan._id;
          const discount = plan.discountPercent || (plan.mrp > plan.price ? Math.round(((plan.mrp - plan.price) / plan.mrp) * 100) : 0);
          return (
            <div key={id} className="card p-6 flex flex-col justify-between relative overflow-hidden hover:border-zenith-teal hover:bg-pale-amber/5 transition-all duration-300 group">
              {discount > 0 && (
                <span className="absolute top-4 right-4 badge bg-pale-mint/60 text-zenith-teal border-pale-mint font-semibold">
                  {discount}% OFF
                </span>
              )}
              
              <div>
                <div className="text-lg font-bold text-midnight-pine font-grenette mb-1">{plan.name}</div>
                <div className="text-xs text-soft-stone mb-4 max-w-[80%]">{plan.description}</div>
                
                <div className="flex items-end gap-2 mb-2 border-b border-arctic-mist/60 pb-3">
                  <span className="text-3xl font-bold text-midnight-pine font-grenette">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                  {plan.mrp > plan.price && (
                    <span className="text-sm text-soft-stone line-through mb-1">₹{Number(plan.mrp).toLocaleString('en-IN')}</span>
                  )}
                </div>
                <div className="text-xs font-semibold text-zenith-teal bg-pale-mint/30 py-1 px-2.5 rounded inline-block mb-5">
                  {plan.durationDays} days access
                </div>

                <ul className="text-sm text-soft-stone space-y-2.5 mb-8">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-zenith-teal" /> Full admin panel access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-zenith-teal" /> WhatsApp chatbot &amp; flow engine
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-zenith-teal" /> Appointment reservation pipelines
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-zenith-teal" /> Instant PDF invoicing via email
                  </li>
                </ul>
              </div>

              <button
                onClick={() => buy(plan)}
                disabled={busyId === id || !config.configured}
                className="btn-primary mt-auto w-full py-3 text-xs font-semibold transition-all duration-200 group-hover:bg-ocean-glimmer"
              >
                {busyId === id ? (
                  'Redirecting…'
                ) : active ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <RefreshCw size={13} /> Renew with this plan
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <ShoppingCart size={13} /> Purchase
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
