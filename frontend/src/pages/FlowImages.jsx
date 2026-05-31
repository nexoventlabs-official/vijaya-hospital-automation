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
    <div className="space-y-6 max-w-6xl font-mint">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-midnight-pine font-grenette">Flow Images</h1>
        <p className="text-sm text-soft-stone mt-1">
          Configure assets utilized by the WhatsApp chatbot and flow systems. Banners are 1000×125, icons 200×200.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((it) => (
          <div key={it.key} className="card p-5 flex flex-col justify-between hover:border-zenith-teal/50 hover:bg-pale-amber/10 transition-all duration-300">
            <div>
              <div className="text-xs font-mono font-semibold text-soft-stone tracking-wide bg-pale-amber/50 py-1 px-2.5 rounded border border-arctic-mist/40 inline-block mb-3">
                {it.key}
              </div>
              <div className="text-sm font-semibold text-midnight-pine mb-3 font-grenette">{it.label || ''}</div>
              <div className="bg-pale-amber/30 border border-arctic-mist rounded-elements flex items-center justify-center h-32 mb-4 overflow-hidden relative group">
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.key} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <ImageIcon size={24} className="text-soft-stone/40" />
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 border-t border-arctic-mist/60 pt-3.5 mt-2">
              <input
                type="file" accept="image/*" hidden
                ref={(el) => (inputs.current[it.key] = el)}
                onChange={(e) => upload(it.key, e.target.files?.[0])}
              />
              <button
                onClick={() => inputs.current[it.key]?.click()}
                className="btn-secondary py-2 px-3.5 text-xs font-semibold flex-1"
              >
                <Upload size={13} /> Upload Asset
              </button>
              {it.imageUrl && (
                <button
                  onClick={() => clear(it.key)}
                  className="btn-ghost py-2 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
