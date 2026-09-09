const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { list, get, create, update, remove } = require('./monitors.controller');

const router = Router();

// All monitor routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /monitors:
 *   get:
 *     summary: List all monitors for the authenticated user
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 20
 *           maximum: 100
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Paginated list of monitors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonitorListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', list);

/**
 * @swagger
 * /monitors/{id}:
 *   get:
 *     summary: Get a single monitor by ID
 *     tags: [Monitors]
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
 *         description: Monitor details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 monitor:
 *                   $ref: '#/components/schemas/Monitor'
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
router.get('/:id', get);

/**
 * @swagger
 * /monitors:
 *   post:
 *     summary: Create a new monitor
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: My API
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://api.example.com/health
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *                 default: GET
 *               headers:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 example: { "Authorization": "Bearer token" }
 *               body:
 *                 type: string
 *                 nullable: true
 *               intervalMins:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1440
 *                 default: 5
 *               timeoutSecs:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 60
 *                 default: 30
 *               expectedStatus:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 599
 *                 default: 200
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Monitor created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 monitor:
 *                   $ref: '#/components/schemas/Monitor'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Free plan monitor limit reached
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', create);

/**
 * @swagger
 * /monitors/{id}:
 *   patch:
 *     summary: Update an existing monitor
 *     tags: [Monitors]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *               headers:
 *                 type: object
 *               body:
 *                 type: string
 *               intervalMins:
 *                 type: integer
 *               timeoutSecs:
 *                 type: integer
 *               expectedStatus:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Monitor updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 monitor:
 *                   $ref: '#/components/schemas/Monitor'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
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
router.patch('/:id', update);

/**
 * @swagger
 * /monitors/{id}:
 *   delete:
 *     summary: Delete a monitor
 *     tags: [Monitors]
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
 *         description: Monitor deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Monitor deleted successfully
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
router.delete('/:id', remove);

module.exports = router;
