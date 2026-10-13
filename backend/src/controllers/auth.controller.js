const jwt = require('jsonwebtoken');
const env = require('../config/env');
const usersService = require('../services/users.service');

// `tv` is the account's token_version at sign-in — see middleware/auth.js.
function sessionFor(account) {
  const token = jwt.sign({ sub: account.id, tv: Number(account.tokenVersion) }, env.auth.jwtSecret, { expiresIn: '12h' });
  return {
    token,
    persona: account.role,
    user: { id: account.id, teamMemberId: account.teamMemberId, name: account.name, email: account.email },
  };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.validatedBody;
    res.json(sessionFor(await usersService.signIn(email, password)));
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  const { persona, ...user } = req.user;
  res.json({ persona, user });
}

// Lets the set-password page greet the person and say whether this is an
// invite or a reset before they type anything. POST so the token stays out
// of URLs and request logs.
async function describeLink(req, res, next) {
  try {
    res.json(await usersService.describeLink(req.validatedBody.token));
  } catch (err) {
    next(err);
  }
}

// Setting a password signs the person straight in.
async function setPassword(req, res, next) {
  try {
    const { token, password } = req.validatedBody;
    res.json(sessionFor(await usersService.setPasswordWithLink(token, password)));
  } catch (err) {
    next(err);
  }
}

// Always the same answer, whether or not the email has an account.
async function forgotPassword(req, res, next) {
  try {
    await usersService.requestPasswordReset(req.validatedBody.email);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, describeLink, setPassword, forgotPassword };
