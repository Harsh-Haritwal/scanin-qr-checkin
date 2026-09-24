import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const nav = useNavigate();

  const load = async () => {
    try {
      const res = await api.get('/api/events');
      setEvents(res.data);
    } catch (e) {
      if (e.response && e.response.status === 401) nav('/login');
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!title || !date) return alert('title + date needed');
    await api.post('/api/events', { title: title, venue: venue, date: date });
    setTitle('');
    setVenue('');
    setDate('');
    load();
  };

  const issued = events.reduce((a, e) => a + (e.total || 0), 0);
  const checked = events.reduce((a, e) => a + (e.checked || 0), 0);
  const rate = issued ? Math.round((checked / issued) * 100) : 0;

  return (
    <div>
      <div className="card hero">
        <span className="badge">✦ Gate check-in, without the spreadsheet</span>
        <h1 style={{ marginTop: '1rem' }}>Door entry your volunteers actually enjoy</h1>
        <p className="sub">
          Create an event, share one link, and stamp QR tickets at the gate.
          No double entry, live counts, works from any phone browser.
        </p>
        <div className="hero-cta">
          <a href="#new-event" className="btn lg">Create event →</a>
          <a href="#how-it-works" className="btn lg outline">How it works</a>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <small>Events</small>
          <div className="num">{events.length}</div>
        </div>
        <div className="stat">
          <small>Tickets issued</small>
          <div className="num">{issued}</div>
        </div>
        <div className="stat">
          <small>Check-in rate</small>
          <div className="num">{rate + '%'}</div>
        </div>
      </div>

      <div className="card" id="how-it-works">
        <div className="card-top">
          <h3>How it works</h3>
          <span className="badge">3 steps</span>
        </div>
        <div className="stat-grid">
          <div>
            <h3>1. Create event</h3>
            <p className="muted">Add a title, venue and date. Takes under a minute.</p>
          </div>
          <div>
            <h3>2. Share the link</h3>
            <p className="muted">Attendees register themselves and get a QR ticket. No login needed.</p>
          </div>
          <div>
            <h3>3. Scan at the gate</h3>
            <p className="muted">Volunteers scan with any phone camera. Double scans are blocked automatically.</p>
          </div>
        </div>
      </div>

      <div className="card" id="new-event" style={{ marginTop: '1rem' }}>
        <div className="card-top">
          <h3>New event</h3>
          <span className="badge">Form 01</span>
        </div>
        <p className="muted">Takes under a minute. Share the invite link right after.</p>
        <form onSubmit={create} style={{ marginTop: '0.75rem' }}>
          <label>Title</label>
          <input placeholder="e.g. HackNight — Final showcase" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="form-row">
            <div>
              <label>Venue</label>
              <input placeholder="Seminar Hall B" value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <div>
              <label>Date</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="actions">
            <button className="btn" type="submit">Create event</button>
          </div>
        </form>
      </div>

      <h2 className="section-title">Events ({events.length})</h2>
      <div className="events">
        {events.map((ev) => {
          const pct = ev.total ? Math.round((ev.checked / ev.total) * 100) : 0;
          const badgeCls = ev.isActive ? 'badge open' : 'badge closed';
          const badgeTxt = ev.isActive ? 'Open' : 'Closed';
          return (
            <div key={ev._id} className="card" style={{ marginBottom: 0 }}>
              <div className="card-top">
                <span className={badgeCls}>{badgeTxt}</span>
                <span className="muted mono" style={{ fontSize: '0.85rem' }}>{ev.checked}/{ev.total}</span>
              </div>
              <h3 style={{ marginTop: '0.5rem' }}>{ev.title}</h3>
              <p className="muted">{new Date(ev.date).toLocaleString()} · {ev.venue || '—'}</p>
              <div className="progress"><div style={{ width: pct + '%' }} /></div>
              <p className="muted" style={{ fontSize: '0.9rem' }}>{pct + '%'} checked in</p>
              <div className="actions">
                <Link to={'/events/' + ev._id} className="btn small">Open</Link>
                <Link to={'/scan/' + ev._id} className="btn small outline">Scan</Link>
                <Link to={'/r/' + ev._id} className="btn small ghost">Invite →</Link>
              </div>
            </div>
          );
        })}
      </div>
      {events.length === 0 && (
        <div className="card"><p className="muted">No events yet. Create your first one above.</p></div>
      )}
    </div>
  );
}
