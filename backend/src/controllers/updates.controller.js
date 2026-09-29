const updatesService = require('../services/updates.service');

async function getToday(req, res, next) {
  try {
    const rows = await updatesService.getTodayUpdates();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function createUpdate(req, res, next) {
  try {
    const result = await updatesService.recordUpdateStandalone(req.validatedBody);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function createBatch(req, res, next) {
  try {
    const result = await updatesService.recordBatch(req.validatedBody);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const rows = await updatesService.getAllHistory();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { getToday, createUpdate, createBatch, getHistory };
