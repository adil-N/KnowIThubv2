// routes/commentRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');

// Basic CRUD routes
router.get('/', auth, commentController.getComments);
router.post('/', auth, commentController.addComment);
router.put('/:commentId', auth, commentController.updateComment);
router.delete('/:commentId', auth, commentController.deleteComment);

// Like route
router.post('/:commentId/like', auth, commentController.likeComment);

module.exports = router;