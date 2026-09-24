import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';

export default function Scan() {
  const { eventId } = useParams();
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showCam, setShowCam] = useState(false);
  const [camErr, setCamErr] = useState('');
  const lastScan = useRef(0);

  const doCheckin = async (raw) => {
    const src = raw || code || '';
    let c = src.trim().toUpperCase();
    if (c.indexOf('/') !== -1) {
      const parts = c.split('/');
      c = parts[parts.length - 1];
    }
    if (!c) return;
    setResult({ loading: true });
    try {
      const res = await api.post('/api/tickets/checkin', { code: c, eventId: eventId });
      setResult({ status: 'SUCCESS', ticket: res.data.ticket });
      const entry = res.data.ticket;
      entry.time = new Date().toLocaleTimeString();
      setHistory((h) => [entry].concat(h).slice(0, 10));
      setCode('');
    } catch (err) {
      const d = err.response && err.response.data;
      setResult({ status: (d && d.status) || 'ERROR', msg: (d && d.msg) || 'failed', ticket: d && d.ticket });
    }
  };

  const checkin = (e) => {
    if (e) e.preventDefault();
    doCheckin(code);
  };

  useEffect(() => {
    if (!showCam) return;
    setCamErr('');
    const qr = new Html5Qrcode('qr-reader');
    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded) => {
        const now = Date.now();
        if (now - lastScan.current < 2500) return;
        lastScan.current = now;
        doCheckin(decoded);
      },
      () => {}
    ).catch((e) => setCamErr('Camera blocked. Use HTTPS or localhost and allow permission. ' + e));

    return () => {
      qr.stop().catch(() => {}).finally(() => qr.clear().catch(() => {}));
    };
  }, [showCam]);

  return (
    <div className="scan-layout">
      <div>
      <div className="card">
        <div className="card-top">
          <h3>Scanner</h3>
          <span className="badge open">Live</span>
        </div>
        <h1 style={{ marginTop: '0.5rem' }}>Check them in</h1>
        <p className="muted">Camera for the queue, typing for torn stubs.</p>
        <form onSubmit={checkin} style={{ marginTop: '0.75rem' }}>
          <label>Ticket code</label>
          <input
            placeholder="e.g. K7Q2P9XA"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mono"
            style={{ textAlign: 'center', letterSpacing: '0.2em', fontWeight: 500 }}
          />
          <button className="btn block" type="submit" style={{ marginTop: '0.5rem' }}>Check in →</button>
        </form>
        <div className="actions">
          <button className="btn small outline" onClick={() => setShowCam((s) => !s)}>
            {showCam ? 'Stop camera' : 'Start camera'}
          </button>
          <span className="muted mono" style={{ fontSize: '0.85rem', alignSelf: 'center' }}>rear lens · 10 fps</span>
        </div>
        {showCam && <div id="qr-reader" style={{ marginTop: '0.75rem' }}></div>}
        {camErr && <p className="error" style={{ marginTop: '0.75rem' }}>{camErr}</p>}
      </div>

      {result && result.status === 'SUCCESS' && (
        <div className="success">
          <span className="badge open">Stamped</span>
          <h3 style={{ marginTop: '0.4rem' }}>{result.ticket.attendeeName}</h3>
          <p className="muted mono">{result.ticket.attendeeEmail} · {result.ticket.code}</p>
        </div>
      )}
      {result && result.status === 'ALREADY_USED' && (
        <div className="warn">
          <span className="badge pending">Seen before</span>
          <h3 style={{ marginTop: '0.4rem' }}>{result.ticket && result.ticket.attendeeName} already in</h3>
          <p className="muted mono">{result.ticket && result.ticket.usedAt && new Date(result.ticket.usedAt).toLocaleString()}</p>
        </div>
      )}
      {result && result.status === 'INVALID' && (
        <div className="warn"><b>Not in the book.</b><p className="mono">{result.msg}</p></div>
      )}
      </div>

      <div>
      <div className="card">
        <div className="card-top"><h3>Recent</h3><span className="badge">{history.length}</span></div>
        {history.map((h, i) => (
          <p key={i} className="mono" style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
            {h.time} — {h.attendeeName} ({h.code})
          </p>
        ))}
        {history.length === 0 && <p className="muted">No check-ins yet.</p>}
      </div>
      </div>
    </div>
  );
}
