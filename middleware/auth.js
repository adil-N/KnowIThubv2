// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Debug logging
        console.log('=== Auth Middleware Started ===', {
            path: req.path,
            method: req.method,
            fullUrl: req.originalUrl
        });

        // Public routes that should bypass authentication
        const publicRoutes = [
            { path: '/api/users/login', method: 'POST' },
            { path: '/api/users/register', method: 'POST' },
            { path: '/api/users/force-change-password', method: 'POST' } // Add this line
        ];

        // Check if current request matches any public route
        const isPublicRoute = publicRoutes.some(route => 
            req.path === route.path && req.method === route.method
        );

        if (isPublicRoute) {
            console.log('Public route detected, bypassing auth check');
            return next();
        }

        // Check if security authorization is enabled
        if (process.env.SECURITY_AUTHORIZATION !== 'enabled') {
            console.warn('⚠️ Security authorization is disabled!');
            return next();
        }

        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            console.log('No token provided for protected route');
            return res.status(401).json({ 
                success: false,
                message: 'Authentication token is required' 
            });
        }

        // Rest of your auth middleware code...
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        if (user.status !== 'active') {
            return res.status(401).json({ 
                success: false,
                message: 'Account is not active' 
            });
        }

        req.token = token;
        req.user = user;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ 
            success: false,
            message: 'Authentication failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication error'
        });
    }
};

module.exports = auth;