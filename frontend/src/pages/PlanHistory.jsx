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
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-rose-100 text-rose-700',
  };
  return <span className={`badge ${map[eff] || 'bg-slate-100 text-slate-500'}`}>{eff}</span>;
}

export default function PlanHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/billing/history');
      setRows(r.data || []);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Failed to load history'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // Summary: total revenue + per-admin renewal counts
  const totalRevenue = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Plan History</h1>
          <p className="text-sm text-slate-500">Every purchase &amp; renewal — who bought which plan, when it started/expires, and renewal counts.</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw size={16} /> Refresh</button>
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">Total Records</div>
          <div className="text-2xl font-bold text-brand-900">{rows.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">Total Revenue</div>
          <div className="text-2xl font-bold text-brand-900">₹{totalRevenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">Active Subscriptions</div>
          <div className="text-2xl font-bold text-brand-900">
            {rows.filter((r) => r.status === 'active' && new Date(r.endsAt).getTime() > Date.now()).length}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Admin</th>
              <th className="text-left px-4 py-2">Plan</th>
              <th className="text-left px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Renewed</th>
              <th className="text-left px-4 py-2">Start</th>
              <th className="text-left px-4 py-2">Expires</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Invoice</th>
              <th className="text-left px-4 py-2">Purchased</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-400 animate-pulse">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-400">No purchases yet</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{r.adminName || r.adminUsername}</div>
                  <div className="text-xs text-slate-400">{r.adminEmail || r.adminUsername}</div>
                </td>
                <td className="px-4 py-3">{r.planName}</td>
                <td className="px-4 py-3">₹{Number(r.amount || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  {r.isRenewal
                    ? <span className="badge bg-purple-100 text-purple-700">Renewal</span>
                    : <span className="badge bg-sky-100 text-sky-700">New</span>}
                </td>
                <td className="px-4 py-3">{r.renewalCount || 0}×</td>
                <td className="px-4 py-3">{fmtDate(r.startsAt)}</td>
                <td className="px-4 py-3">{fmtDate(r.endsAt)}</td>
                <td className="px-4 py-3">{statusBadge(r.status, r.endsAt)}</td>
                <td className="px-4 py-3">
                  <div className="text-xs">{r.invoiceNumber || '—'}</div>
                  {r.invoiceSentTo && <div className="text-[10px] text-emerald-600">emailed</div>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
