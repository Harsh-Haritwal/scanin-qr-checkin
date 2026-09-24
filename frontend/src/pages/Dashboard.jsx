import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const CAT_CLASS = {
  MUSIC: 'cat-yellow',
  TECH: 'cat-blue',
  FOOD: 'cat-purple',
  MEETUP: 'cat-green',
  WORKSHOP: 'cat-orange'
};

function catClass(c) {
  return CAT_CLASS[String(c || '').toUpperCase()] || 'cat-gray';
}

function fmtDay(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

function fmtGate(d) {
  const h = new Date(d).toLocaleTimeString('en-US', { hour: 'numeric' }).toLowerCase().replace(' ', '');
  return h + ' gates';
}

function saleState(ev, pct) {
  if (!ev.isActive) return { txt: 'Closed', cls: 'st-closed' };
  if (pct >= 90) return { txt: 'Almost full', cls: 'st-full' };
  return { txt: 'On sale', cls: 'st-open' };
}

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [showAll, setShowAll] = useState(false);
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

  const live = events.find((e) => e.isActive) || events[0] || null;
  const checked = events.reduce((a, e) => a + (e.checked || 0), 0);
  const today = events.reduce((a, e) => a + (e.checkedToday || 0), 0);
  const left = events.reduce((a, e) => a + Math.max((e.total || 0) - (e.checked || 0), 0), 0);
  const gateOpen = events.some((e) => e.isActive);
  const listed = showAll ? events : events.slice(0, 3);

  return (
    <div>
      {live && (
        <div className="dash-top">
          <div className="live-card">
            <span className="deco deco-green"></span>
            <span className="deco deco-red"></span>
            <div className="now-live">Now live</div>
            <h1>{live.title}</h1>
            <p>{live.description || 'Gates are open. Scan QR tickets at the door.'}</p>
            <p className="live-meta">
              {[live.venue, fmtDay(live.date), fmtGate(live.date)].filter(Boolean).join(' · ')}
            </p>
            <div className="actions">
              <Link to={'/scan/' + live._id} className="btn">Open scanner</Link>
              <a href={'/events/' + live._id + '#team'} className="btn dark-ghost">Manage team</a>
            </div>
          </div>
          <div className="tiles">
            <div className="tile tile-green">
              <small>Checked in</small>
              <div className="big">{checked.toLocaleString()}</div>
            </div>
            <div className="tile tile-blue">
              <small>Scanned today</small>
              <div className="big">{today.toLocaleString()}</div>
            </div>
            <div className="tile tile-red">
              <small>Tickets left</small>
              <div className="big">{left.toLocaleString()}</div>
            </div>
            <div className="tile tile-yellow">
              <small>Gate status</small>
              <div className="big small-big">{gateOpen ? 'Open & steady' : 'All closed'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="upcoming-head">
        <h2>Upcoming events</h2>
        {events.length > 3 && (
          <button className="linklike" onClick={() => setShowAll((s) => !s)}>
            {showAll ? 'Show less' : 'View all'}
          </button>
        )}
      </div>

      <div className="events">
        {listed.map((ev) => {
          const pct = ev.total ? Math.round((ev.checked / ev.total) * 100) : 0;
          const st = saleState(ev, pct);
          const soldTxt = pct + '% sold';
          return (
            <Link key={ev._id} to={'/events/' + ev._id} className="ev-card">
              <div className="ev-top">
                {ev.category
                  ? <span className={'cat-pill ' + catClass(ev.category)}>{ev.category}</span>
                  : <span className="cat-pill cat-gray">Event</span>}
                <span className="muted">{fmtDay(ev.date)}</span>
              </div>
              <h3>{ev.title}</h3>
              <p className="muted">{ev.venue ? ev.venue + ', ' + fmtGate(ev.date) : fmtGate(ev.date)}</p>
              <div className="sold-row">
                <b>{soldTxt}</b>
                <span className={st.cls}>{st.txt}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="card">
          <p className="muted">No events yet.</p>
          <div className="actions">
            <Link to="/events/new" className="btn small">Create your first event →</Link>
            <Link to="/how-it-works" className="btn small outline">How it works</Link>
          </div>
        </div>
      )}
    </div>
  );
}
