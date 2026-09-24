const nodemailer = require('nodemailer');
const dns = require('dns');

// Render free instances have no IPv6 egress, but smtp.gmail.com resolves
// to IPv6 first — without this Node tries IPv6 and dies with ENETUNREACH.
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// Preferred on hosts that block outbound SMTP (e.g. Render free):
// Brevo HTTPS API on port 443. Needs BREVO_API_KEY + verified sender.
async function sendViaBrevo(to, subject, text) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_SENDER || 'no-reply@scanin.app', name: 'ScanIn' },
      to: [{ email: to }],
      subject: subject,
      textContent: text
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Brevo rejected send: ' + res.status + ' ' + body.slice(0, 150));
  }
}

async function sendOtpEmail(to, code, eventTitle) {
  const subject = 'Your ticket OTP for ' + eventTitle;
  const text = 'Your verification code is ' + code + '. It expires in 10 minutes.';

  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo(to, subject, text);
    return { dev: false };
  }

  // Dev fallback: no SMTP configured -> log it so local testing still works.
  // Never expose the code to the client unless ALLOW_OTP_DEBUG=true (local only).
  if (!transporter) {
    console.log('[OTP dev] to=' + to + ' event=' + eventTitle + ' code=' + code);
    return { dev: true };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to,
    subject: subject,
    text: text
  });
  return { dev: false };
}

module.exports = { sendOtpEmail };
