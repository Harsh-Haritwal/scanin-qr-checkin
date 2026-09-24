import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await api.post(
        isRegister ? '/api/auth/register' : '/api/auth/login',
        isRegister
          ? { name: name, email: email, password: password, role: 'admin' }
          : { email: email, password: password }
      );
      localStorage.setItem('token', res.data.token);
      nav('/');
    } catch (e) {
      setErr((e.response && e.response.data && e.response.data.msg) || 'failed');
    }
  };

  return (
    <div className="card auth-wrap">
      <span className="badge">Staff only</span>
      <h1 style={{ marginTop: '0.6rem' }}>{isRegister ? 'Create account' : 'Welcome back'}</h1>
      <p className="muted">Organizers and volunteers. Attendees need no account.</p>
      <form onSubmit={submit} style={{ marginTop: '0.75rem' }}>
        {isRegister && (
          <div>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        {err && <p className="error">{err}</p>}
        <button className="btn block" type="submit" style={{ marginTop: '0.5rem' }}>
          {isRegister ? 'Register →' : 'Sign in →'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '0.75rem' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); }}>
          {isRegister ? 'Have an account? Sign in' : 'New organizer? Register'}
        </a>
      </p>
    </div>
  );
}
