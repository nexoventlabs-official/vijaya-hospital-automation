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
    <div className="space-y-6 max-w-6xl font-mint">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Departments</h1>
          <p className="text-sm text-soft-stone mt-1">Organize medical sections and services offered by the hospital.</p>
        </div>
        <button onClick={() => open(null)} className="btn-primary py-2.5 px-4 text-xs font-semibold">
          <Plus size={14} /> Add Department
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-pale-amber/20 text-midnight-pine border-b border-arctic-mist font-grenette text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-4">Icon</th>
                <th className="text-left px-6 py-4">Name</th>
                <th className="text-left px-6 py-4">Description</th>
                <th className="text-left px-6 py-4">Order</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-right px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arctic-mist/70">
              {items.map((d) => (
                <tr key={d._id} className="hover:bg-pale-amber/5 transition-colors duration-150">
                  <td className="px-6 py-4">
                    {d.iconUrl
                      ? <img src={d.iconUrl} alt="" className="w-10 h-10 rounded-elements object-cover border border-arctic-mist" />
                      : <div className="w-10 h-10 rounded-elements bg-pale-amber/50 flex items-center justify-center text-soft-stone border border-arctic-mist"><ImageIcon size={16} /></div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-midnight-pine text-sm">{d.name}</div>
                    <div className="text-xs text-soft-stone mt-0.5">{d.nameTe}</div>
                  </td>
                  <td className="px-6 py-4 text-soft-stone max-w-xs truncate">{d.description || '—'}</td>
                  <td className="px-6 py-4 font-medium text-midnight-pine">{d.sortOrder}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${d.active ? 'bg-pale-mint/40 text-zenith-teal border-pale-mint' : 'bg-slate-50 text-soft-stone border-arctic-mist'}`}>
                      {d.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => open(d)} className="btn-ghost py-1 px-2.5 text-xs">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => del(d)} className="btn-ghost py-1 px-2.5 text-xs text-rose-600 hover:text-rose-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-soft-stone text-sm">
                    No departments created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
              <select className="input text-sm" value={form.active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}>
                <option value="true">Yes</option>
                <option value="false">No (hidden)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Icon image (optional)</label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  id="dept-file-upload"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="dept-file-upload"
                  className="btn-secondary py-2 px-3 text-xs font-semibold cursor-pointer"
                >
                  Choose File
                </label>
                <span className="text-xs text-soft-stone">
                  {file ? file.name : 'No file chosen'}
                </span>
              </div>
            </div>
          </div>
          {err && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg mt-3 flex items-center gap-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {err}
            </div>
          )}
          <div className="flex justify-end gap-2.5 mt-6 border-t border-arctic-mist pt-4">
            <button onClick={() => setEditing(null)} className="btn-secondary py-2 px-4 text-xs font-semibold">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary py-2 px-4 text-xs font-semibold">{saving ? 'Saving…' : 'Save'}</button>
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
    <div className="fixed inset-0 bg-midnight-pine/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 shadow-xl relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-arctic-mist pb-3.5 mb-5">
          <h2 className="font-semibold text-lg text-midnight-pine font-grenette">{title}</h2>
          <button onClick={onClose} className="text-soft-stone hover:text-midnight-pine w-8 h-8 rounded-full flex items-center justify-center hover:bg-pale-mint/30 transition-colors duration-150">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
