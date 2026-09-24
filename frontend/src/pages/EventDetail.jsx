import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function EventDetail() {
  const { id } = useParams();
  const [ev, setEv] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('');
  const [walkErr, setWalkErr] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('volunteer');
  const [teamErr, setTeamErr] = useState('');
  const [teamOk, setTeamOk] = useState('');

  let selfId = '';
  try {
    const tok = localStorage.getItem('token') || '';
    selfId = JSON.parse(atob(tok.split('.')[1])).id || '';
  } catch (e) {}

  const load = async () => {
    const res = await api.get('/api/events/' + id);
    setEv(res.data);
    const t = await api.get('/api/tickets/event/' + id, { params: { search: search } });
    setTickets(t.data);
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (ev) {
        api.get('/api/tickets/event/' + id, { params: { search: search } }).then((r) => setTickets(r.data));
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const addWalkin = async (e) => {
    e.preventDefault();
    setWalkErr('');
    try {
      await api.post('/api/tickets/event/' + id, {
        attendeeName: name,
        attendeeEmail: email,
        mobileNo: mobile,
        age: age
      });
      setName('');
      setEmail('');
      setMobile('');
      setAge('');
      load();
    } catch (err) {
      setWalkErr((err.response && err.response.data && err.response.data.msg) || 'failed');
    }
  };

  const closeEvent = async () => {
    await api.put('/api/events/' + id, { isActive: false });
    load();
  };

  const invite = async (e) => {
    e.preventDefault();
    setTeamErr('');
    setTeamOk('');
    try {
      await api.post('/api/events/' + id + '/team', { email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      setInviteRole('volunteer');
      setTeamOk('Saved. They show below, or under pending until they sign up.');
      load();
    } catch (err) {
      setTeamErr((err.response && err.response.data && err.response.data.msg) || 'failed');
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Remove this person from the team?')) return;
    setTeamErr('');
    try {
      await api.delete('/api/events/' + id + '/team', { data: { userId: userId } });
      load();
    } catch (err) {
      setTeamErr((err.response && err.response.data && err.response.data.msg) || 'failed');
    }
  };

  const removePending = async (emailAddr) => {
    setTeamErr('');
    try {
      await api.delete('/api/events/' + id + '/team', { data: { email: emailAddr } });
      load();
    } catch (err) {
      setTeamErr((err.response && err.response.data && err.response.data.msg) || 'failed');
    }
  };

  if (!ev) return <p className="muted">Loading…</p>;

  const publicLink = window.location.origin + '/r/' + ev._id;
  const total = ev.total || 0;
  const checked = ev.checked || 0;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const badgeCls = ev.isActive ? 'badge open' : 'badge closed';
  const badgeTxt = ev.isActive ? 'Open' : 'Closed';

  return (
    <div>
      <span className={badgeCls}>{badgeTxt}</span>
      <h1 style={{ marginTop: '0.5rem' }}>{ev.title}</h1>
      <p className="muted">{ev.venue} · {new Date(ev.date).toLocaleString()}</p>

      <div className="stat-grid">
        <div className="stat"><small>Issued</small><div className="num">{total}</div></div>
        <div className="stat"><small>Checked in</small><div className="num">{checked}</div></div>
        <div className="stat"><small>Rate</small><div className="num">{pct + '%'}</div></div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-top"><h3>Invite link</h3></div>
        <p className="muted">Share this anywhere. No login needed for attendees.</p>
        <p className="mono" style={{ marginTop: '0.5rem' }}>
          <a href={publicLink} target="_blank" rel="noreferrer">{publicLink}</a>
        </p>
        <div className="actions">
          <button className="btn small outline" onClick={() => navigator.clipboard.writeText(publicLink)}>Copy link</button>
          <Link to={'/scan/' + ev._id} className="btn small">Open scanner →</Link>
          {ev.isActive && <button onClick={closeEvent} className="btn small ghost">Close event</button>}
        </div>
        <div className="progress"><div style={{ width: pct + '%' }} /></div>
      </div>

      <div className="grid-main">
      <div className="card" id="team">
        <div className="card-top">
          <h3>Team ({ev.team ? ev.team.members.length : 0})</h3>
          {ev.myRole && <span className="badge">You: {ev.myRole}</span>}
        </div>
        <p className="muted">Everyone here can open this event and scan. Owners manage the team.</p>
        <table>
          <thead>
            <tr><th>Name</th><th>Role</th><th></th></tr>
          </thead>
          <tbody>
            {(ev.team ? ev.team.members : []).map((m) => (
              <tr key={m.user.id}>
                <td>
                  <b>{m.user.name}</b>
                  <br />
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{m.user.email}</span>
                </td>
                <td><span className="badge">{m.role}</span></td>
                <td style={{ textAlign: 'right' }}>
                  {ev.myRole === 'owner' && String(m.user.id) !== String(selfId) && (
                    <button className="btn small ghost" onClick={() => removeMember(m.user.id)}>Remove</button>
                  )}
                  {String(m.user.id) === String(selfId) && ev.myRole !== 'owner' && (
                    <button className="btn small ghost" onClick={() => removeMember(selfId)}>Leave</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ev.myRole === 'owner' && ev.team && ev.team.pending.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <p className="muted">Pending invites — they join automatically on signup:</p>
            {ev.team.pending.map((p) => (
              <p key={p.email} className="mono" style={{ fontSize: '0.9rem' }}>
                {p.email} · {p.role}
                {' '}
                <button className="btn small ghost" onClick={() => removePending(p.email)}>Cancel</button>
              </p>
            ))}
          </div>
        )}
        {ev.myRole === 'owner' && (
          <form onSubmit={invite} style={{ marginTop: '0.75rem' }}>
            <div className="form-row">
              <div>
                <label>Email *</label>
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@email.com" required />
              </div>
              <div>
                <label>Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="volunteer">Volunteer — scan only</option>
                  <option value="coordinator">Coordinator — manage + scan</option>
                </select>
              </div>
            </div>
            {teamErr && <p className="error">{teamErr}</p>}
            {teamOk && <p className="success">{teamOk}</p>}
            <div className="actions">
              <button className="btn small" type="submit">Invite to team</button>
            </div>
          </form>
        )}
        {teamErr && ev.myRole !== 'owner' && <p className="error">{teamErr}</p>}
      </div>

      <div className="card">
        <div className="card-top"><h3>Walk-in</h3><span className="badge">Form 02</span></div>
        <form onSubmit={addWalkin} style={{ marginTop: '0.5rem' }}>
          <div className="form-row">
            <div>
              <label>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
            </div>
            <div>
              <label>Email *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>Mobile *</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" required />
            </div>
            <div>
              <label>Age *</label>
              <input type="number" min="5" max="120" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" required />
            </div>
          </div>
          {walkErr && <p className="error">{walkErr}</p>}
          <div className="actions">
            <button className="btn small" type="submit">Add ticket</button>
          </div>
        </form>
      </div>
      </div>

      <div className="card" id="tickets">
        <div className="card-top"><h3>Tickets ({tickets.length})</h3></div>
        <input placeholder="Search name, email or code…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginTop: '0.75rem' }} />
        <table>
          <thead>
            <tr><th>Name</th><th>Mobile</th><th>Age</th><th>Code</th><th>Status</th></tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t._id}>
                <td>
                  <b>{t.attendeeName}</b>
                  <br />
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{t.attendeeEmail}</span>
                </td>
                <td className="mono">{t.mobileNo || '—'}</td>
                <td>{t.age || '—'}</td>
                <td className="mono">
                  <Link to={'/t/' + t.code}>{t.code}</Link>
                </td>
                <td>
                  {t.isUsed ? <span className="badge in">In</span> : <span className="badge pending">Pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
