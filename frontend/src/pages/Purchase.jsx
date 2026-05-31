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
  const [msg, setMsg] = useState('');
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
      setMsg('❌ ' + (e.response?.data?.error || 'Failed to load plans'));
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
      setMsg('✅ Payment successful! Your plan is now active. If your email is on file, the invoice has been sent.');
    } else {
      const reason = params.get('reason');
      setMsg('❌ Payment was not completed' + (reason ? ` (${reason})` : '') + '. Please try again.');
    }
    // Clear the query param and refresh status
    params.delete('payment');
    params.delete('reason');
    setParams(params, { replace: true });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buy(plan) {
    setMsg('');
    if (!config.configured) {
      setMsg('❌ Payments are not configured yet. Please contact the platform owner.');
      return;
    }
    setBusyId(plan.id || plan._id);
    try {
      const { data } = await api.post('/billing/link', { planId: plan.id || plan._id });
      if (data?.url) {
        // Redirect to Razorpay's hosted payment page (no domain whitelisting needed).
        window.location.href = data.url;
      } else {
        setMsg('❌ Could not start payment. Please try again.');
        setBusyId(null);
      }
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Could not start payment'));
      setBusyId(null);
    }
  }

  if (loading) return <div className="text-slate-500 animate-pulse">Loading plans…</div>;

  const active = status?.active;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Subscription Plans</h1>
        <p className="text-sm text-slate-500">
          A plan unlocks full access and turns on WhatsApp automation (welcome messages, chatbot &amp; booking).
        </p>
      </div>

      {/* Current plan / renewal status */}
      <div className={`card p-5 ${active ? 'border-amber-300 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
        {active ? (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <Crown size={18} /> Active Plan
            </div>
            <div className="text-sm"><span className="text-slate-500">Plan:</span> <strong>{status.plan?.planName}</strong></div>
            <div className="text-sm flex items-center gap-1">
              <CalendarClock size={15} className="text-slate-500" />
              <strong>{status.daysLeft}</strong> day{status.daysLeft === 1 ? '' : 's'} left
            </div>
            <div className="text-sm"><span className="text-slate-500">Started:</span> {fmtDate(status.plan?.startsAt)}</div>
            <div className="text-sm"><span className="text-slate-500">Expires:</span> {fmtDate(status.plan?.endsAt)}</div>
            {status.plan?.renewalCount > 0 && (
              <div className="text-sm"><span className="text-slate-500">Renewed:</span> {status.plan.renewalCount}×</div>
            )}
          </div>
        ) : (
          <div className="text-rose-700 font-medium">
            You have no active plan. WhatsApp automation is currently OFF — patients messaging your number won’t get any reply until you purchase a plan.
          </div>
        )}
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      {!config.configured && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          ⚠️ Online payments are not configured yet. Ask the platform owner to set the Razorpay keys.
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const id = plan.id || plan._id;
          const discount = plan.discountPercent || (plan.mrp > plan.price ? Math.round(((plan.mrp - plan.price) / plan.mrp) * 100) : 0);
          return (
            <div key={id} className="card p-5 flex flex-col relative overflow-hidden">
              {discount > 0 && (
                <span className="absolute top-3 right-3 badge bg-emerald-100 text-emerald-700 font-semibold">
                  {discount}% OFF
                </span>
              )}
              <div className="text-lg font-bold text-brand-900">{plan.name}</div>
              <div className="text-xs text-slate-500 mb-3">{plan.description}</div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-extrabold text-brand-900">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                {plan.mrp > plan.price && (
                  <span className="text-sm text-slate-400 line-through mb-1">₹{Number(plan.mrp).toLocaleString('en-IN')}</span>
                )}
              </div>
              <div className="text-xs text-slate-500 mb-4">{plan.durationDays} days access</div>

              <ul className="text-sm text-slate-600 space-y-1 mb-5">
                <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Full admin panel access</li>
                <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> WhatsApp chatbot &amp; automation</li>
                <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Appointment booking flow</li>
                <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Invoice emailed instantly</li>
              </ul>

              <button
                onClick={() => buy(plan)}
                disabled={busyId === id || !config.configured}
                className="btn-primary mt-auto w-full"
              >
                {busyId === id ? 'Redirecting…' : active ? (<><RefreshCw size={16} /> Renew with this plan</>) : (<><ShoppingCart size={16} /> Purchase</>)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
