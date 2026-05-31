import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const r = await api.post('/auth/login', { username, password });
      localStorage.setItem('vh_token', r.data.token);
      setAuth(r.data.user);
      nav('/', { replace: true });
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-midnight-pine via-warm-berry to-zenith-teal font-mint p-4 relative overflow-hidden">
      {/* Decorative background visual glow */}
      <div className="absolute w-96 h-96 rounded-full bg-soft-magenta/10 blur-3xl -top-20 -left-20 pointer-events-none"></div>
      <div className="absolute w-96 h-96 rounded-full bg-pale-mint/10 blur-3xl -bottom-20 -right-20 pointer-events-none"></div>
      
      <form onSubmit={submit} className="card w-full max-w-sm p-8 space-y-5 bg-canvas-white shadow-2xl border-none relative z-10 animate-fade-in">
        <div className="text-center">
          <div className="text-3xl font-bold text-midnight-pine font-grenette tracking-wide">Vijya Hospital</div>
          <div className="text-xs font-medium text-soft-stone mt-1.5 uppercase tracking-widest">Admin Control Panel</div>
        </div>
        
        <div className="space-y-4 pt-2">
          <div>
            <label className="label">Username / Mobile</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter mobile or username" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
        </div>

        {err && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 animate-shake">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{err}</span>
          </div>
        )}

        <button className="btn-primary w-full py-3.5 mt-2 text-sm font-semibold tracking-wide hover:bg-ocean-glimmer" disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in…
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </div>
  );
}
