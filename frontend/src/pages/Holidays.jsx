import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';

export default function Holidays() {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState('');
  const [labelTe, setLabelTe] = useState('');

  async function load() {
    const r = await api.get('/holidays');
    setItems(r.data);
  }
  useEffect(() => {
    load();
    const off = subscribe('holidays', () => load());
    return off;
  }, []);

  async function add() {
    if (!date || !label) return;
    await api.post('/holidays', { date, label, labelTe });
    setLabel(''); setLabelTe('');
    load();
  }

  async function del(item) {
    if (!confirm(`Delete holiday ${item.label}?`)) return;
    await api.delete(`/holidays/${item._id}`);
    load();
  }

  return (
    <div className="space-y-6 max-w-5xl font-mint">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Holidays</h1>
        <p className="text-sm text-soft-stone mt-1">Configure calendar exceptions when bookings are disabled at the hospital.</p>
      </div>

      <div className="card p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-pale-amber/10 border border-arctic-mist">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Label (English)</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Diwali" />
        </div>
        <div>
          <label className="label">Label (Telugu)</label>
          <input className="input" value={labelTe} onChange={(e) => setLabelTe(e.target.value)} placeholder="దీపావళి" />
        </div>
        <button onClick={add} className="btn-primary py-2.5 px-4 text-xs font-semibold w-full">
          <Plus size={14} /> Add Holiday
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-pale-amber/20 text-midnight-pine border-b border-arctic-mist font-grenette text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-4">Date</th>
                <th className="text-left px-6 py-4">Label</th>
                <th className="text-left px-6 py-4">Telugu Label</th>
                <th className="text-right px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arctic-mist/70">
              {items.map((h) => (
                <tr key={h._id} className="hover:bg-pale-amber/5 transition-colors duration-150">
                  <td className="px-6 py-4 font-mono font-medium text-midnight-pine">{h.date}</td>
                  <td className="px-6 py-4 font-semibold text-midnight-pine text-sm">{h.label}</td>
                  <td className="px-6 py-4 text-soft-stone">{h.labelTe || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => del(h)} className="btn-ghost py-1.5 px-2.5 text-xs text-rose-600 hover:text-rose-700">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-soft-stone text-sm">
                    No holidays configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
