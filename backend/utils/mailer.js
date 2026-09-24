const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendOtpEmail(to, code, eventTitle) {
  // Dev fallback: no SMTP configured -> log it so local testing still works.
  // Never expose the code to the client unless ALLOW_OTP_DEBUG=true (local only).
  if (!transporter) {
    console.log('[OTP dev] to=' + to + ' event=' + eventTitle + ' code=' + code);
    return { dev: true };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to,
    subject: 'Your ticket OTP for ' + eventTitle,
    text: 'Your verification code is ' + code + '. It expires in 10 minutes.'
  });
  return { dev: false };
}

module.exports = { sendOtpEmail };
