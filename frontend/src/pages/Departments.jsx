import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, Users, X, Upload } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

const blank = {
  name: '', nameTe: '', description: '', descriptionTe: '',
  sortOrder: 0, active: true,
};

export default function Departments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/departments');
      setItems(r.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const off = subscribe('departments', () => load());
    return off;
  }, []);

  function open(item) {
    setEditing(item || 'new');
    setForm(
      item
        ? {
            name: item.name,
            nameTe: item.nameTe || '',
            description: item.description || '',
            descriptionTe: item.descriptionTe || '',
            sortOrder: item.sortOrder || 0,
            active: !!item.active,
          }
        : blank
    );
    setFile(null);
    setErr('');
  }

  async function save() {
    setSaving(true);
    setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('icon', file);
      if (editing === 'new') await api.post('/departments', fd);
      else await api.put(`/departments/${editing._id}`, fd);
      setEditing(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed. Please check fields.');
    } finally {
      setSaving(false);
    }
  }

  async function del(item) {
    if (!confirm(`Delete department "${item.name}"?`)) return;
    await api.delete(`/departments/${item._id}`);
    load();
  }

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-edge/40">
        <PairedHeading
          eyebrow="Clinical Sections."
          headline="Hospital Departments."
          description="Organize clinical units, bilingual labels, and specialty services offered to WhatsApp patients."
        />
        <button
          onClick={() => open(null)}
          className="btn-primary h-11 text-sm font-medium"
        >
          <Plus size={16} />
          <span>Add Department</span>
        </button>
      </div>

      {/* Department Table or Skeleton */}
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : (
        <div className="card-feature p-0 overflow-hidden border border-edge/50 dark:border-edge/40 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f4f4f5]/60 dark:bg-dark-card/40 border-b border-edge/60 text-xs font-medium text-muted uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-4">Icon</th>
                  <th className="text-left px-6 py-4">Department Name</th>
                  <th className="text-left px-6 py-4">Description</th>
                  <th className="text-left px-6 py-4">Order</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-right px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/40">
                {items.map((d) => (
                  <tr key={d._id} className="hover:bg-control/30 transition-colors">
                    <td className="px-6 py-4">
                      {d.iconUrl ? (
                        <img
                          src={d.iconUrl}
                          alt=""
                          className="w-11 h-11 rounded-[14px] object-cover border border-edge"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-[14px] bg-brand-tint dark:bg-dark-card text-brand-blue flex items-center justify-center border border-edge/60">
                          <Users size={18} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink dark:text-white text-sm">{d.name}</div>
                      <div className="text-xs text-muted mt-0.5">{d.nameTe || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-muted text-xs max-w-xs truncate">
                      {d.description || '—'}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-ink dark:text-white text-xs">
                      {d.sortOrder}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`badge ${
                          d.active
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-control text-muted'
                        }`}
                      >
                        {d.active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => open(d)}
                          className="p-2 rounded-full text-brand-blue hover:bg-brand-tint dark:hover:bg-brand-blue/20 transition-colors"
                          title="Edit department"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => del(d)}
                          className="p-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Remove department"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-muted text-sm space-y-2">
                      <div className="w-12 h-12 rounded-full bg-stage-gray/50 flex items-center justify-center mx-auto text-muted mb-2">
                        <Users size={20} />
                      </div>
                      <div className="font-medium text-ink dark:text-white">No departments added yet</div>
                      <div className="text-xs">
                        Create clinical departments like Cardiology, Pediatrics, General Medicine, etc.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / New Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-feature w-full max-w-lg bg-canvas dark:bg-dark-card border border-edge shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-edge/40 pb-3">
              <h3 className="text-xl font-medium text-ink dark:text-white">
                {editing === 'new' ? 'New Medical Department' : `Edit — ${editing.name}`}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-full text-muted hover:bg-control"
              >
                <X size={18} />
              </button>
            </div>

            {err && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {err}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Department Name (English) *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cardiology"
                  required
                />
              </div>

              <div>
                <label className="label">Department Name (Telugu - తెలుగు)</label>
                <input
                  className="input"
                  value={form.nameTe}
                  onChange={(e) => setForm({ ...form, nameTe: e.target.value })}
                  placeholder="e.g. కార్డియాలజీ"
                />
              </div>

              <div>
                <label className="label">Short Description</label>
                <textarea
                  className="input h-20 py-2.5 resize-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Clinical services and outpatient hours"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Display Order</label>
                  <input
                    type="number"
                    className="input"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">WhatsApp Active</label>
                  <select
                    className="input"
                    value={form.active ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Hidden</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Section Icon</label>
                <input
                  type="file"
                  accept="image/*"
                  id="dept-icon-file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="dept-icon-file"
                  className="btn-secondary h-10 px-4 text-xs font-semibold cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={14} />
                  <span>{file ? file.name : 'Upload Section Icon'}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-edge/40">
              <button
                onClick={() => setEditing(null)}
                className="btn-secondary h-11 px-5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary h-11 px-6 text-xs"
              >
                {saving ? 'Saving…' : 'Save Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
