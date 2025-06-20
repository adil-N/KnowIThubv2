// middleware/superAdminAuth.js - Create this new file
const superAdminMiddleware = (req, res, next) => {
    try {
        // Check if user exists and is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user is super admin
        if (req.user.role !== 'super') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }

        next();
    } catch (error) {
        console.error('Super admin middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authorization error'
        });
    }
};

module.exports = superAdminMiddleware;