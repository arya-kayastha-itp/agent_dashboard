const { z } = require('zod');

// Length over complexity rules (NIST SP 800-63B): at least 12 characters,
// capped so a huge input can't tie up the password hasher.
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;

// Emails are trimmed first — a pasted address often carries a trailing space.
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(PASSWORD_MAX),
});

const linkTokenSchema = z.object({
  token: z.string().min(20).max(200),
});

const setPasswordSchema = linkTokenSchema.extend({
  password: z
    .string()
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

module.exports = { loginSchema, linkTokenSchema, setPasswordSchema, forgotPasswordSchema, PASSWORD_MIN };
