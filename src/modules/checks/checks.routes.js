const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const checksService = require('./checks.service');

const router = Router({ mergeParams: true }); // inherit :id from parent router

router.use(authenticate);

/**
 * @swagger
 * /monitors/{id}/results:
 *   get:
 *     summary: Get paginated check results for a monitor
 *     tags: [Checks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Monitor ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Paginated check results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CheckResult'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Monitor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/results', async (req, res, next) => {
  try {
    const data = await checksService.getResults(req.params.id, req.user.userId, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /monitors/{id}/stats:
 *   get:
 *     summary: Get uptime and response time stats for a monitor
 *     tags: [Checks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Monitor ID
 *     responses:
 *       200:
 *         description: Monitor statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     uptime7d:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                       description: Uptime percentage over the last 7 days
 *                     uptime30d:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                       description: Uptime percentage over the last 30 days
 *                     avgResponseTimeMs7d:
 *                       type: integer
 *                       nullable: true
 *                       description: Average response time in ms over the last 7 days
 *                     totalChecks7d:
 *                       type: integer
 *                     totalChecks30d:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Monitor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await checksService.getStats(req.params.id, req.user.userId);
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
