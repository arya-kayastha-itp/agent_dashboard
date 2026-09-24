const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { personaForEmail } = require('../config/authUsers');

async function login(req, res) {
  const { email, password } = req.validatedBody;
  const persona = personaForEmail(email);

  if (!persona || password !== env.auth.password) {
    return res.status(401).json({ error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' } });
  }

  const token = jwt.sign({ email: email.trim().toLowerCase(), persona }, env.auth.jwtSecret, { expiresIn: '12h' });
  return res.json({ token, persona, email });
}

module.exports = { login };
