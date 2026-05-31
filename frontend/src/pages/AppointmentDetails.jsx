import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Check, X, IndianRupee, FileText } from 'lucide-react';
import api, { apiBase } from '../api';

export default function AppointmentDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await api.get(`/appointments/${id}`);
    setA(r.data);
  }
  useEffect(() => { load(); }, [id]);

  async function action(path, body = {}) {
    setBusy(true); setMsg('');
    try {
      const r = await api.post(`/appointments/${id}/${path}`, body);
      setA(r.data);
      setMsg(`✅ ${path} done`);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'Failed'));
    } finally { setBusy(false); setTimeout(() => setMsg(''), 2500); }
  }

  function print() {
    const token = localStorage.getItem('vh_token');
    const url = `${apiBase}/appointments/${id}/pdf`;
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
      });
  }

  if (!a) return <div className="text-slate-500">Loading…</div>;

  const Row = ({ k, v }) => (
    <tr>
      <td className="px-4 py-2 text-slate-500 text-xs uppercase tracking-wide w-1/3">{k}</td>
      <td className="px-4 py-2">{v ?? '—'}</td>
    </tr>
  );

  const isActive = ['booked', 'arrived'].includes(a.status);

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => nav(-1)} className="btn-ghost text-sm"><ArrowLeft size={14} /> Back</button>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{a.code}</h1>
          <span className={`badge status-${a.status}`}>{a.status}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={print} className="btn-secondary"><Printer size={14} /> Print PDF</button>
          {isActive && a.status === 'booked' && (
            <button disabled={busy} onClick={() => action('arrive')} className="btn-secondary text-amber-700"><Check size={14} /> Mark Arrived</button>
          )}
          {isActive && (
            <>
              <button disabled={busy} onClick={() => action('complete', { paymentReceived: a.paymentMode === 'pay_at_hospital' })} className="btn-primary"><Check size={14} /> Complete Consultation</button>
              {a.paymentMode === 'pay_at_hospital' && a.paymentStatus !== 'paid' && (
                <button disabled={busy} onClick={() => action('payment')} className="btn-secondary text-emerald-700"><IndianRupee size={14} /> Mark Paid</button>
              )}
              <button disabled={busy} onClick={() => action('cancel', { reason: prompt('Cancel reason?') || 'Cancelled by admin' })} className="btn-danger"><X size={14} /> Cancel</button>
            </>
          )}
        </div>
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-brand-50 text-brand-800 font-semibold">Appointment</div>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
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
          <div className="px-5 py-3 bg-brand-50 text-brand-800 font-semibold">Patient</div>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <Row k="Name" v={a.patientName} />
              <Row k="WhatsApp" v={`+${a.patientPhone}`} />
              <Row k="Age" v={a.patientAge} />
              <Row k="Gender" v={a.patientGender} />
              <Row k="Reason" v={a.reason} />
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-brand-50 text-brand-800 font-semibold">Doctor</div>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <Row k="Doctor" v={a.doctorName} />
              <Row k="Department" v={a.departmentName} />
              <Row k="Speciality" v={a.doctorSpeciality} />
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-brand-50 text-brand-800 font-semibold">Payment</div>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <Row k="Fee" v={`₹${a.fee}`} />
              <Row k="Mode" v={a.paymentMode === 'online' ? 'Online' : 'Pay at Hospital'} />
              <Row k="Status" v={<span className={a.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>{a.paymentStatus}</span>} />
            </tbody>
          </table>
        </div>
      </div>

      {a.notes && (
        <div className="card p-4">
          <div className="font-semibold mb-1 flex items-center gap-2 text-brand-800"><FileText size={14} /> Notes</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{a.notes}</div>
        </div>
      )}
    </div>
  );
}
