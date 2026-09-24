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
    <div className="auth-wrap">
      <div className="auth-head">
        <span className="badge">Staff only</span>
        <h1>{isRegister ? 'Join the crew' : 'Welcome back'}</h1>
        <p className="muted">{isRegister ? 'Create your organizer account.' : 'Sign in to run your gates.'}</p>
      </div>
      <div className="card">
        <form onSubmit={submit}>
          {isRegister && (
            <div>
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@team.com" />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          {err && <p className="error" style={{ marginTop: '0.75rem' }}>{err}</p>}
          <button className="btn block" type="submit" style={{ marginTop: '1.1rem' }}>
            {isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <hr className="auth-divider" />
        <p className="auth-foot muted">
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <a
            className="accent-link"
            href="#"
            onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); }}
          >
            {isRegister ? 'Sign in' : 'Create an account'}
          </a>
        </p>
      </div>
    </div>
  );
}
