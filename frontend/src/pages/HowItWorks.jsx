import { Link } from 'react-router-dom';

export default function HowItWorks() {
  return (
    <div>
      <span className="badge">Guide</span>
      <h1 style={{ marginTop: '0.6rem' }}>How ScanIn works</h1>
      <p className="muted">Three flows, one gate. No paper lists, no double entry.</p>

      <h2 className="section-title">For organizers</h2>
      <div className="stat-grid">
        <div className="stat">
          <small>Step 1</small>
          <h3 style={{ marginTop: '0.3rem' }}>Create the event</h3>
          <p className="muted">Title, venue, date. You become the owner automatically.</p>
        </div>
        <div className="stat">
          <small>Step 2</small>
          <h3 style={{ marginTop: '0.3rem' }}>Build your team</h3>
          <p className="muted">Invite coordinators and volunteers by email — even before they sign up.</p>
        </div>
        <div className="stat">
          <small>Step 3</small>
          <h3 style={{ marginTop: '0.3rem' }}>Watch the door</h3>
          <p className="muted">Live issued / checked-in counts refresh every 10 seconds.</p>
        </div>
      </div>

      <h2 className="section-title">For attendees</h2>
      <div className="stat-grid">
        <div className="stat">
          <small>Step 1</small>
          <h3 style={{ marginTop: '0.3rem' }}>Open the invite link</h3>
          <p className="muted">No account needed. Enter name, email, mobile and age.</p>
        </div>
        <div className="stat">
          <small>Step 2</small>
          <h3 style={{ marginTop: '0.3rem' }}>Verify by email OTP</h3>
          <p className="muted">A 6-digit code proves the email is real. One ticket per email.</p>
        </div>
        <div className="stat">
          <small>Step 3</small>
          <h3 style={{ marginTop: '0.3rem' }}>Show the QR</h3>
          <p className="muted">Screenshot the ticket. Volunteers scan it at the gate.</p>
        </div>
      </div>

      <h2 className="section-title">At the gate</h2>
      <div className="card">
        <p className="muted">Volunteers open the scanner on any phone — camera or typed code. A ticket stamps green once; rescans show as already used. Everything lands in the recent list instantly.</p>
        <div className="actions">
          <Link to="/events/new" className="btn">Create event →</Link>
          <Link to="/login" className="btn outline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
