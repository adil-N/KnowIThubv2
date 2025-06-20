// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Debug middleware for user routes
router.use((req, res, next) => {
    console.log('User route accessed:', {
        method: req.method,
        path: req.path,
        body: req.method === 'POST' ? req.body : undefined,
        auth: !!req.headers.authorization
    });
    next();
});

// Public routes
router.post('/login', userController.login);
router.post('/register', userController.register);

// Protected routes (require authentication)
router.use(auth);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/change-password', userController.changePassword);
router.post('/force-change-password', userController.forceChangePassword);
router.get('/status/:email', userController.getUserStatus);

module.exports = router;