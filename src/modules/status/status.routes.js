const { Router } = require('express');
const { getStatusPage } = require('./status.controller');

const router = Router();

/**
 * @swagger
 * /status/{slug}:
 *   get:
 *     summary: Get the public status page for a workspace
 *     description: >
 *       Returns all active monitors in the workspace along with their current
 *       status and 24-hour uptime percentage. This endpoint is public — no auth required.
 *     tags: [Status]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace slug (e.g. "jane-abc1")
 *         example: jane-abc1
 *     responses:
 *       200:
 *         description: Status page data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workspace:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                 monitors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       url:
 *                         type: string
 *                         format: uri
 *                       status:
 *                         type: string
 *                         enum: [UP, DOWN, DEGRADED, PENDING]
 *                       lastChecked:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       uptime24h:
 *                         type: number
 *                         format: float
 *                         nullable: true
 *                         description: Uptime % over the last 24 hours (null if no data)
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Status page not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:slug', getStatusPage);

module.exports = router;
