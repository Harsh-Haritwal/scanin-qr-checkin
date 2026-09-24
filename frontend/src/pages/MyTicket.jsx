import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

export default function MyTicket() {
  const { code } = useParams();
  const [t, setT] = useState(null);
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    axios.get(base + '/api/tickets/code/' + code).then((r) => setT(r.data));
  }, [code]);

  if (!t) return <p className="muted">Loading ticket…</p>;

  return (
    <div className="card auth-wrap ticket-qr">
      {t.isUsed
        ? <span className="badge closed">Checked in</span>
        : <span className="badge open">Valid ticket</span>}
      <h1 style={{ marginTop: '0.6rem' }}>{t.eventId && t.eventId.title}</h1>
      <p className="muted">{t.attendeeName} · {t.attendeeEmail}</p>
      <div className="qr-box" style={{ marginTop: '0.75rem' }}>
        <QRCodeSVG value={t.code} size={190} />
      </div>
      <div className="code mono">{t.code}</div>
      <p className="muted">Screenshot this page for the gate.</p>
    </div>
  );
}
