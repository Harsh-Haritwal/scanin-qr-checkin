import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import api from './api';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewEvent from './pages/NewEvent.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import EventDetail from './pages/EventDetail.jsx';
import PublicRegister from './pages/PublicRegister.jsx';
import MyTicket from './pages/MyTicket.jsx';
import Scan from './pages/Scan.jsx';

function SiteHeader() {
  const nav = useNavigate();
  const loc = useLocation();
  const token = localStorage.getItem('token');
  const [firstId, setFirstId] = useState('');
  const logout = () => { localStorage.removeItem('token'); nav('/login'); };

  let myLabel = 'STAFF';
  try {
    const payload = JSON.parse(atob((token || '').split('.')[1]));
    if (payload.role === 'admin') myLabel = 'ORGANIZER';
  } catch (e) {}

  useEffect(() => {
    if (!token) return;
    api.get('/api/events').then((r) => {
      if (r.data && r.data.length > 0) setFirstId(r.data[0]._id);
    }).catch(() => {});
  }, [token, loc.pathname]);

  if (loc.pathname.startsWith('/r/') || loc.pathname.startsWith('/t/')) return null;
  const active = (p) => (loc.pathname === p ? 'active' : '');
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" className="brand">
            <span className="brand-mark">S</span>
            <span>ScanIn</span>
          </Link>
          <nav className="main-nav">
            <Link to="/" className={active('/')}>Events</Link>
            {firstId
              ? <><a href={'/events/' + firstId + '#team'}>Team</a><a href={'/events/' + firstId + '#tickets'}>Tickets</a></>
              : <><Link to="/how-it-works">Team</Link><Link to="/how-it-works">Tickets</Link></>}
          </nav>
        </div>
        <div className="header-actions">
          {token
            ? (
              <>
                <span className="muted" style={{ fontSize: '0.8rem', letterSpacing: '0.1em' }}>{myLabel}</span>
                <Link to="/events/new" className="btn icon" title="New event">✎</Link>
                <button onClick={logout} className="btn ghost">Sign out</button>
              </>
            )
            : (
              <>
                <Link to="/login" className="btn ghost">Sign in</Link>
                <Link to="/login" className="btn">Get started</Link>
              </>
            )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteHeader />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/events/new" element={<NewEvent />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/r/:eventId" element={<PublicRegister />} />
          <Route path="/t/:code" element={<MyTicket />} />
          <Route path="/scan/:eventId" element={<Scan />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
