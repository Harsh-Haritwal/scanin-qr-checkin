const express = require('express');
const crypto = require('crypto');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Otp = require('../models/Otp');
const { auth } = require('../middleware/auth');
const { sendOtpEmail } = require('../utils/mailer');

const router = express.Router();

// event must exist + caller must be on its team
async function eventAccess(eventId, user) {
  const ev = await Event.findById(eventId);
  if (!ev) return { err: 'event not found', code: 404 };
  if (ev.createdBy && String(ev.createdBy) === String(user.id)) return { ev };
  const m = (ev.members || []).find((x) => String(x.user) === String(user.id));
  if (!m) return { err: 'not on this event team', code: 403 };
  return { ev, role: m.role };
}

function makeCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) s += chars[buf[i] % chars.length];
  return s;
}

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function validEmail(e) {
  return /^\S+@\S+\.\S+$/.test(String(e || '').trim());
}

// 10-digit mobile, tolerates spaces/dashes/+91 prefix
function cleanMobile(m) {
  let d = String(m || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

function validAge(a) {
  const n = Number(a);
  return Number.isInteger(n) && n >= 5 && n <= 120 ? n : null;
}

// PUBLIC: step 1 — submit details, receive email OTP
// POST /api/tickets/public/:eventId/request-otp
router.post('/public/:eventId/request-otp', async (req, res) => {
  const { attendeeName, attendeeEmail, mobileNo, age } = req.body;
  if (!attendeeName || !attendeeName.trim()) return res.status(400).json({ msg: 'name is required' });
  if (!validEmail(attendeeEmail)) return res.status(400).json({ msg: 'valid email is required' });

  const mobile = cleanMobile(mobileNo);
  if (!mobile) return res.status(400).json({ msg: 'valid 10-digit mobile number is required' });

  const ageNum = validAge(age);
  if (ageNum === null) return res.status(400).json({ msg: 'valid age (5-120) is required' });

  const ev = await Event.findById(req.params.eventId);
  if (!ev) return res.status(404).json({ msg: 'event not found' });
  if (!ev.isActive) return res.status(400).json({ msg: 'registrations closed' });

  const email = attendeeEmail.trim().toLowerCase();
  const already = await Ticket.findOne({ eventId: ev._id, attendeeEmail: email });
  if (already) return res.status(409).json({ msg: 'this email is already registered for this event' });

  // 60s resend cooldown
  const prev = await Otp.findOne({ eventId: ev._id, attendeeEmail: email });
  if (prev && Date.now() - new Date(prev.lastSentAt).getTime() < 60000) {
    const wait = 60 - Math.floor((Date.now() - new Date(prev.lastSentAt).getTime()) / 1000);
    return res.status(429).json({ msg: 'OTP already sent. Retry in ' + wait + 's' });
  }

  const code = makeOtp();
  await Otp.findOneAndUpdate(
    { eventId: ev._id, attendeeEmail: email },
    {
      eventId: ev._id,
      attendeeName: attendeeName.trim(),
      attendeeEmail: email,
      mobileNo: mobile,
      age: ageNum,
      code: code,
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    },
    { upsert: true, new: true }
  );

  try {
    const r = await sendOtpEmail(email, code, ev.title);
    const out = { ok: true, msg: 'OTP sent to email' };
    if (r.dev && process.env.ALLOW_OTP_DEBUG === 'true') out.debugCode = code;
    res.json(out);
  } catch (e) {
    console.error('SMTP send failed:', e.message);
    res.status(500).json({ msg: 'could not send email. Check SMTP settings.' });
  }
});

// PUBLIC: step 2 — verify OTP, get ticket
// POST /api/tickets/public/:eventId/verify-otp {attendeeEmail, code}
router.post('/public/:eventId/verify-otp', async (req, res) => {
  const { attendeeEmail, code } = req.body;
  if (!validEmail(attendeeEmail) || !code) return res.status(400).json({ msg: 'email and OTP required' });

  const email = attendeeEmail.trim().toLowerCase();
  const otp = await Otp.findOne({ eventId: req.params.eventId, attendeeEmail: email });
  if (!otp) return res.status(400).json({ msg: 'no OTP requested. Request one first.' });
  if (otp.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: otp._id });
    return res.status(400).json({ msg: 'OTP expired. Request a new one.' });
  }
  if (otp.attempts >= 5) {
    await Otp.deleteOne({ _id: otp._id });
    return res.status(429).json({ msg: 'too many wrong tries. Request a new OTP.' });
  }
  if (String(code).trim() !== otp.code) {
    otp.attempts += 1;
    await otp.save();
    return res.status(400).json({ msg: 'wrong OTP. ' + (5 - otp.attempts) + ' tries left.' });
  }

  let ticketCode = makeCode();
  for (let i = 0; i < 3; i++) {
    const exists = await Ticket.findOne({ code: ticketCode });
    if (!exists) break;
    ticketCode = makeCode();
  }

  try {
    const t = await Ticket.create({
      eventId: otp.eventId,
      attendeeName: otp.attendeeName,
      attendeeEmail: otp.attendeeEmail,
      mobileNo: otp.mobileNo,
      age: otp.age,
      code: ticketCode
    });
    await Otp.deleteOne({ _id: otp._id });
    res.json(t);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ msg: 'this email is already registered for this event' });
    throw e;
  }
});

// PUBLIC: get ticket by code (for /t/:code page)
router.get('/code/:code', async (req, res) => {
  const t = await Ticket.findOne({ code: req.params.code.toUpperCase() }).populate('eventId');
  if (!t) return res.status(404).json({ msg: 'invalid ticket' });
  res.json(t);
});

// STAFF: list tickets for event (team only)
router.get('/event/:eventId', auth, async (req, res) => {
  const gate = await eventAccess(req.params.eventId, req.user);
  if (gate.err) return res.status(gate.code).json({ msg: gate.err });
  const { search } = req.query;
  let q = { eventId: req.params.eventId };
  if (search) {
    q.$or = [
      { attendeeName: new RegExp(search, 'i') },
      { attendeeEmail: new RegExp(search, 'i') },
      { mobileNo: new RegExp(search, 'i') },
      { code: new RegExp(search, 'i') }
    ];
  }
  const tickets = await Ticket.find(q).sort({ createdAt: -1 }).limit(200);
  res.json(tickets);
});

// STAFF: walk-in create (needs login, all fields required)
router.post('/event/:eventId', auth, async (req, res) => {
  const { attendeeName, attendeeEmail, mobileNo, age } = req.body;
  if (!attendeeName || !validEmail(attendeeEmail)) return res.status(400).json({ msg: 'name and valid email required' });
  const mobile = cleanMobile(mobileNo);
  if (!mobile) return res.status(400).json({ msg: 'valid 10-digit mobile number is required' });
  const ageNum = validAge(age);
  if (ageNum === null) return res.status(400).json({ msg: 'valid age (5-120) is required' });

  const gate = await eventAccess(req.params.eventId, req.user);
  if (gate.err) return res.status(gate.code).json({ msg: gate.err });
  const ev = gate.ev;

  let code = makeCode();
  try {
    const t = await Ticket.create({
      eventId: ev._id,
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail.trim().toLowerCase(),
      mobileNo: mobile,
      age: ageNum,
      code: code
    });
    res.json(t);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ msg: 'this email is already registered for this event' });
    throw e;
  }
});

// STAFF: check-in
// POST /api/tickets/checkin {code, eventId}
router.post('/checkin', auth, async (req, res) => {
  let { code, eventId } = req.body;
  if (!code || !eventId) return res.status(400).json({ msg: 'code and eventId required' });
  code = code.trim().toUpperCase();

  const gate = await eventAccess(eventId, req.user);
  if (gate.err) return res.status(gate.code).json({ msg: gate.err, status: 'INVALID' });

  const t = await Ticket.findOne({ code, eventId });
  if (!t) return res.status(404).json({ status: 'INVALID', msg: 'ticket not found' });
  if (t.isRevoked) {
    return res.status(403).json({ status: 'REVOKED', msg: 'entry removed: ' + (t.revokeReason || ''), ticket: t });
  }
  if (t.isUsed) {
    return res.status(400).json({ status: 'ALREADY_USED', msg: 'already checked in', ticket: t });
  }
  t.isUsed = true;
  t.usedAt = new Date();
  t.checkedInBy = req.user.id;
  await t.save();
  res.json({ status: 'SUCCESS', ticket: t });
});

const REVOKE_REASONS = ['Misbehavior', 'Fake details', 'Duplicate ticket', 'Other'];

// Remove someone's entry with a reason (owner/coordinator only)
router.post('/:id/revoke', auth, async (req, res) => {
  const t = await Ticket.findById(req.params.id);
  if (!t) return res.status(404).json({ msg: 'ticket not found' });
  const gate = await eventAccess(t.eventId, req.user);
  if (gate.err) return res.status(gate.code).json({ msg: gate.err });
  if (gate.role !== 'owner' && gate.role !== 'coordinator') {
    return res.status(403).json({ msg: 'owner or coordinator only' });
  }
  const { reason } = req.body;
  if (!REVOKE_REASONS.includes(reason)) return res.status(400).json({ msg: 'pick a valid reason' });
  t.isRevoked = true;
  t.revokeReason = reason;
  t.revokedBy = req.user.id;
  t.revokedAt = new Date();
  await t.save();
  res.json({ ok: true, ticket: t });
});

// Undo a removal (owner/coordinator only)
router.post('/:id/restore', auth, async (req, res) => {
  const t = await Ticket.findById(req.params.id);
  if (!t) return res.status(404).json({ msg: 'ticket not found' });
  const gate = await eventAccess(t.eventId, req.user);
  if (gate.err) return res.status(gate.code).json({ msg: gate.err });
  if (gate.role !== 'owner' && gate.role !== 'coordinator') {
    return res.status(403).json({ msg: 'owner or coordinator only' });
  }
  t.isRevoked = false;
  t.revokeReason = undefined;
  t.revokedBy = undefined;
  t.revokedAt = undefined;
  await t.save();
  res.json({ ok: true, ticket: t });
});

module.exports = router;
