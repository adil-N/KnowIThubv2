// routes/superAdminStats.js
const express = require('express');
const router = express.Router();
const superAdminStatsController = require('../controllers/superAdminStatsController');
const superAdminAuth = require('../middleware/superAdminAuth');

// Apply super admin authentication middleware to all routes
router.use(superAdminAuth);

// Dashboard statistics routes
router.get('/dashboard', superAdminStatsController.getDashboardStats);

// Detailed statistics routes
router.get('/article/:articleId/views', superAdminStatsController.getArticleViewDetails);
router.get('/user/:userId/activity', superAdminStatsController.getUserActivityDetails);

module.exports = router;
