const express = require('express');
const router = express.Router();
const { sign, authUser } = require('../auth');
const { one, insertRow, wrap, ok, err } = require('../utils/helpers');

router.post('/auth/login', wrap(async (req, res) => {
  const { phone, name, countryCode } = req.body || {};
  if (!phone) return err(res, 'PHONE', 'phone required');
  let user = await one('users', { phone });
  if (!user) user = await insertRow('users', { phone, name: name || 'Guest', country_code: countryCode || 'IN' });
  ok(res, { accessToken: sign({ sub: user.id, kind: 'user', name: user.name }), user });
}));

router.post('/ops/auth/login', wrap(async (req, res) => {
  const member = await one('staff', { email: req.body?.email });
  if (!member) return err(res, 'STAFF', 'unknown staff email', 401);
  ok(res, { accessToken: sign({ sub: member.id, kind: 'staff', role: member.role, name: member.name }), staff: member });
}));

router.get('/me', authUser, wrap(async (req, res) => {
  const tbl = req.auth.kind === 'staff' ? 'staff' : 'users';
  ok(res, await one(tbl, { id: req.auth.sub }));
}));

module.exports = router;
