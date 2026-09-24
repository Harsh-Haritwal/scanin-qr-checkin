import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EventDetail from './pages/EventDetail.jsx';
import PublicRegister from './pages/PublicRegister.jsx';
import MyTicket from './pages/MyTicket.jsx';
import Scan from './pages/Scan.jsx';

function SiteHeader() {
  const nav = useNavigate();
  const loc = useLocation();
  const token = localStorage.getItem('token');
  const logout = () => { localStorage.removeItem('token'); nav('/login'); };
  if (loc.pathname.startsWith('/r/') || loc.pathname.startsWith('/t/')) return null;
  const active = (p) => (loc.pathname === p ? 'active' : '');
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" className="brand">
            <span className="brand-mark">◩</span>
            <span>ScanIn</span>
          </Link>
          <nav className="main-nav">
            <Link to="/" className={active('/')}>Events</Link>
            <a href="/#how-it-works">Docs</a>
          </nav>
        </div>
        <div className="header-actions">
          {token
            ? <button onClick={logout} className="btn ghost">Sign out</button>
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
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/r/:eventId" element={<PublicRegister />} />
          <Route path="/t/:code" element={<MyTicket />} />
          <Route path="/scan/:eventId" element={<Scan />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
