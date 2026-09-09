const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

// Deliberately isolated, single call site — same "explicit about being
// unconfigured rather than silently no-op'ing" philosophy as mailer.service.js.
function buildPrompt(insights) {
  return `You are writing a short status update for an internal engineering dashboard. Given this JSON data about an AI agent project's status, cost, and reliability, write a natural, plain-English summary in 2-4 sentences. Be direct and factual — no greetings, no markdown, no bullet points.

${JSON.stringify(insights, null, 2)}`;
}

async function generateNarrative(insights) {
  if (!env.anthropicApiKey) {
    const err = new Error('AI narrative generation is not configured');
    err.status = 503;
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 300,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: buildPrompt(insights) }],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      const err = new Error('AI returned no text');
      err.status = 502;
      err.code = 'AI_GENERATION_FAILED';
      throw err;
    }

    return text;
  } catch (err) {
    if (err.status) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      err.status = 429;
      err.code = 'AI_RATE_LIMITED';
    } else if (err instanceof Anthropic.AuthenticationError) {
      err.status = 502;
      err.code = 'AI_AUTH_FAILED';
    } else if (err instanceof Anthropic.APIError) {
      err.status = 502;
      err.code = 'AI_GENERATION_FAILED';
    }
    throw err;
  }
}

module.exports = { generateNarrative };
