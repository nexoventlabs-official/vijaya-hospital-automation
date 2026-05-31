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
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">Holidays</h1>
      <p className="text-sm text-slate-600">Days when no appointments can be booked at the hospital.</p>

      <div className="card p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
        <button onClick={add} className="btn-primary"><Plus size={16} /> Add Holiday</button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Label</th>
              <th className="text-left px-4 py-3">Telugu</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((h) => (
              <tr key={h._id}>
                <td className="px-4 py-3 font-medium">{h.date}</td>
                <td className="px-4 py-3">{h.label}</td>
                <td className="px-4 py-3 text-slate-500">{h.labelTe}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del(h)} className="btn-ghost text-rose-600"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="4" className="text-center py-8 text-slate-500">No holidays configured.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
