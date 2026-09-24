const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ msg: 'no token' });
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    req.user = d; // {id, role, name}
    next();
  } catch (e) {
    return res.status(401).json({ msg: 'invalid token' });
  }
}

function needRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ msg: 'forbidden' });
    next();
  };
}

module.exports = { auth, needRole };
