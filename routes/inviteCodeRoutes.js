// routes/inviteCodeRoutes.js
const express = require('express');
const router = express.Router();
const inviteCodeController = require('../controllers/inviteCodeController');
const auth = require('../middleware/auth');
const { adminAuth } = require('../middleware/roleAuth');

// Detailed debug logging
console.log('==== Invite Code Routes Initialization ====');
console.log('Controller methods available:', Object.keys(inviteCodeController));
console.log('Auth middleware type:', typeof auth);
console.log('Admin auth middleware type:', typeof adminAuth);

// Verify all required controller methods exist
const requiredMethods = [
    'generateInviteCode',
    'listInviteCodes',
    'deactivateInviteCode',
    'activateInviteCode',
    'updateInviteCodeExpiration'
];

const missingMethods = requiredMethods.filter(method => !inviteCodeController[method]);
if (missingMethods.length > 0) {
    console.error('Missing required controller methods:', missingMethods);
    throw new Error(`Missing required controller methods: ${missingMethods.join(', ')}`);
}

// Routes with error handling
router.post('/generate', 
    auth,
    adminAuth,
    (req, res, next) => inviteCodeController.generateInviteCode(req, res).catch(next)
);

router.get('/list', 
    auth,
    adminAuth,
    (req, res, next) => inviteCodeController.listInviteCodes(req, res).catch(next)
);

router.patch('/:codeId/deactivate', 
    auth,
    adminAuth,
    (req, res, next) => inviteCodeController.deactivateInviteCode(req, res).catch(next)
);

router.patch('/:codeId/activate', 
    auth,
    adminAuth,
    (req, res, next) => inviteCodeController.activateInviteCode(req, res).catch(next)
);

router.patch('/:codeId/expiration', 
    auth,
    adminAuth,
    (req, res, next) => inviteCodeController.updateInviteCodeExpiration(req, res).catch(next)
);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Invite code route error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error in invite code routes',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

console.log('Invite code routes successfully initialized');

module.exports = router;