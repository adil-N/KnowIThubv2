// middleware/roleAuth.js
const ApiResponse = require('../utils/apiResponse');
// middleware/roleAuth.js
//const ApiResponse = require('../frontend/src/js/utils/apiResponse');


const roleAuth = (roles) => {
    // Convert single role to array if necessary
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        console.log('Role Auth Check:', {
            userRole: req.user?.role,
            requiredRoles: roles,
            path: req.path,
            method: req.method
        });

        // Check if user exists in request
        if (!req.user) {
            console.log('Role Auth Failed: No user in request');
            return res.status(401).json({ 
                success: false,
                message: 'Authentication required' 
            });
        }

        // Check if user has required role
        if (!roles.includes(req.user.role)) {
            console.log('Role Auth Failed: Invalid role', {
                userRole: req.user.role,
                requiredRoles: roles
            });
            return res.status(403).json({ 
                success: false,
                message: 'Insufficient permissions',
                required: roles,
                current: req.user.role
            });
        }

        // Check if profile is completed for admin/super roles
        if (['admin', 'super'].includes(req.user.role) && !req.user.profileCompleted) {
            console.log('Role Auth Failed: Incomplete profile', {
                user: req.user.email,
                role: req.user.role
            });
            return res.status(403).json({ 
                success: false,
                message: 'Please complete your profile before accessing admin resources',
                code: 'PROFILE_INCOMPLETE'
            });
        }

        console.log('Role Auth Successful:', {
            user: req.user.email,
            role: req.user.role,
            requiredRoles: roles
        });

        next();
    };
};

const checkPermission = (permission) => {
    return (req, res, next) => {
        console.log('Permission Check:', {
            user: req.user?.email,
            userRole: req.user?.role,
            requiredPermission: permission,
            path: req.path
        });

        // Define permissions for each role
        const permissionMap = {
            'super': [
                // Basic CRUD permissions
                'create', 'read', 'update', 'delete', 'manage',
                // System level permissions
                'system:admin', 'system:settings', 'system:logs',
                // User management permissions
                'users:manage', 'users:create', 'users:delete',
                // Content management permissions
                'content:manage', 'content:approve',
                // Admin management permissions
                'admin:manage', 'admin:create', 'admin:delete'
            ],
            'admin': [
                // Basic CRUD permissions
                'create', 'read', 'update', 'delete',
                // User management permissions
                'users:view', 'users:update',
                // Content management permissions
                'content:manage', 'content:create', 'content:update',
                // Limited system access
                'system:view'
            ],
            'user': [
                // Basic permissions
                'read',
                // Self-management permissions
                'create:own', 'update:own', 'delete:own',
                // Content permissions
                'content:create', 'content:update:own'
            ]
        };

        const userPermissions = permissionMap[req.user?.role] || [];
        
        // Check if user has required permission
        if (!userPermissions.includes(permission)) {
            console.log('Permission Check Failed:', {
                userPermissions,
                requiredPermission: permission
            });
            return res.status(403).json({ 
                success: false,
                message: 'Insufficient permissions',
                required: permission,
                available: userPermissions
            });
        }

        console.log('Permission Check Successful:', {
            permission,
            userRole: req.user.role
        });

        next();
    };
};

// Helper function to check admin status
const isAdmin = (role) => ['admin', 'super'].includes(role);

// Helper function to check super admin status
const isSuperAdmin = (role) => role === 'super';

// Shorthand middleware for admin-only routes
const adminAuth = (req, res, next) => roleAuth(['admin', 'super'])(req, res, next);

// Shorthand middleware for super-admin-only routes
const superAdminAuth = (req, res, next) => roleAuth(['super'])(req, res, next);

// Export all middleware functions and helpers
module.exports = { 
    roleAuth, 
    checkPermission,
    isAdmin,
    isSuperAdmin,
    adminAuth,
    superAdminAuth
};
