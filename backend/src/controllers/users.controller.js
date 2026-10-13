const usersService = require('../services/users.service');

async function listUsers(req, res, next) {
  try {
    res.json(await usersService.listAccounts());
  } catch (err) {
    next(err);
  }
}

// Responds with the account and its invite link. The link is also emailed
// when email is configured; `link.emailed` tells the UI which happened.
async function createUser(req, res, next) {
  try {
    res.status(201).json(await usersService.createAccount(req.validatedBody, req.user));
  } catch (err) {
    next(err);
  }
}

async function sendNewLink(req, res, next) {
  try {
    res.json({ link: await usersService.sendNewLink(req.params.id, req.user) });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    res.json(await usersService.updateAccount(req.params.id, req.validatedBody, req.user));
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, sendNewLink, updateUser };
