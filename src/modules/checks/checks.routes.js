const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const checksService = require('./checks.service');

const router = Router({ mergeParams: true }); // inherit :id from parent router

router.use(authenticate);

// GET /api/monitors/:id/results — paginated check results
router.get('/results', async (req, res, next) => {
  try {
    const data = await checksService.getResults(req.params.id, req.user.userId, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/monitors/:id/stats — uptime & response time stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await checksService.getStats(req.params.id, req.user.userId);
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
