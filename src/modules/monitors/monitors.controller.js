const { z } = require('zod');
const monitorsService = require('./monitors.service');

const createMonitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url('Must be a valid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  intervalMins: z.number().int().min(1).max(1440).optional(),
  timeoutSecs: z.number().int().min(5).max(60).optional(),
  expectedStatus: z.number().int().min(100).max(599).optional(),
  isActive: z.boolean().optional(),
});

const updateMonitorSchema = createMonitorSchema.partial();

const list = async (req, res, next) => {
  try {
    const result = await monitorsService.listMonitors(req.user.userId, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const monitor = await monitorsService.getMonitor(req.params.id, req.user.userId);
    res.json({ monitor });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createMonitorSchema.parse(req.body);
    const monitor = await monitorsService.createMonitor(req.user.userId, data);
    res.status(201).json({ monitor });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateMonitorSchema.parse(req.body);
    const monitor = await monitorsService.updateMonitor(req.params.id, req.user.userId, data);
    res.json({ monitor });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await monitorsService.deleteMonitor(req.params.id, req.user.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, get, create, update, remove };
