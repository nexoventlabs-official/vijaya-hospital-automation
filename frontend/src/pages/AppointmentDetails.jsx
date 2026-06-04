import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Check, X, IndianRupee, FileText } from 'lucide-react';
import api, { apiBase } from '../api';

export default function AppointmentDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success' | 'error', text: '...' }

  async function load() {
    const r = await api.get(`/appointments/${id}`);
    setA(r.data);
  }
  useEffect(() => { load(); }, [id]);

  async function action(path, body = {}) {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post(`/appointments/${id}/${path}`, body);
      setA(r.data);
      setMsg({ type: 'success', text: `Consultation ${path} updated successfully` });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Operation failed' });
    } finally { setBusy(false); setTimeout(() => setMsg(null), 2500); }
  }

  function print() {
    const token = localStorage.getItem('vh_token');
    const url = `${apiBase}/appointments/${id}/pdf`;
    setPrinting(true);
    // Open PDF in a new window with auth header is not possible directly,
    // so we fetch as blob then open in a new tab where the browser triggers print.
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((b) => {
        const objUrl = URL.createObjectURL(b);
        const w = window.open(objUrl);
        if (w) {
          w.addEventListener('load', () => {
            try { w.focus(); w.print(); } catch {}
          });
        }
      })
      .finally(() => setPrinting(false));
  }

  if (!a) return <div className="text-soft-stone py-12 text-center text-sm font-medium animate-pulse">Loading appointment details…</div>;

  const Row = ({ k, v }) => (
    <tr className="hover:bg-pale-amber/5">
      <td className="px-5 py-3 text-soft-stone text-xs font-semibold uppercase tracking-wider w-1/3">{k}</td>
      <td className="px-5 py-3 font-medium text-midnight-pine text-sm">{v ?? '—'}</td>
    </tr>
  );

  const isActive = ['booked', 'arrived'].includes(a.status);

  return (
    <div className="space-y-6 max-w-5xl font-mint">
      <button onClick={() => nav(-1)} className="btn-secondary py-1.5 px-3 text-xs font-semibold">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="flex items-center justify-between flex-wrap gap-4 bg-pale-amber/10 p-5 rounded-2xl border border-arctic-mist">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">{a.code}</h1>
          <span className={`badge status-${a.status} mt-2`}>{a.status}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={print} disabled={printing} className="btn-secondary py-2 px-3 text-xs font-semibold">
            {printing ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <Printer size={14} />
            )}
            {printing ? 'Generating…' : 'Print PDF'}
          </button>
          {isActive && a.status === 'booked' && (
            <button disabled={busy} onClick={() => action('arrive')} className="btn-secondary py-2 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50">
              {busy ? (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <Check size={14} />
              )}
              Mark Arrived
            </button>
          )}
          {isActive && (
            <>
              <button disabled={busy} onClick={() => action('complete', { paymentReceived: a.paymentMode === 'pay_at_hospital' })} className="btn-primary py-2 px-4 text-xs font-semibold">
                {busy ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <Check size={14} />
                )}
                {busy ? 'Updating…' : 'Complete Consultation'}
              </button>
              {a.paymentMode === 'pay_at_hospital' && a.paymentStatus !== 'paid' && (
                <button disabled={busy} onClick={() => action('payment')} className="btn-secondary py-2 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                  {busy ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <IndianRupee size={14} />
                  )}
                  Mark Paid
                </button>
              )}
              <button disabled={busy} onClick={() => action('cancel', { reason: prompt('Cancel reason?') || 'Cancelled by admin' })} className="btn-danger py-2 px-3 text-xs font-semibold">
                {busy ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <X size={14} />
                )}
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
          msg.type === 'success'
            ? 'bg-pale-mint/30 border-pale-mint text-zenith-teal'
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 bg-pale-amber/20 border-b border-arctic-mist text-midnight-pine font-semibold font-grenette">
            Appointment Details
          </div>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-arctic-mist/70">
              <Row k="Code" v={a.code} />
              <Row k="Status" v={<span className={`badge status-${a.status}`}>{a.status}</span>} />
              <Row k="Date" v={a.date} />
              <Row k="Time" v={a.timeLabel || a.time} />
              <Row k="Booked at" v={a.createdAt && new Date(a.createdAt).toLocaleString()} />
              <Row k="Arrived at" v={a.arrivedAt && new Date(a.arrivedAt).toLocaleString()} />
              <Row k="Completed at" v={a.completedAt && new Date(a.completedAt).toLocaleString()} />
              {a.cancellationReason && <Row k="Cancel reason" v={a.cancellationReason} />}
              {a.postponeReason && <Row k="Postpone reason" v={a.postponeReason} />}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 bg-pale-amber/20 border-b border-arctic-mist text-midnight-pine font-semibold font-grenette">
            Patient Profile
          </div>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-arctic-mist/70">
              <Row k="Name" v={a.patientName} />
              <Row k="WhatsApp" v={`+${a.patientPhone}`} />
              <Row k="Age" v={a.patientAge} />
              <Row k="Gender" v={a.patientGender} />
              <Row k="Reason" v={a.reason} />
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 bg-pale-amber/20 border-b border-arctic-mist text-midnight-pine font-semibold font-grenette">
            Assigned Doctor
          </div>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-arctic-mist/70">
              <Row k="Doctor" v={a.doctorName} />
              <Row k="Department" v={a.departmentName} />
              <Row k="Speciality" v={a.doctorSpeciality} />
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 bg-pale-amber/20 border-b border-arctic-mist text-midnight-pine font-semibold font-grenette">
            Payment Records
          </div>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-arctic-mist/70">
              <Row k="Fee" v={`₹${a.fee}`} />
              <Row k="Mode" v={a.paymentMode === 'online' ? 'Online' : 'Pay at Hospital'} />
              <Row k="Status" v={<span className={`badge ${a.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{a.paymentStatus}</span>} />
            </tbody>
          </table>
        </div>
      </div>

      {a.notes && (
        <div className="card p-5">
          <div className="font-semibold mb-2 flex items-center gap-2 text-midnight-pine font-grenette text-base">
            <FileText size={16} className="text-zenith-teal" /> Consultation Notes
          </div>
          <div className="text-sm text-soft-stone whitespace-pre-wrap leading-relaxed">{a.notes}</div>
        </div>
      )}
    </div>
  );
}
