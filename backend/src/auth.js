// JWT auth shared by all clients. End users (guest/host are the SAME account in
// two modes) get a user token; Ops staff get a staff token with a role claim.

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'stayon-dev-secret-change-me';

const sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: '30d' });

function authUser(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.auth = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTH', message: 'Login required' } });
  }
}

function authStaff(...roles) {
  return (req, res, next) =>
    authUser(req, res, () => {
      if (req.auth.kind !== 'staff') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Ops access only' } });
      }
      if (roles.length && !roles.includes(req.auth.role) && req.auth.role !== 'super_admin') {
        return res.status(403).json({ error: { code: 'ROLE', message: `Requires role: ${roles.join('/')}` } });
      }
      next();
    });
}

module.exports = { sign, authUser, authStaff, SECRET };
