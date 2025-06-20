// routes/codeRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { errorLogger, errorHandler } = require('../middleware/errorMiddleware');
const codeController = require('../controllers/codeController');

// Apply error logger middleware
router.use(errorLogger);

// GET routes
router.get('/', auth, codeController.getAllSnippets);
router.get('/:snippetId', auth, codeController.getSnippet);

// POST routes
router.post('/', auth, async (req, res, next) => {
    try {
        await codeController.createSnippet(req, res);
    } catch (error) {
        next(error);
    }
});

// PUT routes
router.put('/:snippetId', auth, codeController.updateSnippet);

// DELETE routes
router.delete('/:snippetId', auth, codeController.deleteSnippet);

// Apply error handler middleware last
router.use(errorHandler);

module.exports = router;