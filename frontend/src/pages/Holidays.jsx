import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarOff, Calendar } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

export default function Holidays() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState('');
  const [labelTe, setLabelTe] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/holidays');
      setItems(r.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const off = subscribe('holidays', () => load());
    return off;
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!date || !label) return;
    setAdding(true);
    try {
      await api.post('/holidays', { date, label, labelTe });
      setLabel('');
      setLabelTe('');
      load();
    } finally {
      setAdding(false);
    }
  }

  async function del(item) {
    if (!confirm(`Remove holiday closure for "${item.label}"?`)) return;
    await api.delete(`/holidays/${item._id}`);
    load();
  }

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <PairedHeading
        eyebrow="Hospital Calendar."
        headline="Manage Off-Days & Holidays."
        description="Configure festive closures, national holidays, and dates where WhatsApp booking should be blocked."
      />

      {/* Add Holiday Form Card Shell */}
      <form
        onSubmit={add}
        className="card-feature p-6 md:p-8 border border-edge/50 dark:border-edge/40 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-edge/40">
          <div className="w-10 h-10 rounded-xl bg-brand-gold/15 text-brand-gold flex items-center justify-center">
            <CalendarOff size={18} />
          </div>
          <div>
            <h3 className="font-medium text-lg text-ink dark:text-white">Add Hospital Closure Date</h3>
            <div className="text-xs text-muted">Blocks appointment slots on WhatsApp for this day</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="label">Closure Date *</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Festival / Reason (English) *</label>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Sankranti / Diwali"
              required
            />
          </div>

          <div>
            <label className="label">Reason (Telugu - తెలుగు)</label>
            <input
              className="input"
              value={labelTe}
              onChange={(e) => setLabelTe(e.target.value)}
              placeholder="e.g. సంక్రాంతి"
            />
          </div>

          <button
            type="submit"
            disabled={adding}
            className="btn-primary h-11 text-xs font-semibold w-full shadow-glow-blue"
          >
            <Plus size={15} />
            <span>{adding ? 'Adding…' : 'Register Holiday'}</span>
          </button>
        </div>
      </form>

      {/* Configured Holidays Table */}
      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : (
        <div className="card-feature p-0 overflow-hidden border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f4f4f5]/60 dark:bg-dark-card/40 border-b border-edge/60 text-xs font-medium text-muted uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-4">Calendar Date</th>
                  <th className="text-left px-6 py-4">Festival / Reason</th>
                  <th className="text-left px-6 py-4">Telugu Description</th>
                  <th className="text-right px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/40">
                {items.map((h) => (
                  <tr key={h._id} className="hover:bg-control/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-brand-gold bg-brand-gold/10 py-1 px-3 rounded-full border border-brand-gold/30">
                        {h.date}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-ink dark:text-white text-sm">
                      {h.label}
                    </td>
                    <td className="px-6 py-4 text-muted text-xs">
                      {h.labelTe || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => del(h)}
                        className="p-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Remove holiday"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan="4" className="py-16 text-center text-muted text-sm space-y-2">
                      <div className="w-12 h-12 rounded-full bg-stage-gray/50 flex items-center justify-center mx-auto text-muted mb-2">
                        <Calendar size={20} />
                      </div>
                      <div className="font-medium text-ink dark:text-white">No holidays scheduled</div>
                      <div className="text-xs">
                        The hospital is currently open every week according to doctor shift schedules.
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
