const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { list, get, create, update, remove } = require('./monitors.controller');

const router = Router();

// All monitor routes require authentication
router.use(authenticate);

// GET  /api/monitors          — list all monitors for user
router.get('/', list);

// GET  /api/monitors/:id      — get a single monitor
router.get('/:id', get);

// POST /api/monitors          — create a new monitor
router.post('/', create);

// PATCH /api/monitors/:id     — update a monitor
router.patch('/:id', update);

// DELETE /api/monitors/:id    — delete a monitor
router.delete('/:id', remove);

module.exports = router;
