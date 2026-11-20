import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Printer, Check, X, IndianRupee, FileText,
  User, Calendar, Stethoscope, CreditCard, ShieldCheck, Clock,
} from 'lucide-react';
import api, { apiBase } from '../api';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonDetails } from '../components/Skeleton.jsx';

export default function AppointmentDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [msg, setMsg] = useState(null);

  async function load() {
    try {
      const r = await api.get(`/appointments/${id}`);
      setA(r.data);
    } catch {}
  }
  useEffect(() => { load(); }, [id]);

  async function action(path, body = {}) {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post(`/appointments/${id}/${path}`, body);
      setA(r.data);
      setMsg({ type: 'success', text: `Consultation marked as ${path} successfully.` });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Operation failed' });
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  function print() {
    const token = localStorage.getItem('vh_token');
    const url = `${apiBase}/appointments/${id}/pdf`;
    setPrinting(true);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((b) => {
        const objUrl = URL.createObjectURL(b);
        const w = window.open(objUrl);
        if (w) {
          setTimeout(() => {
            try { w.focus(); w.print(); } catch {}
          }, 800);
        }
      })
      .finally(() => setPrinting(false));
  }

  if (!a) {
    return <SkeletonDetails />;
  }

  const isActive = ['booked', 'arrived'].includes(a.status);

  const Row = ({ k, v }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-edge/30 last:border-0 text-sm">
      <span className="text-muted dark:text-dark-muted font-medium text-xs">{k}</span>
      <span className="font-medium text-ink dark:text-white text-right">{v ?? '—'}</span>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Top Navigation & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-edge/40">
        <button
          onClick={() => nav(-1)}
          className="btn-secondary h-10 px-4 text-xs font-semibold self-start"
        >
          <ArrowLeft size={14} />
          <span>Back to List</span>
        </button>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={print}
            disabled={printing}
            className="btn-secondary h-10 px-5 text-xs font-medium"
          >
            {printing ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
            ) : (
              <Printer size={14} />
            )}
            <span>{printing ? 'Generating Slip…' : 'Print Pass PDF'}</span>
          </button>

          {isActive && a.status === 'booked' && (
            <button
              disabled={busy}
              onClick={() => action('arrive')}
              className="btn-secondary h-10 px-5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300"
            >
              <Check size={14} />
              <span>Mark Arrived</span>
            </button>
          )}

          {isActive && (
            <>
              <button
                disabled={busy}
                onClick={() => action('complete', { paymentReceived: a.paymentMode === 'pay_at_hospital' })}
                className="btn-primary h-10 px-5 text-xs font-medium"
              >
                <Check size={14} />
                <span>Complete Consult</span>
              </button>

              {a.paymentMode === 'pay_at_hospital' && a.paymentStatus !== 'paid' && (
                <button
                  disabled={busy}
                  onClick={() => action('payment')}
                  className="btn-secondary h-10 px-5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  <IndianRupee size={14} />
                  <span>Receive Payment</span>
                </button>
              )}

              <button
                disabled={busy}
                onClick={() => {
                  const r = prompt('Reason for cancelling this appointment?');
                  if (r) action('cancel', { reason: r });
                }}
                className="btn-danger h-10 px-5 text-xs font-medium"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chapter Heading with Badges */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PairedHeading
          eyebrow="Consultation File."
          headline={`Booking — ${a.code}`}
          description={`Registered on ${a.date} at ${a.timeLabel || a.time} with Dr. ${a.doctorName}.`}
          badge={
            <span className={`badge status-${a.status} text-sm px-3.5 py-1 font-semibold`}>
              Status: {a.status}
            </span>
          }
        />
      </div>

      {msg && (
        <div
          className={`p-4 rounded-[16px] text-sm font-medium flex items-center gap-2 border ${
            msg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* 4 Capability Cards in 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Consultation Details */}
        <div className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-edge/40">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-medium text-base text-ink dark:text-white">Appointment Schedule</h3>
              <div className="text-xs text-muted">Timestamps & reference codes</div>
            </div>
          </div>
          <div className="space-y-1">
            <Row k="Reference Code" v={<span className="font-mono font-semibold text-brand-blue">{a.code}</span>} />
            <Row k="Date of Visit" v={a.date} />
            <Row k="Scheduled Time" v={a.timeLabel || a.time} />
            <Row k="Booked At" v={a.createdAt && new Date(a.createdAt).toLocaleString()} />
            <Row k="Arrival Time" v={a.arrivedAt && new Date(a.arrivedAt).toLocaleString()} />
            <Row k="Completed At" v={a.completedAt && new Date(a.completedAt).toLocaleString()} />
            {a.cancellationReason && <Row k="Cancellation Note" v={a.cancellationReason} />}
            {a.postponeReason && <Row k="Postponed Reason" v={a.postponeReason} />}
          </div>
        </div>

        {/* Card 2: Patient Dossier */}
        <div className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-edge/40">
            <div className="w-10 h-10 rounded-xl bg-brand-violet/15 text-brand-violet flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <h3 className="font-medium text-base text-ink dark:text-white">Patient Profile</h3>
              <div className="text-xs text-muted">Verified contact & demographics</div>
            </div>
          </div>
          <div className="space-y-1">
            <Row k="Full Name" v={a.patientName} />
            <Row k="WhatsApp Contact" v={`+${a.patientPhone}`} />
            <Row k="Age & Gender" v={`${a.patientAge || '—'} yrs · ${a.patientGender || '—'}`} />
            <Row k="Visit Reason" v={a.reason || 'General Consultation'} />
          </div>
        </div>

        {/* Card 3: Assigned Specialist */}
        <div className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-edge/40">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Stethoscope size={18} />
            </div>
            <div>
              <h3 className="font-medium text-base text-ink dark:text-white">Attending Specialist</h3>
              <div className="text-xs text-muted">Doctor details & section</div>
            </div>
          </div>
          <div className="space-y-1">
            <Row k="Doctor Name" v={a.doctorName} />
            <Row k="Department" v={a.departmentName || 'General Medicine'} />
            <Row k="Specialization" v={a.doctorSpeciality || 'General Practitioner'} />
          </div>
        </div>

        {/* Card 4: Billing & Payment */}
        <div className="card-feature border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-edge/40">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/15 text-brand-gold flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="font-medium text-base text-ink dark:text-white">Payment & Billing</h3>
              <div className="text-xs text-muted">Fee ledger & settlement</div>
            </div>
          </div>
          <div className="space-y-1">
            <Row k="Consultation Fee" v={<span className="font-semibold text-base">₹{a.fee}</span>} />
            <Row k="Settlement Channel" v={a.paymentMode === 'online' ? 'Online Payment Gateway' : 'Pay at Reception Counter'} />
            <Row
              k="Payment Status"
              v={
                <span
                  className={`badge ${
                    a.paymentStatus === 'paid'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {a.paymentStatus === 'paid' ? 'Paid in Full' : 'Pending Payment'}
                </span>
              }
            />
          </div>
        </div>
      </div>

      {/* Notes Vignette */}
      {a.notes && (
        <div className="card-lead border border-brand-blue/30">
          <div className="flex items-center gap-2 font-medium text-ink dark:text-white mb-2">
            <FileText size={16} className="text-brand-blue" />
            <span>Consultation & Prescription Notes</span>
          </div>
          <p className="text-sm text-muted dark:text-dark-muted whitespace-pre-wrap leading-relaxed">
            {a.notes}
          </p>
        </div>
      )}
    </div>
  );
}
