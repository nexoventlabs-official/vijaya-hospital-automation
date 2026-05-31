import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../api';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(s, endsAt) {
  const expired = s === 'active' && new Date(endsAt).getTime() < Date.now();
  const eff = expired ? 'expired' : s;
  const map = {
    active: 'bg-pale-mint/40 text-zenith-teal border-pale-mint',
    expired: 'bg-slate-50 text-soft-stone border-arctic-mist',
    cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
  };
  return <span className={`badge ${map[eff] || 'bg-slate-50 text-soft-stone border-arctic-mist'}`}>{eff}</span>;
}

export default function PlanHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null); // { type: 'success' | 'error', text: '...' }

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/billing/history');
      setRows(r.data || []);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Failed to load history' });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // Summary: total revenue + per-admin renewal counts
  const totalRevenue = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl font-mint">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Plan History</h1>
          <p className="text-sm text-soft-stone mt-1">Audit trail of administrator subscriptions, billing invoices, and total billing revenues.</p>
        </div>
        <button onClick={load} className="btn-secondary py-2.5 px-4 text-xs font-semibold">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
          msg.type === 'success'
            ? 'bg-pale-mint/30 border-pale-mint text-zenith-teal'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-5 hover:border-zenith-teal/30 transition-all duration-300">
          <div className="text-xs font-semibold text-soft-stone uppercase tracking-wider">Total Purchases</div>
          <div className="text-3xl font-semibold text-midnight-pine mt-2 font-grenette">{rows.length}</div>
        </div>
        <div className="card p-5 hover:border-zenith-teal/30 transition-all duration-300">
          <div className="text-xs font-semibold text-soft-stone uppercase tracking-wider">Total Revenue</div>
          <div className="text-3xl font-semibold text-midnight-pine mt-2 font-grenette">₹{totalRevenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="card p-5 hover:border-zenith-teal/30 transition-all duration-300">
          <div className="text-xs font-semibold text-soft-stone uppercase tracking-wider">Active Licences</div>
          <div className="text-3xl font-semibold text-midnight-pine mt-2 font-grenette">
            {rows.filter((r) => r.status === 'active' && new Date(r.endsAt).getTime() > Date.now()).length}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-pale-amber/20 text-midnight-pine border-b border-arctic-mist font-grenette text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Admin</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-left px-5 py-3">Amount</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Renewals</th>
                <th className="text-left px-5 py-3">Start Date</th>
                <th className="text-left px-5 py-3">Expiry Date</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Invoice ID</th>
                <th className="text-left px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arctic-mist/75">
              {loading && (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-soft-stone animate-pulse">
                    Loading history…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-soft-stone">
                    No subscriptions purchased yet
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-pale-amber/5 transition-colors duration-150">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-midnight-pine text-sm font-grenette">{r.adminName || r.adminUsername}</div>
                    <div className="text-xs text-soft-stone mt-0.5">{r.adminEmail || r.adminUsername}</div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-midnight-pine">{r.planName}</td>
                  <td className="px-5 py-4 font-semibold text-midnight-pine">₹{Number(r.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    {r.isRenewal ? (
                      <span className="badge bg-purple-50 text-purple-800 border-purple-200">Renewal</span>
                    ) : (
                      <span className="badge bg-sky-50 text-sky-800 border-sky-200">New</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono font-semibold">{r.renewalCount || 0}×</td>
                  <td className="px-5 py-4 font-mono text-xs">{fmtDate(r.startsAt)}</td>
                  <td className="px-5 py-4 font-mono text-xs">{fmtDate(r.endsAt)}</td>
                  <td className="px-5 py-4">{statusBadge(r.status, r.endsAt)}</td>
                  <td className="px-5 py-4">
                    <div className="text-xs font-semibold text-midnight-pine">{r.invoiceNumber || '—'}</div>
                    {r.invoiceSentTo && <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/50 py-0.5 px-1.5 rounded mt-0.5 inline-block font-semibold uppercase">emailed</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-soft-stone font-mono">{fmtDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
