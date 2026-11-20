import { useEffect, useState } from 'react';
import { RefreshCw, Receipt, CreditCard, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import api from '../api';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonStats, SkeletonTable } from '../components/Skeleton.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function statusBadge(s, endsAt) {
  const expired = s === 'active' && new Date(endsAt).getTime() < Date.now();
  const eff = expired ? 'expired' : s;
  const map = {
    active: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300',
    expired: 'bg-control text-muted border-edge/60',
    cancelled: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300',
  };
  return <span className={`badge ${map[eff] || 'bg-control text-muted'}`}>{eff}</span>;
}

export default function PlanHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/billing/history');
      setRows(r.data || []);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Failed to load billing history' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalRevenue = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const activeLicenses = rows.filter((r) => r.status === 'active' && new Date(r.endsAt).getTime() > Date.now()).length;

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-edge/40">
        <PairedHeading
          eyebrow="Billing Ledger."
          headline="Subscription Invoices & Revenue."
          description="Track hospital administrator subscriptions, gateway settlements, and license audit trails."
        />
        <button onClick={load} className="btn-secondary h-11 text-sm font-medium">
          <RefreshCw size={15} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-[16px] text-sm font-medium bg-rose-50 text-rose-800 border border-rose-300">
          {msg.text}
        </div>
      )}

      {/* 3 Metric Cards */}
      {loading ? (
        <SkeletonStats count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-feature border border-edge/50 dark:border-edge/40 p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">Total Orders</span>
              <div className="text-3xl font-medium tracking-tight text-ink dark:text-white">
                {rows.length}
              </div>
              <div className="text-xs text-muted">All-time transactions</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
              <Receipt size={24} />
            </div>
          </div>

          <div className="card-feature border border-edge/50 dark:border-edge/40 p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">Total Gross Revenue</span>
              <div className="text-3xl font-medium tracking-tight text-ink dark:text-white">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">100% Settled</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>

          <div className="card-feature border border-edge/50 dark:border-edge/40 p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">Active Instances</span>
              <div className="text-3xl font-medium tracking-tight text-ink dark:text-white">
                {activeLicenses}
              </div>
              <div className="text-xs text-brand-blue font-semibold">Live WhatsApp automation</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-brand-violet/15 text-brand-violet flex items-center justify-center">
              <CreditCard size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Audit Ledger Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={9} />
      ) : (
        <div className="card-feature p-0 overflow-hidden border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f4f4f5]/60 dark:bg-dark-card/40 border-b border-edge/60 text-xs font-medium text-muted uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-4">Administrator</th>
                  <th className="text-left px-6 py-4">Plan Name</th>
                  <th className="text-left px-6 py-4">Settled Amount</th>
                  <th className="text-left px-6 py-4">Type</th>
                  <th className="text-left px-6 py-4">Renewals</th>
                  <th className="text-left px-6 py-4">Start Date</th>
                  <th className="text-left px-6 py-4">Expiry Date</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Invoice No.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/40">
                {rows.map((r) => (
                  <tr key={r._id} className="hover:bg-control/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink dark:text-white text-sm">
                        {r.adminName || r.adminUsername}
                      </div>
                      <div className="text-xs text-muted">
                        {r.adminEmail || r.adminUsername}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-ink dark:text-white text-sm">
                      {r.planName}
                    </td>
                    <td className="px-6 py-4 font-semibold text-ink dark:text-white text-sm">
                      ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      {r.isRenewal ? (
                        <span className="badge bg-brand-violet/15 text-brand-violet border border-brand-violet/30">
                          Renewal
                        </span>
                      ) : (
                        <span className="badge bg-brand-sky/15 text-brand-sky border border-brand-sky/30">
                          New Buy
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold">
                      {r.renewalCount || 0}×
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {fmtDate(r.startsAt)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {fmtDate(r.endsAt)}
                    </td>
                    <td className="px-6 py-4">
                      {statusBadge(r.status, r.endsAt)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-brand-blue font-semibold">
                      {r.invoiceNumber || '—'}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-muted text-sm space-y-2">
                      <div className="w-12 h-12 rounded-full bg-stage-gray/50 flex items-center justify-center mx-auto text-muted mb-2">
                        <Receipt size={20} />
                      </div>
                      <div className="font-medium text-ink dark:text-white">No subscription records yet</div>
                      <div className="text-xs">
                        Transactions made through Razorpay / online payments will appear here automatically.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
