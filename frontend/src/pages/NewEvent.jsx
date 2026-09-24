import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function NewEvent() {
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const create = async (e) => {
    e.preventDefault();
    setErr('');
    if (!title || !date) {
      setErr('Title and date are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/events', { title: title, venue: venue, date: date, category: category });
      nav('/events/' + res.data._id);
    } catch (e) {
      setErr((e.response && e.response.data && e.response.data.msg) || 'failed');
      setLoading(false);
    }
  };

  return (
    <div>
      <span className="badge">Form 01</span>
      <h1 style={{ marginTop: '0.6rem' }}>Create an event</h1>
      <p className="muted">Takes under a minute. You'll get an invite link right after.</p>
      <div className="grid-main" style={{ marginTop: '1.25rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <form onSubmit={create}>
            <label>Title *</label>
            <input placeholder="e.g. HackNight — Final showcase" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="form-row">
              <div>
                <label>Venue</label>
                <input placeholder="Seminar Hall B" value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>
              <div>
                <label>Date *</label>
                <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Pick one (optional)</option>
              <option value="MUSIC">Music</option>
              <option value="TECH">Tech</option>
              <option value="FOOD">Food</option>
              <option value="MEETUP">Meetup</option>
              <option value="WORKSHOP">Workshop</option>
            </select>
            {err && <p className="error">{err}</p>}
            <div className="actions">
              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create event →'}
              </button>
              <Link to="/" className="btn outline">Cancel</Link>
            </div>
          </form>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-top"><h3>What happens next</h3></div>
          <p className="muted">1. You become the event owner.</p>
          <p className="muted">2. Share the invite link — attendees verify by email OTP.</p>
          <p className="muted">3. Invite coordinators and volunteers to your team.</p>
          <p className="muted">4. Scan QRs at the gate. Doubles are blocked.</p>
        </div>
      </div>
    </div>
  );
}
