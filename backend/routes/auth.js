const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Event = require('../models/Event');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register {name,email,password,role}
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ msg: 'missing fields' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ msg: 'email already used' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name, email, passwordHash,
    role: role === 'admin' ? 'admin' : 'staff'
  });

  // join events that invited this email before signup
  const addr = email.trim().toLowerCase();
  const invited = await Event.find({ 'pendingInvites.email': addr });
  for (const ev of invited) {
    const inv = ev.pendingInvites.find((p) => p.email === addr);
    ev.members.push({ user: user._id, role: inv ? inv.role : 'volunteer' });
    ev.pendingInvites = ev.pendingInvites.filter((p) => p.email !== addr);
    await ev.save();
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user._id, name, email, role: user.role } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'invalid login' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ msg: 'invalid login' });

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  res.json(user);
});

module.exports = router;
