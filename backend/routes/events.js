const express = require('express');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { auth, needRole } = require('../middleware/auth');

const router = express.Router();

// all event routes need login
router.use(auth);

function memberId(m) {
  return String((m.user && m.user._id) || m.user);
}

// effective role in event: creator + global admins count as owner
function eventRole(ev, user) {
  if (!ev || !user) return null;
  if (ev.createdBy && String(ev.createdBy) === String(user.id)) return 'owner';
  if (user.role === 'admin') return 'owner';
  const m = (ev.members || []).find((x) => memberId(x) === String(user.id));
  return m ? m.role : null;
}

function ownerIds(ev) {
  const ids = new Set();
  if (ev.createdBy) ids.add(String(ev.createdBy));
  (ev.members || []).forEach((m) => {
    if (m.role === 'owner') ids.add(memberId(m));
  });
  return ids;
}

function teamView(ev) {
  return {
    members: (ev.members || []).map((m) => ({
      user: m.user && m.user._id
        ? { id: m.user._id, name: m.user.name, email: m.user.email }
        : { id: m.user, name: '(unknown)', email: '' },
      role: m.role
    })),
    pending: (ev.pendingInvites || []).map((p) => ({ email: p.email, role: p.role }))
  };
}

// create event (admin only) — creator becomes owner
router.post('/', needRole('admin'), async (req, res) => {
  const { title, description, venue, date } = req.body;
  if (!title || !date) return res.status(400).json({ msg: 'title and date required' });
  const ev = await Event.create({
    title, description, venue, date,
    createdBy: req.user.id,
    members: [{ user: req.user.id, role: 'owner' }]
  });
  res.json(ev);
});

// list events I'm on the team of (admins see all)
router.get('/', async (req, res) => {
  let q = {};
  if (req.user.role !== 'admin') {
    q = { $or: [{ createdBy: req.user.id }, { 'members.user': req.user.id }] };
  }
  const events = await Event.find(q).sort({ date: 1 });
  const out = [];
  for (const e of events) {
    const total = await Ticket.countDocuments({ eventId: e._id });
    const checked = await Ticket.countDocuments({ eventId: e._id, isUsed: true });
    out.push({ ...e.toObject(), total, checked, myRole: eventRole(e, req.user) });
  }
  res.json(out);
});

// event detail + stats + team
router.get('/:id', async (req, res) => {
  const ev = await Event.findById(req.params.id).populate('members.user', 'name email');
  if (!ev) return res.status(404).json({ msg: 'not found' });
  const role = eventRole(ev, req.user);
  if (!role) return res.status(403).json({ msg: 'not on this event team' });
  const total = await Ticket.countDocuments({ eventId: ev._id });
  const checked = await Ticket.countDocuments({ eventId: ev._id, isUsed: true });
  const obj = ev.toObject();
  delete obj.pendingInvites; // invites go out via team.pending for owners only
  const out = { ...obj, total, checked, myRole: role, team: teamView(ev) };
  if (role !== 'owner') out.team.pending = [];
  res.json(out);
});

// update / close event (owner or coordinator)
router.put('/:id', async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ msg: 'not found' });
  const role = eventRole(ev, req.user);
  if (role !== 'owner' && role !== 'coordinator') return res.status(403).json({ msg: 'owner or coordinator only' });
  const { members, pendingInvites, createdBy, ...safe } = req.body;
  const updated = await Event.findByIdAndUpdate(req.params.id, safe, { new: true });
  res.json(updated);
});

// delete event (owner only)
router.delete('/:id', async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ msg: 'not found' });
  if (eventRole(ev, req.user) !== 'owner') return res.status(403).json({ msg: 'owner only' });
  await Ticket.deleteMany({ eventId: req.params.id });
  await Event.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// invite to team (owner only). Works even if email hasn't registered yet (pending).
router.post('/:id/team', async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ msg: 'not found' });
  if (eventRole(ev, req.user) !== 'owner') return res.status(403).json({ msg: 'owner only' });

  const { email, role } = req.body;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ msg: 'valid email required' });
  if (role !== 'coordinator' && role !== 'volunteer') return res.status(400).json({ msg: 'role must be coordinator or volunteer' });

  const addr = email.trim().toLowerCase();
  const user = await User.findOne({ email: addr });
  if (user) {
    if ((ev.members || []).some((m) => memberId(m) === String(user._id))) {
      return res.status(409).json({ msg: 'already on the team' });
    }
    ev.members.push({ user: user._id, role });
  } else {
    if ((ev.pendingInvites || []).some((p) => p.email === addr)) {
      return res.status(409).json({ msg: 'already invited. They join on signup.' });
    }
    ev.pendingInvites.push({ email: addr, role });
  }
  await ev.save();
  const full = await Event.findById(ev._id).populate('members.user', 'name email');
  res.json({ ok: true, team: teamView(full) });
});

// remove from team, cancel pending invite, or leave (owner only, except self-leave)
router.delete('/:id/team', async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ msg: 'not found' });
  const myRole = eventRole(ev, req.user);
  if (!myRole) return res.status(403).json({ msg: 'not on this event team' });

  const { userId, email } = req.body || {};
  const selfLeave = userId && String(userId) === String(req.user.id) && !email;
  if (myRole !== 'owner' && !selfLeave) return res.status(403).json({ msg: 'owner only' });

  if (email) {
    const addr = String(email).trim().toLowerCase();
    ev.pendingInvites = (ev.pendingInvites || []).filter((p) => p.email !== addr);
    await ev.save();
    const full = await Event.findById(ev._id).populate('members.user', 'name email');
    return res.json({ ok: true, team: teamView(full) });
  }

  if (!userId) return res.status(400).json({ msg: 'userId or email required' });
  if (String(userId) === String(ev.createdBy) && !selfLeave) {
    return res.status(400).json({ msg: 'cannot remove the creator' });
  }
  ev.members = (ev.members || []).filter((m) => memberId(m) !== String(userId));
  if (ownerIds(ev).size === 0) {
    return res.status(400).json({ msg: 'event needs at least one owner' });
  }
  await ev.save();
  const full = await Event.findById(ev._id).populate('members.user', 'name email');
  res.json({ ok: true, team: teamView(full) });
});

module.exports = router;
