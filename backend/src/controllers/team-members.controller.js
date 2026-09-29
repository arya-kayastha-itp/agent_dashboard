const teamMembersService = require('../services/team-members.service');

async function listTeamMembers(req, res, next) {
  try {
    res.json(await teamMembersService.listTeamMembers());
  } catch (err) {
    next(err);
  }
}

async function createTeamMember(req, res, next) {
  try {
    const member = await teamMembersService.createTeamMember(req.validatedBody);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
}

async function deleteTeamMember(req, res, next) {
  try {
    const deleted = await teamMembersService.deleteTeamMember(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: { message: 'Team member not found', code: 'NOT_FOUND' } });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listTeamMembers, createTeamMember, deleteTeamMember };
