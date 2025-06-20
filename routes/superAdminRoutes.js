// routes/superAdminRoutes.js - Enhanced version with comprehensive user management
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const superAdminController = require('../controllers/superAdminController');
const superAdminMiddleware = require('../middleware/superAdminAuth');

// Apply authentication and super admin middleware to all routes
router.use(auth);
router.use(superAdminMiddleware);

// EXISTING ADMIN MANAGEMENT ROUTES
router.get('/admins', superAdminController.getAllAdmins);
router.get('/admins/:adminId', superAdminController.getAdmin);
router.post('/admins', superAdminController.createAdmin);
router.put('/admins/:adminId', superAdminController.updateAdmin);
router.delete('/admins/:adminId', superAdminController.deleteAdmin);
router.post('/admins/:adminId/reset-password', superAdminController.resetAdminPassword);

// NEW USER MANAGEMENT ROUTES
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:userId', superAdminController.getUserDetails);
router.post('/users', superAdminController.createUser);
router.put('/users/:userId/status', superAdminController.updateUserStatus);
router.put('/users/:userId/role', superAdminController.updateUserRole);
router.post('/users/bulk', superAdminController.bulkUserOperation);

// USER ACTIVITY AND MONITORING ROUTES
router.get('/users/:userId/timeline', superAdminController.getUserActivityTimeline);
router.get('/monitoring/security-dashboard', superAdminController.getSecurityDashboard);
router.get('/monitoring/admin-performance', superAdminController.getAdminPerformanceMetrics);

// EXISTING SYSTEM ROUTES
router.get('/settings', superAdminController.getSettings);
router.post('/settings', superAdminController.updateSettings);

// EXISTING ADMIN LOGS ROUTES
router.get('/logs', superAdminController.getAdminLogs);
router.get('/logs/export', superAdminController.exportLogs);



// USER MANAGEMENT ROUTES - Add these new routes
router.get('/users', superAdminController.getAllUsers || ((req, res) => {
    res.json({ success: true, data: { users: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } } });
}));

router.get('/users/:userId', superAdminController.getUserDetails || ((req, res) => {
    res.json({ success: true, data: { user: {}, activitySummary: {} } });
}));

router.post('/users', superAdminController.createUser || ((req, res) => {
    res.json({ success: false, message: 'Not implemented yet' });
}));

router.put('/users/:userId/status', superAdminController.updateUserStatus || ((req, res) => {
    res.json({ success: false, message: 'Not implemented yet' });
}));

router.put('/users/:userId/role', superAdminController.updateUserRole || ((req, res) => {
    res.json({ success: false, message: 'Not implemented yet' });
}));

router.post('/users/bulk', superAdminController.bulkUserOperation || ((req, res) => {
    res.json({ success: false, message: 'Not implemented yet' });
}));

// MONITORING ROUTES - Add these new routes
router.get('/users/:userId/timeline', superAdminController.getUserActivityTimeline || ((req, res) => {
    res.json({ success: true, data: { userId: req.params.userId, timeline: [] } });
}));

router.get('/monitoring/security-dashboard', superAdminController.getSecurityDashboard || ((req, res) => {
    res.json({ 
        success: true, 
        data: { 
            activeSessions: 0, 
            securityAlerts: [], 
            failedLogins: { totalFailedAttempts: 0 }, 
            suspiciousActivity: [] 
        } 
    });
}));

router.get('/monitoring/admin-performance', superAdminController.getAdminPerformanceMetrics || ((req, res) => {
    res.json({ success: true, data: [] });
}));


module.exports = router;