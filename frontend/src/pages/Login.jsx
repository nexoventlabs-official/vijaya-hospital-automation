import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ShieldCheck, Heart, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '../api';
import TranslucentWings from '../components/TranslucentWings.jsx';
import PairedHeading from '../components/PairedHeading.jsx';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { username, password });
      localStorage.setItem('vh_token', r.data.token);
      setAuth(r.data.user);
      nav('/', { replace: true });
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-dark-canvas text-ink dark:text-white flex flex-col justify-between font-effra relative overflow-hidden">
      {/* Signature Translucent Candy Wings */}
      <TranslucentWings />

      {/* Main Hero & Login Theater Stage */}
      <div className="relative z-10 w-full max-w-[1024px] mx-auto px-4 sm:px-8 pt-12 md:pt-20 pb-16 flex flex-col items-center">
        {/* Product Identity Lockup */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-[24px] bg-brand-blue text-white flex items-center justify-center text-3xl font-bold shadow-glow-blue mb-4">
            +
          </div>
          <div className="text-sm font-medium uppercase tracking-widest text-brand-blue">
            Vijya Hospital Console
          </div>
        </div>

        {/* Paired Chapter Headline */}
        <PairedHeading
          align="center"
          size="hero"
          eyebrow="Healthcare Automation."
          headline="Pure Patient Delight."
          description="Seamless WhatsApp appointment booking, instant PDF receipts, and real-time clinical workflows for modern hospital teams."
        />

        {/* Login App Card Shell */}
        <div className="w-full max-w-[440px] mt-10">
          <div className="card-feature border border-edge/60 dark:border-edge bg-canvas dark:bg-dark-card shadow-theater relative">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="label">Username or Mobile Number</label>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 9876543210 or admin"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Access Password</label>
                </div>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              {err && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-[14px] text-xs font-medium text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full text-base font-medium shadow-glow-blue"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Authenticating…</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>Enter Care Console</span>
                      <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Quick feature highlights inside card footer */}
            <div className="mt-8 pt-6 border-t border-edge/40 dark:border-edge/50 flex items-center justify-around text-xs text-muted dark:text-dark-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Meta API Ready</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-brand-blue" />
                <span>End-to-End Encrypted</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-brand-gold" />
                <span>24/7 Flow</span>
              </span>
            </div>
          </div>
        </div>

        {/* Feature Intermission Band: 3 Floating vignettes */}
        <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="card-feature text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-sky/15 text-brand-sky flex items-center justify-center mb-4">
              <MessageCircle size={22} />
            </div>
            <h4 className="font-medium text-lg text-ink dark:text-white">WhatsApp Bot</h4>
            <p className="text-xs text-muted dark:text-dark-muted mt-1 leading-relaxed">
              Patients book in 3 steps in English or Telugu without human intervention.
            </p>
          </div>

          <div className="card-feature text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-violet/15 text-brand-violet flex items-center justify-center mb-4">
              <Sparkles size={22} />
            </div>
            <h4 className="font-medium text-lg text-ink dark:text-white">Smart Rescheduling</h4>
            <p className="text-xs text-muted dark:text-dark-muted mt-1 leading-relaxed">
              Doctor absent? Auto-postpone appointments and WhatsApp notify patients immediately.
            </p>
          </div>

          <div className="card-feature text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-4">
              <ShieldCheck size={22} />
            </div>
            <h4 className="font-medium text-lg text-ink dark:text-white">Instant PDF Slips</h4>
            <p className="text-xs text-muted dark:text-dark-muted mt-1 leading-relaxed">
              In-memory generated consultation passes and hospital navigation links.
            </p>
          </div>
        </div>
      </div>

      {/* Mini footer */}
      <footer className="relative z-10 w-full py-6 text-center text-xs text-muted dark:text-dark-muted border-t border-edge/40">
        © {new Date().getFullYear()} Vijya Hospital Console · Built with Colorful App Theatre Language
      </footer>
    </div>
  );
}
