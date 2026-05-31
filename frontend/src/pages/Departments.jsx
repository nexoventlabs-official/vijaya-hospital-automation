import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';

const blank = { name: '', nameTe: '', description: '', descriptionTe: '', sortOrder: 0, active: true };

export default function Departments() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    const r = await api.get('/departments');
    setItems(r.data);
  }
  useEffect(() => {
    load();
    const off = subscribe('departments', () => load());
    return off;
  }, []);

  function open(item) {
    setEditing(item || 'new');
    setForm(item ? {
      name: item.name, nameTe: item.nameTe || '',
      description: item.description || '', descriptionTe: item.descriptionTe || '',
      sortOrder: item.sortOrder || 0, active: !!item.active,
    } : blank);
    setFile(null);
    setErr('');
  }

  async function save() {
    setSaving(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('icon', file);
      if (editing === 'new') await api.post('/departments', fd);
      else await api.put(`/departments/${editing._id}`, fd);
      setEditing(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  async function del(item) {
    if (!confirm(`Delete department "${item.name}"?`)) return;
    await api.delete(`/departments/${item._id}`);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">Departments</h1>
        <button onClick={() => open(null)} className="btn-primary"><Plus size={16} /> Add Department</button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Icon</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Order</th>
              <th className="text-left px-4 py-3">Active</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((d) => (
              <tr key={d._id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  {d.iconUrl
                    ? <img src={d.iconUrl} alt="" className="w-9 h-9 rounded object-cover" />
                    : <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon size={16} /></div>}
                </td>
                <td className="px-4 py-3 font-medium">{d.name}<div className="text-xs text-slate-500">{d.nameTe}</div></td>
                <td className="px-4 py-3 text-slate-600">{d.description}</td>
                <td className="px-4 py-3">{d.sortOrder}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${d.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {d.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => open(d)} className="btn-ghost"><Pencil size={14} /></button>
                  <button onClick={() => del(d)} className="btn-ghost text-rose-600"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan="6" className="text-center py-8 text-slate-500">No departments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing === 'new' ? 'New Department' : 'Edit Department'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name (English) *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Name (Telugu)" value={form.nameTe} onChange={(v) => setForm({ ...form, nameTe: v })} />
            <Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            <Input label="Description (Telugu)" value={form.descriptionTe} onChange={(v) => setForm({ ...form, descriptionTe: v })} />
            <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(v) => setForm({ ...form, sortOrder: v })} />
            <div>
              <label className="label">Active</label>
              <select className="input" value={form.active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}>
                <option value="true">Yes</option>
                <option value="false">No (hidden)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Icon image (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          {err && <div className="text-sm text-rose-600 mt-3">{err}</div>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
