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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900">
      <form onSubmit={submit} className="card w-full max-w-sm p-8 space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-900">Vijya Hospital</div>
          <div className="text-sm text-slate-500">Admin login</div>
        </div>
        <div>
          <label className="label">Username / Mobile</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
