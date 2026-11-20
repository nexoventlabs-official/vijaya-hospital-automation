import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { subscribe } from '../realtime';
import PairedHeading from '../components/PairedHeading.jsx';
import { SkeletonStats } from '../components/Skeleton.jsx';

export default function FlowImages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const inputs = useRef({});

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/flow-images');
      setItems(r.data || []);
    } finally {
      setLoading(false);
    }
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
    if (!confirm(`Remove image asset for "${key}"?`)) return;
    await api.delete(`/flow-images/${key}`);
    load();
  }

  return (
    <div className="space-y-8">
      {/* Paired Chapter Heading */}
      <PairedHeading
        eyebrow="Meta Flow Assets."
        headline="WhatsApp Media & Banners."
        description="Configure banner graphics and section icons rendered inside the WhatsApp mobile flow interactive screens."
      />

      {/* Saturated Proof Intermission Info Band */}
      <div className="rounded-[24px] bg-[#edf5ff] dark:bg-dark-card p-6 border border-brand-blue/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center flex-shrink-0 shadow-glow-blue">
            <Sparkles size={18} />
          </div>
          <div className="text-xs sm:text-sm text-ink dark:text-white">
            Recommended Dimensions: <strong>1000×125 px</strong> for wide header banners, and <strong>200×200 px</strong> for square list icons.
          </div>
        </div>
        <div className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-xs flex-shrink-0">
          WhatsApp Flow v3 Ready
        </div>
      </div>

      {/* Asset Cards Grid */}
      {loading ? (
        <SkeletonStats count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => (
            <div
              key={it.key}
              className="card-feature p-6 flex flex-col justify-between border border-edge/50 dark:border-edge/40 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-semibold text-brand-blue bg-brand-tint dark:bg-brand-blue/20 py-1 px-3 rounded-full border border-brand-blue/30">
                    {it.key}
                  </span>
                  <span className="text-[11px] text-muted font-medium">
                    {it.imageUrl ? 'Uploaded' : 'Default Asset'}
                  </span>
                </div>

                <h3 className="font-medium text-base text-ink dark:text-white mb-3">
                  {it.label || it.key}
                </h3>

                {/* Preview Theater Screen */}
                <div className="w-full h-36 rounded-[18px] bg-control dark:bg-dark-canvas border border-edge/60 overflow-hidden flex items-center justify-center relative group">
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.key}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted">
                      <ImageIcon size={28} />
                      <span className="text-xs font-medium">No Custom Graphic</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-edge/40 flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={(el) => (inputs.current[it.key] = el)}
                  onChange={(e) => upload(it.key, e.target.files?.[0])}
                />
                <button
                  onClick={() => inputs.current[it.key]?.click()}
                  className="btn-secondary h-10 px-4 text-xs font-semibold flex-1"
                >
                  <Upload size={14} />
                  <span>Upload Asset</span>
                </button>
                {it.imageUrl && (
                  <button
                    onClick={() => clear(it.key)}
                    className="p-2.5 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Remove asset"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
