import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api';
import { close as closeRealtime } from './realtime';
import { ThemeProvider } from './components/ThemeContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Departments from './pages/Departments.jsx';
import Doctors from './pages/Doctors.jsx';
import DoctorEdit from './pages/DoctorEdit.jsx';
import Holidays from './pages/Holidays.jsx';
import FlowImages from './pages/FlowImages.jsx';
import Settings from './pages/Settings.jsx';
import Appointments from './pages/Appointments.jsx';
import AppointmentDetails from './pages/AppointmentDetails.jsx';
import CreateAdmin from './pages/CreateAdmin.jsx';
import Plans from './pages/Plans.jsx';
import PlanHistory from './pages/PlanHistory.jsx';
import Purchase from './pages/Purchase.jsx';
import TranslucentWings from './components/TranslucentWings.jsx';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vh_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/verify')
      .then((r) => setAuth(r.data.user || null))
      .catch(() => {
        localStorage.removeItem('vh_token');
        closeRealtime();
        setAuth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-canvas relative overflow-hidden font-effra">
        <TranslucentWings />
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-[22px] bg-brand-blue text-white flex items-center justify-center text-2xl font-bold shadow-glow-blue animate-bounce">
            +
          </div>
          <div className="text-xl font-medium tracking-tight text-ink">
            Vijya Hospital
          </div>
          <div className="flex items-center gap-2 text-xs text-muted font-medium bg-control py-1.5 px-4 rounded-full border border-edge/50">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-ping" />
            Initializing Care Theatre…
          </div>
        </div>
      </div>
    );
  }

  const isSuper = auth?.role === 'superadmin';

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={auth ? <Navigate to="/" replace /> : <Login setAuth={setAuth} />} />
          <Route path="/" element={auth ? <Layout user={auth} setAuth={setAuth} /> : <Navigate to="/login" replace />}>
            <Route index element={<Dashboard />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="appointments/:id" element={<AppointmentDetails />} />
            <Route path="departments" element={<Departments />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="doctors/new" element={<DoctorEdit />} />
            <Route path="doctors/:id" element={<DoctorEdit />} />
            <Route path="holidays" element={<Holidays />} />
            <Route
              path="flow-images"
              element={isSuper ? <FlowImages /> : <Navigate to="/" replace />}
            />
            <Route path="settings" element={<Settings user={auth} />} />
            <Route path="create-admin" element={isSuper ? <CreateAdmin /> : <Navigate to="/" replace />} />
            <Route path="plans" element={isSuper ? <Plans /> : <Navigate to="/" replace />} />
            <Route path="plan-history" element={isSuper ? <PlanHistory /> : <Navigate to="/" replace />} />
            <Route path="purchase" element={!isSuper ? <Purchase /> : <Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
