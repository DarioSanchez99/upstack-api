const { Router } = require('express');
const { getStatusPage } = require('./status.controller');

const router = Router();

// GET /api/status/:slug — public status page for a workspace
router.get('/:slug', getStatusPage);

module.exports = router;
