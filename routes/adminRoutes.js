// routes/adminRoutes.js - Fixed with proper pagination support
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const articleController = require('../controllers/articleController');
const adminController = require('../controllers/adminController');
const User = require('../models/User');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const { adminAuth } = require('../middleware/roleAuth');
const { roleAuth } = require('../middleware/roleAuth');
const AdminLog = require('../models/AdminLog');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Middleware to check admin role
const checkAdminRole = (req, res, next) => {
    console.log('Checking admin role:', {
        userRole: req.user?.role,
        hasAccess: req.user && ['admin', 'super'].includes(req.user.role)
    });

    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

// Middleware to check super admin role
const checkSuperAdminRole = (req, res, next) => {
    if (!req.user || req.user.role !== 'super') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Super admin privileges required.'
        });
    }
    next();
};

// Debug middleware
const debugMiddleware = (req, res, next) => {
    console.log('Admin route accessed:', {
        path: req.path,
        method: req.method,
        hasAuth: !!req.headers.authorization,
        user: req.user ? {
            id: req.user._id,
            role: req.user.role,
            email: req.user.email
        } : null
    });
    next();
};

// Apply middleware 
router.use(auth);
router.use(debugMiddleware);

// Stats route
router.get('/stats', checkAdminRole, adminController.getStats);

// Article Management Routes
router.get('/articles/stats', checkAdminRole, articleController.getArticleStats);

// FIXED: Admin articles route with proper pagination
router.get('/articles', checkAdminRole, async (req, res) => {
    try {
        // Extract pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        console.log('Admin articles pagination:', { page, limit, skip });

        // Get total count for pagination
        const totalItems = await Article.countDocuments();

        // Get articles with pagination
        const articles = await Article.find()
            .populate('author', 'email firstName lastName')
            .populate('comments')
            .select('title content author hidden createdAt articleId comments')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalItems / limit);
        
        const pagination = {
            currentPage: page,
            totalPages,
            totalItems,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null
        };

        console.log('Pagination metadata:', pagination);

        res.json({
            success: true,
            data: articles,
            pagination,
            count: articles.length
        });

    } catch (error) {
        console.error('Error fetching paginated articles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching articles',
            error: error.message
        });
    }
});

router.post('/articles/bulk-delete', checkAdminRole, articleController.bulkDeleteArticles);
router.post('/articles/bulk-toggle', checkAdminRole, articleController.bulkToggleVisibility);
router.delete('/articles/:id', checkAdminRole, articleController.deleteArticle);
router.get('/articles/:id', checkAdminRole, articleController.getArticle);
router.put('/articles/:id', checkAdminRole, articleController.updateArticle);
router.post('/articles/toggle/:id', checkAdminRole, articleController.toggleVisibility);
router.delete('/articles/:id/files/:filename', checkAdminRole, articleController.deleteFile);

// User Management Routes - UPDATED with status filtering support
router.get('/users', checkAdminRole, async (req, res) => {
    try {
        const { status } = req.query; // NEW: Add status filtering support
        
        let filter = {};
        if (status && ['pending', 'active', 'inactive', 'suspended'].includes(status)) {
            filter.status = status;
        }
        
        const users = await User.find(filter) // UPDATED: Apply filter
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();
        
        res.json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error('Error in /admin/users route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching users',
            error: error.message 
        });
    }
});

// NEW: User approval routes
router.get('/users/pending', checkAdminRole, adminController.getPendingUsers);
router.post('/users/:userId/approve', checkAdminRole, adminController.approveUser);
router.post('/users/:userId/reject', checkAdminRole, adminController.rejectUser);

// NEW: Status update route for activate/deactivate functionality
router.patch('/users/:userId/status', checkAdminRole, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role === 'super') {
            return res.status(403).json({ success: false, message: 'Cannot modify super admin status' });
        }

        user.status = status;
        await user.save();

        res.json({ success: true, message: 'User status updated successfully' });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ success: false, message: 'Error updating user status' });
    }
});

// EXISTING: Password reset route
router.post('/users/:userId/reset-password', checkAdminRole, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const tempPassword = `Welcome${Math.floor(100000 + Math.random() * 900000)}!`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        await User.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            passwordResetRequired: true,
            loginAttempts: 0,
            lockUntil: null,
            $set: {
                passwordResetAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Password reset successful',
            data: { 
                temporaryPassword: tempPassword,
                email: user.email,
                requiresReset: true
            }
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error resetting password',
            error: error.message 
        });
    }
});

// EXISTING: User deletion route
router.delete('/users/:userId', checkAdminRole, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role === 'super') {
            return res.status(403).json({ success: false, message: 'Cannot delete super admin' });
        }

        await user.deleteOne();
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Error deleting user' });
    }
});

// EXISTING: Role update route
router.patch('/users/:userId/role', checkSuperAdminRole, async (req, res) => {
    try {
        const { role } = req.body;
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role === 'super') {
            return res.status(403).json({ success: false, message: 'Cannot modify super admin role' });
        }

        user.role = role;
        await user.save();

        res.json({ success: true, message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, message: 'Error updating user role' });
    }
});

module.exports = router;