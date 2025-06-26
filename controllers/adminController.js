// controllers/adminController.js - Complete Fixed Version
const User = require('../models/User');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const bcrypt = require('bcryptjs');
const inviteCodeManager = require('../utils/inviteCodeManager');
const ApiResponse = require('../utils/apiResponse');
const AdminLog = require('../models/AdminLog');

const adminController = {
    getStats: async (req, res) => {
        try {
            console.log('=== Starting admin stats fetch ===');
            
            // Basic stats
            const [totalUsers, activeUsers, pendingUsers, inactiveUsers, adminUsers] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ status: 'active' }),
                User.countDocuments({ status: 'pending' }),
                User.countDocuments({ status: 'inactive' }),
                User.countDocuments({ role: 'admin' })
            ]);

            const [totalArticles, hiddenArticles, totalComments] = await Promise.all([
                Article.countDocuments(),
                Article.countDocuments({ hidden: true }),
                Comment.countDocuments()
            ]);

            console.log('Basic stats:', { totalUsers, activeUsers, totalArticles, totalComments });

            // Most Active Users with improved error handling
            let mostActiveUsers = [];
            try {
                const mostActiveUsersResult = await User.aggregate([
                    {
                        $lookup: {
                            from: 'articles',
                            localField: '_id',
                            foreignField: 'author',
                            as: 'articles'
                        }
                    },
                    {
                        $lookup: {
                            from: 'comments',
                            localField: '_id',
                            foreignField: 'author',
                            as: 'comments'
                        }
                    },
                    {
                        $addFields: {
                            articleCount: { $size: '$articles' },
                            commentCount: { $size: '$comments' },
                            lastActive: {
                                $max: [
                                    { $ifNull: ['$lastLogin', new Date(0)] },
                                    { $max: { $ifNull: ['$articles.createdAt', []] } },
                                    { $max: { $ifNull: ['$comments.createdAt', []] } }
                                ]
                            },
                            lastWeekLogin: {
                                $cond: {
                                    if: {
                                        $gte: [
                                            { $ifNull: ['$lastLogin', new Date(0)] }, 
                                            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                        ]
                                    },
                                    then: 5,
                                    else: 0
                                }
                            }
                        }
                    },
                    {
                        $addFields: {
                            activityScore: {
                                $add: [
                                    { $multiply: ['$articleCount', 10] },
                                    { $multiply: ['$commentCount', 2] },
                                    '$lastWeekLogin'
                                ]
                            }
                        }
                    },
                    {
                        $match: {
                            $or: [
                                { articleCount: { $gt: 0 } },
                                { commentCount: { $gt: 0 } },
                                { lastLogin: { $exists: true } }
                            ]
                        }
                    },
                    {
                        $project: {
                            _id: 1, 
                            email: 1,
                            firstName: 1,
                            lastName: 1,
                            articleCount: 1,
                            commentCount: 1,
                            lastActive: 1,
                            activityScore: 1
                        }
                    },
                    { $sort: { activityScore: -1 } },
                    { $limit: 10 }
                ]);
                
                mostActiveUsers = mostActiveUsersResult || [];
                console.log('Most active users found:', mostActiveUsers.length);
            } catch (error) {
                console.error('Error fetching most active users:', error);
                // Fallback: get basic user list
                try {
                    const fallbackUsers = await User.find({})
                        .select('email firstName lastName lastLogin createdAt')
                        .sort({ lastLogin: -1 })
                        .limit(5)
                        .lean();
                    
                    mostActiveUsers = fallbackUsers.map(user => ({
                        ...user,
                        articleCount: 0,
                        commentCount: 0,
                        activityScore: 1,
                        lastActive: user.lastLogin || user.createdAt
                    }));
                } catch (fallbackError) {
                    console.error('Fallback user query failed:', fallbackError);
                    mostActiveUsers = [];
                }
            }

            // Top Articles with improved aggregation
            let topArticles = [];
            try {
                const topArticlesResult = await Article.aggregate([
                    {
                        $match: {
                            $and: [
                                { hidden: { $ne: true } },
                                { title: { $exists: true } },
                                { author: { $exists: true } }
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: 'comments',
                            localField: '_id',
                            foreignField: 'article',
                            as: 'comments'
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'authorDetails'
                        }
                    },
                    {
                        $addFields: {
                            commentCount: { $size: '$comments' },
                            author: { $arrayElemAt: ['$authorDetails', 0] },
                            viewCount: { $ifNull: ['$views', 0] }
                        }
                    },
                    {
                        $addFields: {
                            engagementScore: {
                                $add: [
                                    { $multiply: ['$commentCount', 5] },
                                    { $multiply: ['$viewCount', 1] }
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            'author.email': 1,
                            'author.firstName': 1,
                            'author.lastName': 1,
                            commentCount: 1,
                            views: '$viewCount',
                            createdAt: 1,
                            engagementScore: 1,
                            articleId: 1
                        }
                    },
                    { $sort: { engagementScore: -1, createdAt: -1 } },
                    { $limit: 10 }
                ]);
                
                topArticles = topArticlesResult || [];
                console.log('Top articles found:', topArticles.length);
            } catch (error) {
                console.error('Error fetching top articles:', error);
                // Fallback: get recent articles
                try {
                    const fallbackArticles = await Article.find({ hidden: { $ne: true } })
                        .populate('author', 'email firstName lastName')
                        .select('title author createdAt views articleId')
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .lean();

                    topArticles = fallbackArticles.map(article => ({
                        ...article,
                        commentCount: 0,
                        engagementScore: article.views || 1,
                        views: article.views || 0
                    }));
                } catch (fallbackError) {
                    console.error('Fallback articles query failed:', fallbackError);
                    topArticles = [];
                }
            }

            // Latest Activity with comprehensive tracking
            let latestActivity = [];
            try {
                // Get recent admin logs
                const adminLogsResult = await AdminLog.aggregate([
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'adminId',
                            foreignField: '_id',
                            as: 'user'
                        }
                    },
                    { 
                        $unwind: {
                            path: '$user',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $project: {
                            'user.email': 1,
                            'user.firstName': 1,
                            'user.lastName': 1,
                            action: 1,
                            details: 1,
                            timestamp: 1
                        }
                    },
                    { $sort: { timestamp: -1 } },
                    { $limit: 10 }
                ]);

                latestActivity = adminLogsResult || [];

                // Add recent user activities if admin logs are empty or insufficient
                if (latestActivity.length < 5) {
                    console.log('Adding recent user activities to supplement admin logs...');
                    
                    const recentActivities = [];
                    
                    // Recent user registrations
                    try {
                        const recentUsers = await User.find({
                            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                        })
                        .select('email firstName lastName createdAt')
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .lean();

                        recentUsers.forEach(user => {
                            recentActivities.push({
                                user: { email: user.email, firstName: user.firstName, lastName: user.lastName },
                                action: 'USER_CREATED',
                                details: 'New user registration',
                                timestamp: user.createdAt
                            });
                        });
                    } catch (userError) {
                        console.error('Error fetching recent users:', userError);
                    }

                    // Recent articles
                    try {
                        const recentArticles = await Article.find({
                            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                        })
                        .populate('author', 'email firstName lastName')
                        .select('title author createdAt')
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .lean();

                        recentArticles.forEach(article => {
                            recentActivities.push({
                                user: { 
                                    email: article.author?.email || 'Unknown', 
                                    firstName: article.author?.firstName || 'Unknown', 
                                    lastName: article.author?.lastName || 'User' 
                                },
                                action: 'ARTICLE_CREATED',
                                details: `Created article: ${article.title}`,
                                timestamp: article.createdAt
                            });
                        });
                    } catch (articleError) {
                        console.error('Error fetching recent articles:', articleError);
                    }

                    // Recent comments
                    try {
                        const recentComments = await Comment.find({
                            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                        })
                        .populate('author', 'email firstName lastName')
                        .populate('article', 'title')
                        .select('author article createdAt')
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .lean();

                        recentComments.forEach(comment => {
                            recentActivities.push({
                                user: { 
                                    email: comment.author?.email || 'Unknown', 
                                    firstName: comment.author?.firstName || 'Unknown', 
                                    lastName: comment.author?.lastName || 'User' 
                                },
                                action: 'COMMENT_ADDED',
                                details: `Commented on: ${comment.article?.title || 'Unknown article'}`,
                                timestamp: comment.createdAt
                            });
                        });
                    } catch (commentError) {
                        console.error('Error fetching recent comments:', commentError);
                    }

                    // Recent logins
                    try {
                        const recentLogins = await User.find({
                            lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                        })
                        .select('email firstName lastName lastLogin')
                        .sort({ lastLogin: -1 })
                        .limit(50)
                        .lean();

                        recentLogins.forEach(user => {
                            recentActivities.push({
                                user: { email: user.email, firstName: user.firstName, lastName: user.lastName },
                                action: 'USER_LOGIN',
                                details: 'User logged in',
                                timestamp: user.lastLogin
                            });
                        });
                    } catch (loginError) {
                        console.error('Error fetching recent logins:', loginError);
                    }

                    // Combine admin logs with user activities
                    latestActivity = [...latestActivity, ...recentActivities];
                    
                    // Sort all activities by timestamp
                    latestActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    latestActivity = latestActivity.slice(0, 20);
                }
                
                console.log('Latest activity items:', latestActivity.length);
            } catch (error) {
                console.error('Error fetching latest activity:', error);
                latestActivity = [];
            }

            // Today's activity stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [todayLogins, newArticles, newComments, activeUsersToday] = await Promise.all([
                User.countDocuments({ lastLogin: { $gte: today } }),
                Article.countDocuments({ createdAt: { $gte: today } }),
                Comment.countDocuments({ createdAt: { $gte: today } }),
                User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
            ]);

            // Activity Timeline (last 7 days)
            const last7Days = [...Array(7)].map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return date.toISOString().split('T')[0];
            });

            const activityPromises = last7Days.map(async date => {
                const startDate = new Date(date);
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 1);

                const [logins, articles, comments] = await Promise.all([
                    User.countDocuments({
                        lastLogin: { $gte: startDate, $lt: endDate }
                    }),
                    Article.countDocuments({
                        createdAt: { $gte: startDate, $lt: endDate }
                    }),
                    Comment.countDocuments({
                        createdAt: { $gte: startDate, $lt: endDate }
                    })
                ]);

                return {
                    date,
                    logins,
                    articles,
                    comments,
                    total: logins + articles + comments
                };
            });

            const activityData = await Promise.all(activityPromises);

            // User Contributions
            let userContributions = [];
            try {
                const userContributionsResult = await User.aggregate([
                    {
                        $lookup: {
                            from: 'articles',
                            localField: '_id',
                            foreignField: 'author',
                            as: 'articles'
                        }
                    },
                    {
                        $lookup: {
                            from: 'comments',
                            localField: '_id',
                            foreignField: 'author',
                            as: 'comments'
                        }
                    },
                    {
                        $addFields: {
                            articlesCount: { $size: '$articles' },
                            commentsCount: { $size: '$comments' },
                            totalContributions: {
                                $add: [
                                    { $size: '$articles' },
                                    { $size: '$comments' }
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            email: 1,
                            role: 1,
                            lastLogin: 1,
                            articlesCount: 1,
                            commentsCount: 1,
                            totalContributions: 1
                        }
                    },
                    { $sort: { totalContributions: -1 } }
                ]);
                
                userContributions = userContributionsResult || [];
            } catch (error) {
                console.error('Error fetching user contributions:', error);
                userContributions = [];
            }

            // Compile all stats
            const stats = {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    pending: pendingUsers,
                    inactive: inactiveUsers,
                    admins: adminUsers
                },
                content: {
                    articles: totalArticles,
                    comments: totalComments,
                    hiddenArticles
                },
                activity: {
                    todayLogins,
                    newArticles,
                    newComments,
                    activeUsers: activeUsersToday
                },
                mostActiveUsers,
                topArticles,
                latestActivity,
                userContributions,
                userActivity: {
                    labels: activityData.map(d => d.date),
                    values: activityData.map(d => d.total)
                },
                contentGrowth: {
                    labels: activityData.map(d => d.date),
                    articles: activityData.map(d => d.articles),
                    comments: activityData.map(d => d.comments)
                },
                system: {
                    lastBackup: process.env.LAST_BACKUP_DATE || null,
                    storageUsed: await calculateStorageUsed()
                }
            };

            console.log('Final stats summary:', {
                usersTotal: stats.users.total,
                articlesTotal: stats.content.articles,
                mostActiveUsersCount: stats.mostActiveUsers.length,
                topArticlesCount: stats.topArticles.length,
                latestActivityCount: stats.latestActivity.length,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error fetching admin statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching statistics',
                error: error.message
            });
        }
    },
    
    // Get all users - KEEP EXISTING FUNCTIONALITY
    getUsers: async (req, res) => {
        try {
            const { status } = req.query;
            
            let filter = {};
            if (status && ['pending', 'active', 'inactive', 'suspended'].includes(status)) {
                filter.status = status;
            }

            const users = await User.find(filter)
                .select('email firstName lastName role status createdAt lastLogin')
                .sort({ createdAt: -1 })
                .lean();

            return res.json({
                success: true,
                data: users,
                count: users.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching users',
                error: error.message
            });
        }
    },
    
    // Get admin users
    getAdmins: async (req, res) => {
        try {
            const admins = await User.find({ role: 'admin' })
                .select('-password')
                .sort({ createdAt: -1 });
            res.json({ success: true, data: admins });
        } catch (error) {
            console.error('Error fetching admins:', error);
            res.status(500).json({ success: false, message: 'Error fetching admins' });
        }
    },

    // Reset user password
    resetUserPassword: async (req, res) => {
        try {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Generate a simpler but still secure temporary password
            const tempPassword = `TempPass${Math.floor(10000 + Math.random() * 90000)}`; // Format: TempPass12345

            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(tempPassword, salt);

            // Update user with new password and force reset
            await User.findByIdAndUpdate(user._id, {
                password: hashedPassword,
                passwordResetRequired: true,
                loginAttempts: 0,
                lockUntil: null,
                $set: {
                    passwordResetAt: new Date()
                }
            });

            console.log('Password reset completed for user:', user.email);

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
            console.error('Error resetting password:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error resetting password',
                error: error.message 
            });
        }
    },

    // Delete user
    deleteUser: async (req, res) => {
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
    },

    // Update user status
    updateUserStatus: async (req, res) => {
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
    },

    // Update user role (super admin only)
    updateUserRole: async (req, res) => {
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
    },
    
    // Update admin name
    updateAdminName: async (req, res) => {
        try {
            const { firstName, lastName } = req.body;
            const admin = await User.findById(req.params.adminId);
            
            if (!admin || admin.role !== 'admin') {
                return res.status(404).json({ success: false, message: 'Admin not found' });
            }

            admin.firstName = firstName;
            admin.lastName = lastName;
            await admin.save();

            res.json({ success: true, message: 'Admin name updated successfully' });
        } catch (error) {
            console.error('Error updating admin name:', error);
            res.status(500).json({ success: false, message: 'Error updating admin name' });
        }
    },

    // Get pending users - KEEP EXISTING FUNCTIONALITY
    getPendingUsers: async (req, res) => {
        try {
            const pendingUsers = await User.find({ status: 'pending' })
                .select('email firstName lastName createdAt')
                .sort({ createdAt: -1 })
                .lean();

            return res.json({
                success: true,
                data: pendingUsers,
                count: pendingUsers.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching pending users:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching pending users',
                error: error.message
            });
        }
    },

    // Approve user - KEEP EXISTING FUNCTIONALITY
    approveUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if (user.status !== 'pending') {
                return res.status(400).json({ success: false, message: 'User is not pending approval' });
            }

            user.status = 'active';
            await user.save();

            console.log('User approved by admin:', {
                userId: user._id,
                email: user.email,
                approvedBy: req.user._id
            });

            res.json({ 
                success: true, 
                message: 'User approved successfully',
                data: {
                    userId: user._id,
                    email: user.email,
                    status: user.status
                }
            });
        } catch (error) {
            console.error('Error approving user:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error approving user',
                error: error.message 
            });
        }
    },

    // Reject user - KEEP EXISTING FUNCTIONALITY
    rejectUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if (user.status !== 'pending') {
                return res.status(400).json({ success: false, message: 'User is not pending approval' });
            }

            console.log('User rejected by admin:', {
                userId: user._id,
                email: user.email,
                rejectedBy: req.user._id
            });

            // Delete the user record completely
            await user.deleteOne();

            res.json({ 
                success: true, 
                message: 'User rejected and removed successfully'
            });
        } catch (error) {
            console.error('Error rejecting user:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error rejecting user',
                error: error.message 
            });
        }
    }
};

// Helper function to calculate storage used
async function calculateStorageUsed() {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const uploadsPath = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsPath)) {
            return 0;
        }
        
        const calculateDirectorySize = (dirPath) => {
            let totalSize = 0;
            try {
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    const stats = fs.statSync(filePath);
                    if (stats.isDirectory()) {
                        totalSize += calculateDirectorySize(filePath);
                    } else {
                        totalSize += stats.size;
                    }
                }
            } catch (error) {
                console.error('Error calculating directory size:', error);
            }
            return totalSize;
        };
        
        return calculateDirectorySize(uploadsPath);
    } catch (error) {
        console.error('Error calculating storage:', error);
        return 0;
    }
}

module.exports = adminController;
