import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PublicRegister() {
  const { eventId } = useParams();
  const [step, setStep] = useState('details'); // details | otp
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const requestOtp = async (e) => {
    if (e) e.preventDefault();
    setErr('');
    setInfo('');
    setLoading(true);
    try {
      const res = await axios.post(base + '/api/tickets/public/' + eventId + '/request-otp', {
        attendeeName: name,
        attendeeEmail: email,
        mobileNo: mobile,
        age: age
      });
      setStep('otp');
      let msg = res.data.msg + ' at ' + email;
      if (res.data.debugCode) msg += ' (dev code: ' + res.data.debugCode + ')';
      setInfo(msg);
    } catch (e) {
      setErr((e.response && e.response.data && e.response.data.msg) || 'failed');
    }
    setLoading(false);
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await axios.post(base + '/api/tickets/public/' + eventId + '/verify-otp', {
        attendeeEmail: email,
        code: otp
      });
      nav('/t/' + res.data.code);
    } catch (e) {
      setErr((e.response && e.response.data && e.response.data.msg) || 'failed');
    }
    setLoading(false);
  };

  return (
    <div className="card auth-wrap">
      <span className="badge">Free entry · Verified</span>
      <h1 style={{ marginTop: '0.6rem' }}>Get your ticket</h1>
      <p className="muted">We verify your email with a one-time code. No fakes.</p>

      {step === 'details' && (
        <form onSubmit={requestOtp} style={{ marginTop: '0.75rem' }}>
          <label>Full name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          <label>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
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
          {err && <p className="error">{err}</p>}
          <button className="btn block" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Sending…' : 'Send OTP →'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={verifyOtp} style={{ marginTop: '0.75rem' }}>
          {info && <p className="success">{info}</p>}
          <label>6-digit OTP *</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="mono"
            style={{ textAlign: 'center', letterSpacing: '0.3em' }}
            required
          />
          {err && <p className="error">{err}</p>}
          <button className="btn block" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Verifying…' : 'Verify & get ticket →'}
          </button>
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setStep('details'); }}>← Edit details</a>
            {' · '}
            <a href="#" onClick={(e) => { e.preventDefault(); requestOtp(); }}>Resend OTP</a>
          </p>
        </form>
      )}
    </div>
  );
}
