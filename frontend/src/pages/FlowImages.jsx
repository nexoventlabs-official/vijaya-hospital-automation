import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';

export default function FlowImages() {
  const [items, setItems] = useState([]);
  const inputs = useRef({});

  async function load() {
    const r = await api.get('/flow-images');
    setItems(r.data);
  }
  useEffect(() => {
    load();
    const off = subscribe('flow-images', () => load());
    return off;
  }, []);

  async function upload(key, file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    await api.put(`/flow-images/${key}`, fd);
    load();
  }

  async function clear(key) {
    if (!confirm('Remove this image?')) return;
    await api.delete(`/flow-images/${key}`);
    load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">Flow Images</h1>
      <p className="text-sm text-slate-600">
        Configure every image / icon used by the WhatsApp chatbot and Flow. Banners are 1000×125, icons 200×200.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.key} className="card p-4">
            <div className="text-xs text-slate-500 font-mono mb-1">{it.key}</div>
            <div className="text-sm font-medium mb-2">{it.label || ''}</div>
            <div className="bg-slate-100 rounded-lg flex items-center justify-center h-32 mb-3 overflow-hidden">
              {it.imageUrl
                ? <img src={it.imageUrl} alt={it.key} className="object-cover w-full h-full" />
                : <ImageIcon className="text-slate-400" />}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file" accept="image/*" hidden
                ref={(el) => (inputs.current[it.key] = el)}
                onChange={(e) => upload(it.key, e.target.files?.[0])}
              />
              <button onClick={() => inputs.current[it.key]?.click()} className="btn-secondary flex-1"><Upload size={14} /> Upload</button>
              {it.imageUrl && <button onClick={() => clear(it.key)} className="btn-ghost text-rose-600"><Trash2 size={14} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
