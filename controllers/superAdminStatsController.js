// controllers/superAdminStatsController.js
const User = require('../models/User');
const Article = require('../models/Article');
const AdminLog = require('../models/AdminLog');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');

const superAdminStatsController = {
    // Use regular function for the main methods that Express calls directly
    async getDashboardStats(req, res) {
        try {
            // Verify super admin status
            if (req.user.role !== 'super') {
                return ApiResponse.forbidden(res, 'Only super admins can access these statistics');
            }

            // Get all required statistics in parallel - use direct references to the controller
            const [
                overviewStats,
                contentStats,
                userStats,
                viewStats,
                engagementStats,
                adminStats
            ] = await Promise.all([
                superAdminStatsController.getOverviewStats(),
                superAdminStatsController.getContentStats(),
                superAdminStatsController.getUserStats(),
                superAdminStatsController.getViewStats(),
                superAdminStatsController.getEngagementStats(),
                superAdminStatsController.getAdminStats()
            ]);

            return ApiResponse.success(res, 'Statistics retrieved successfully', {
                overview: overviewStats,
                content: contentStats,
                users: userStats,
                views: viewStats,
                engagement: engagementStats,
                admin: adminStats
            });
        } catch (error) {
            console.error('Error fetching dashboard statistics:', error);
            return ApiResponse.serverError(res, 'Failed to retrieve statistics');
        }
    },

    async getOverviewStats() {
        // Get summary statistics for the overview section
        const [
            userCounts,
            articleCounts,
            totalViews,
            adminCount,
            recentActivity
        ] = await Promise.all([
            // User counts
            User.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Article counts
            // When counting articles by visibility
            Article.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$hidden', false] }, // Handle if hidden field is missing
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Total views
            Article.aggregate([
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: '$views' }
                    }
                }
            ]),
            // Admin count
            User.countDocuments({ role: { $in: ['admin', 'super'] }, status: 'active' }),
            // Recent activity
            AdminLog.find()
                .sort({ timestamp: -1 })
                .limit(5)
                .populate('adminId', 'firstName lastName email')
        ]);

        // Process user counts
        const users = {
            total: userCounts.reduce((sum, item) => sum + item.count, 0),
            active: userCounts.find(item => item._id === 'active')?.count || 0,
            inactive: userCounts.find(item => item._id === 'inactive')?.count || 0,
            suspended: userCounts.find(item => item._id === 'suspended')?.count || 0
        };

        // Process article counts
        const articles = {
            total: articleCounts.reduce((sum, item) => sum + item.count, 0),
            visible: articleCounts.find(item => item._id === false)?.count || 0,
            hidden: articleCounts.find(item => item._id === true)?.count || 0
        };

        return {
            users,
            articles,
            totalViews: totalViews[0]?.totalViews || 0,
            activeAdmins: adminCount,
            recentActivity: recentActivity.map(activity => ({
                id: activity._id,
                action: activity.action,
                admin: activity.adminId ? `${activity.adminId.firstName} ${activity.adminId.lastName}` : 'System',
                timestamp: activity.timestamp
            }))
        };
    },

    async getContentStats() {
        // Get detailed content statistics
        const [
            sectionDistribution,
            tagDistribution,
            contentCreationTrend,
            contentByAdmin,
            mostViewedArticles,
            mostCommentedArticles
        ] = await Promise.all([
            // Section distribution
            Article.aggregate([
                { $unwind: '$sections' },
                {
                    $group: {
                        _id: '$sections',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'sections',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'sectionInfo'
                    }
                },
                { $unwind: '$sectionInfo' },
                // When counting comments
                {
                    $project: {
                        title: 1,
                        articleId: 1,
                        commentCount: { $size: { $ifNull: ['$comments', []] } }
                    }
                }

            ]),
            // Tag distribution
            Article.aggregate([
                { $unwind: '$tags' },
                {
                    $group: {
                        _id: '$tags',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 20 },
                {
                    $project: {
                        _id: 0,
                        tag: '$_id',
                        count: 1
                    }
                }
            ]),
            // Content creation trend (last 30 days)
            Article.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        count: 1
                    }
                }
            ]),
            // Content by admin
            Article.aggregate([
                {
                    $group: {
                        _id: '$author',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'authorInfo'
                    }
                },
                { $unwind: '$authorInfo' },
                {
                    $project: {
                        _id: 0,
                        author: { $concat: ['$authorInfo.firstName', ' ', '$authorInfo.lastName'] },
                        email: '$authorInfo.email',
                        count: 1
                    }
                }
            ]),
            // Most viewed articles
            Article.find()
                .sort({ views: -1 })
                .limit(10)
                .select('title articleId views viewedBy')
                .populate('author', 'firstName lastName email'),
            // Most commented articles
            Article.aggregate([
                {
                    $project: {
                        title: 1,
                        articleId: 1,
                        commentCount: { $size: { $ifNull: ['$comments', []] } }

                    }
                },
                { $sort: { commentCount: -1 } },
                { $limit: 10 }
            ])
        ]);

        // Process temporary vs permanent articles
        const temporaryArticlesCount = await Article.countDocuments({ isTemporary: true });
        const permanentArticlesCount = await Article.countDocuments({ isTemporary: { $ne: true } });

        return {
            sectionDistribution,
            tagDistribution,
            contentCreationTrend,
            contentByAdmin,
            mostViewedArticles: mostViewedArticles.map(article => ({
                id: article._id,
                title: article.title,
                articleId: article.articleId,
                views: article.views,
                uniqueViewers: article.viewedBy?.length || 0,
                author: article.author ? `${article.author.firstName} ${article.author.lastName}` : 'Unknown'
            })),
            mostCommentedArticles,
            temporaryVsPermanent: {
                temporary: temporaryArticlesCount,
                permanent: permanentArticlesCount
            }
        };
    },

    async getUserStats() {
        // Get detailed user statistics
        const [
            roleDistribution,
            statusDistribution,
            registrationTrend,
            mostActiveUsers,
            lockedAccounts,
            passwordResetRequired
        ] = await Promise.all([
            // Role distribution
            User.aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Status distribution
            User.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Registration trend (last 30 days)
            User.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        count: 1
                    }
                }
            ]),
            // Most active users
            User.aggregate([
                {
                    $match: {
                        lastLogin: { $exists: true }
                    }
                },
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
                // When counting articles and comments
                {
                    $project: {
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        role: 1,
                        lastLogin: 1,
                        articleCount: { $size: { $ifNull: ['$articles', []] } },
                        commentCount: { $size: { $ifNull: ['$comments', []] } },
                        activityScore: { 
                            $add: [
                                { $size: { $ifNull: ['$articles', []] } }, 
                                { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 0.5] }
                            ] 
                        }
                    }
                },
                { $sort: { activityScore: -1 } },
                { $limit: 10 }
            ]),
            // Locked accounts
            User.find({ lockUntil: { $gt: new Date() } })
                .select('firstName lastName email lockUntil loginAttempts')
                .sort({ lockUntil: -1 }),
            // Password reset required
            User.find({ passwordResetRequired: true })
                .select('firstName lastName email')
                .sort({ lastLogin: -1 })
        ]);

        // Process role distribution
        const roles = {
            user: roleDistribution.find(item => item._id === 'user')?.count || 0,
            admin: roleDistribution.find(item => item._id === 'admin')?.count || 0,
            super: roleDistribution.find(item => item._id === 'super')?.count || 0
        };

        // Process status distribution
        const status = {
            active: statusDistribution.find(item => item._id === 'active')?.count || 0,
            inactive: statusDistribution.find(item => item._id === 'inactive')?.count || 0,
            suspended: statusDistribution.find(item => item._id === 'suspended')?.count || 0
        };

        return {
            roleDistribution: roles,
            statusDistribution: status,
            registrationTrend,
            mostActiveUsers,
            lockedAccounts,
            passwordResetRequired
        };
    },

    async getViewStats() {
        // Get detailed view statistics
        const [
            viewTrend,
            topViewers,
            viewsByTimeOfDay,
            viewsByDayOfWeek,
            mostViewedSections
        ] = await Promise.all([
            // View trend (last 30 days)
            Article.aggregate([
                { $unwind: '$viewedBy' },
                {
                    $match: {
                        'viewedBy.timestamp': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedBy.timestamp' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        count: 1
                    }
                }
            ]),
            // Top viewers
            Article.aggregate([
                { $unwind: '$viewedBy' },
                {
                    $group: {
                        _id: '$viewedBy.user',
                        viewCount: { $sum: 1 },
                        articles: { $addToSet: '$_id' }
                    }
                },
                { $sort: { viewCount: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userInfo'
                    }
                },
                { $unwind: '$userInfo' },
                {
                    $project: {
                        _id: 0,
                        user: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] },
                        email: '$userInfo.email',
                        viewCount: 1,
                        uniqueArticles: { $size: { $ifNull: ['$articles', []] } }

                    }
                }
            ]),
            // Views by time of day
            Article.aggregate([
                { $unwind: '$viewedBy' },
                {
                    $project: {
                        hour: { $hour: '$viewedBy.timestamp' }
                    }
                },
                {
                    $group: {
                        _id: '$hour',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        hour: '$_id',
                        count: 1
                    }
                }
            ]),
            // Views by day of week
            Article.aggregate([
                { $unwind: '$viewedBy' },
                {
                    $project: {
                        dayOfWeek: { $dayOfWeek: '$viewedBy.timestamp' }
                    }
                },
                {
                    $group: {
                        _id: '$dayOfWeek',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        day: '$_id',
                        count: 1
                    }
                }
            ]),
            // Most viewed sections
            Article.aggregate([
                { $unwind: '$sections' },
                {
                    $group: {
                        _id: '$sections',
                        totalViews: { $sum: '$views' },
                        articleCount: { $sum: 1 },
                        averageViews: { $avg: '$views' }
                    }
                },
                { $sort: { totalViews: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'sections',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'sectionInfo'
                    }
                },
                { $unwind: '$sectionInfo' },
                {
                    $project: {
                        _id: 0,
                        section: '$sectionInfo.name',
                        totalViews: 1,
                        articleCount: 1,
                        averageViews: { $round: ['$averageViews', 1] }
                    }
                }
            ])
        ]);

        // Get who viewed what (detailed view tracking)
        const whoViewedWhat = await Article.aggregate([
            { $unwind: '$viewedBy' },
            { $sort: { 'viewedBy.timestamp': -1 } },
            { $limit: 100 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'viewedBy.user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: 0,
                    articleId: 1,
                    title: 1,
                    user: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] },
                    email: '$userInfo.email',
                    timestamp: '$viewedBy.timestamp'
                }
            }
        ]);

        return {
            viewTrend,
            topViewers,
            viewsByTimeOfDay,
            viewsByDayOfWeek,
            mostViewedSections,
            whoViewedWhat,
            totalViews: await Article.aggregate([
                { $group: { _id: null, total: { $sum: '$views' } } }
            ]).then(result => result[0]?.total || 0),
            uniqueViewers: await Article.aggregate([
                { $unwind: '$viewedBy' },
                { $group: { _id: '$viewedBy.user' } },
                { $count: 'total' }
            ]).then(result => result[0]?.total || 0)
        };
    },

    async getEngagementStats() {
        // Get detailed engagement statistics
        const [
            commentActivity,
            bookmarkStats,
            readingPatterns,
            mostEngagedUsers
        ] = await Promise.all([
            // Comment activity
            Comment.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 30 },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        count: 1
                    }
                }
            ]),
            // Bookmark stats
            User.aggregate([
                { $match: { 'bookmarks.0': { $exists: true } } },
               // When counting bookmarks
                {
                    $project: {
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        bookmarkCount: { $size: { $ifNull: ['$bookmarks', []] } }
                    }
                },
                { $sort: { bookmarkCount: -1 } },
                { $limit: 10 }
            ]),
            // Reading patterns (articles marked as read)
            Article.aggregate([
                { $unwind: '$reads' },
                {
                    $group: {
                        _id: '$reads.user',
                        readCount: { $sum: 1 },
                        lastRead: { $max: '$reads.readAt' }
                    }
                },
                { $sort: { readCount: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userInfo'
                    }
                },
                { $unwind: '$userInfo' },
                {
                    $project: {
                        _id: 0,
                        user: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] },
                        email: '$userInfo.email',
                        readCount: 1,
                        lastRead: 1
                    }
                }
            ]),
            // Most engaged users (combined metric)
            User.aggregate([
                {
                    $lookup: {
                        from: 'articles',
                        localField: '_id',
                        foreignField: 'viewedBy.user',
                        as: 'viewedArticles'
                    }
                },
                {
                    $lookup: {
                        from: 'articles',
                        localField: '_id',
                        foreignField: 'reads.user',
                        as: 'readArticles'
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
                    $project: {
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        role: 1,
                        viewCount: { $size: { $ifNull: ['$viewedArticles', []] } },
                        readCount: { $size: { $ifNull: ['$readArticles', []] } },
                        commentCount: { $size: { $ifNull: ['$comments', []] } },
                        bookmarkCount: { $size: { $ifNull: ['$bookmarks', []] } },

                        engagementScore: {
                            $add: [
                                { $multiply: [{ $size: { $ifNull: ['$viewedArticles', []] } }, 1] },
                                { $multiply: [{ $size: { $ifNull: ['$readArticles', []] } }, 2] },
                                { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 3] },
                                { $multiply: [{ $size: { $ifNull: ['$bookmarks', []] } }, 2] }

                            ]
                        }
                    }
                },
                { $sort: { engagementScore: -1 } },
                { $limit: 10 }
            ])
        ]);

        // Calculate engagement metrics
        const totalArticles = await Article.countDocuments();
        const totalComments = await Comment.countDocuments();
        const commentToArticleRatio = totalArticles > 0 ? totalComments / totalArticles : 0;

        // Calculate view-to-comment conversion
        const totalViews = await Article.aggregate([
            { $group: { _id: null, total: { $sum: '$views' } } }
        ]).then(result => result[0]?.total || 0);
        
        const viewToCommentRate = totalViews > 0 ? (totalComments / totalViews) * 100 : 0;

        return {
            commentActivity,
            bookmarkStats,
            readingPatterns,
            mostEngagedUsers,
            engagementMetrics: {
                totalComments,
                commentsPerArticle: commentToArticleRatio.toFixed(2),
                viewToCommentRate: viewToCommentRate.toFixed(2) + '%',
                totalBookmarks: await User.aggregate([
                    { $unwind: '$bookmarks' },
                    { $count: 'total' }
                ]).then(result => result[0]?.total || 0)
            }
        };
    },

    async getAdminStats() {
        // Get detailed admin statistics
        const [
            adminActionDistribution,
            adminActivityTrend,
            mostActiveAdmins,
            criticalActions
        ] = await Promise.all([
            // Admin action distribution
            AdminLog.aggregate([
                {
                    $group: {
                        _id: '$action',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),
            // Admin activity trend
            AdminLog.aggregate([
                {
                    $match: {
                        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        count: 1
                    }
                }
            ]),
            // Most active admins
            AdminLog.aggregate([
                {
                    $group: {
                        _id: '$adminId',
                        actionCount: { $sum: 1 },
                        lastAction: { $max: '$timestamp' }
                    }
                },
                { $sort: { actionCount: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'adminInfo'
                    }
                },
                { $unwind: '$adminInfo' },
                {
                    $project: {
                        _id: 0,
                        admin: { $concat: ['$adminInfo.firstName', ' ', '$adminInfo.lastName'] },
                        email: '$adminInfo.email',
                        role: '$adminInfo.role',
                        actionCount: 1,
                        lastAction: 1
                    }
                }
            ]),
            // Critical actions
            AdminLog.find({
                action: { 
                    $in: [
                        'USER_DELETED', 
                        'ADMIN_DELETED', 
                        'ARTICLE_DELETED', 
                        'SETTINGS_UPDATED',
                        'BACKUP_CREATED',
                        'SYSTEM_MAINTENANCE'
                    ] 
                }
            })
            .sort({ timestamp: -1 })
            .limit(20)
            .populate('adminId', 'firstName lastName email')
        ]);

        // Get content creation by admin
        const contentByAdmin = await Article.aggregate([
            {
                $group: {
                    _id: '$author',
                    articleCount: { $sum: 1 }
                }
            },
            { $sort: { articleCount: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'adminInfo'
                }
            },
            { $unwind: '$adminInfo' },
            { $match: { 'adminInfo.role': { $in: ['admin', 'super'] } } },
            {
                $project: {
                    _id: 0,
                    admin: { $concat: ['$adminInfo.firstName', ' ', '$adminInfo.lastName'] },
                    email: '$adminInfo.email',
                    role: '$adminInfo.role',
                    articleCount: 1
                }
            },
            { $limit: 10 }
        ]);

        return {
            adminActionDistribution,
            adminActivityTrend,
            mostActiveAdmins,
            criticalActions: criticalActions.map(action => ({
                id: action._id,
                action: action.action,
                admin: action.adminId ? `${action.adminId.firstName} ${action.adminId.lastName}` : 'System',
                email: action.adminId?.email,
                details: action.details,
                timestamp: action.timestamp
            })),
            contentByAdmin,
            totalAdmins: await User.countDocuments({ role: { $in: ['admin', 'super'] } }),
            totalActions: await AdminLog.countDocuments()
        };
    },

    async getArticleViewDetails(req, res) {
        try {
            const { articleId } = req.params;
            
            // Verify super admin status
            if (req.user.role !== 'super') {
                return ApiResponse.forbidden(res, 'Only super admins can access these statistics');
            }

            // Find the article
            const article = await Article.findOne({ articleId })
                .populate({
                    path: 'viewedBy.user',
                    select: 'firstName lastName email role'
                });

            if (!article) {
                return ApiResponse.notFound(res, 'Article not found');
            }

            // Format view details
            const viewDetails = article.viewedBy.map(view => ({
                user: view.user ? `${view.user.firstName} ${view.user.lastName}` : 'Unknown',
                email: view.user?.email,
                role: view.user?.role,
                timestamp: view.timestamp
            }));

            // Get view statistics
            const viewsByHour = Array(24).fill(0);
            const viewsByDay = Array(7).fill(0);
            
            article.viewedBy.forEach(view => {
                const date = new Date(view.timestamp);
                const hour = date.getHours();
                const day = date.getDay();
                
                viewsByHour[hour]++;
                viewsByDay[day]++;
            });

            return ApiResponse.success(res, 'Article view details retrieved successfully', {
                article: {
                    id: article._id,
                    articleId: article.articleId,
                    title: article.title,
                    totalViews: article.views,
                    uniqueViewers: article.viewedBy.length
                },
                viewDetails: viewDetails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
                viewStats: {
                    viewsByHour: viewsByHour.map((count, hour) => ({ hour, count })),
                    viewsByDay: viewsByDay.map((count, day) => ({ day, count }))
                }
            });
        } catch (error) {
            console.error('Error fetching article view details:', error);
            return ApiResponse.serverError(res, 'Failed to retrieve article view details');
        }
    },

    async getUserActivityDetails(req, res) {
        try {
            const { userId } = req.params;
            
            // Verify super admin status
            if (req.user.role !== 'super') {
                return ApiResponse.forbidden(res, 'Only super admins can access these statistics');
            }

            // Find the user
            const user = await User.findById(userId).select('-password');
            if (!user) {
                return ApiResponse.notFound(res, 'User not found');
            }

            // Get user's viewed articles
            const viewedArticles = await Article.find({ 'viewedBy.user': userId })
                .select('title articleId views viewedBy')
                .sort({ 'viewedBy.timestamp': -1 });

            // Format viewed articles
            const formattedViewedArticles = viewedArticles.map(article => {
                const viewRecord = article.viewedBy.find(v => v.user.toString() === userId.toString());
                return {
                    id: article._id,
                    title: article.title,
                    articleId: article.articleId,
                    viewedAt: viewRecord?.timestamp
                };
            });

            // Get user's comments
            const comments = await Comment.find({ author: userId })
                .sort({ createdAt: -1 })
                .populate('article', 'title articleId');

            // Get user's bookmarks
            const bookmarkedArticles = await Article.find({ _id: { $in: user.bookmarks } })
                .select('title articleId');

            // Get admin logs if user is admin
            let adminLogs = [];
            if (user.role === 'admin' || user.role === 'super') {
                adminLogs = await AdminLog.find({ adminId: userId })
                    .sort({ timestamp: -1 })
                    .limit(50);
            }

            return ApiResponse.success(res, 'User activity details retrieved successfully', {
                user: {
                    id: user._id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                },
                activity: {
                    viewedArticles: formattedViewedArticles,
                    comments: comments.map(comment => ({
                        id: comment._id,
                        content: comment.content,
                        article: comment.article ? {
                            id: comment.article._id,
                            title: comment.article.title,
                            articleId: comment.article.articleId
                        } : null,
                        createdAt: comment.createdAt
                    })),
                    bookmarks: bookmarkedArticles.map(article => ({
                        id: article._id,
                        title: article.title,
                        articleId: article.articleId
                    })),
                    adminLogs: adminLogs.map(log => ({
                        id: log._id,
                        action: log.action,
                        details: log.details,
                        timestamp: log.timestamp
                    }))
                },
                stats: {
                    totalViews: formattedViewedArticles.length,
                    totalComments: comments.length,
                    totalBookmarks: bookmarkedArticles.length,
                    totalAdminActions: adminLogs.length
                }
            });
        } catch (error) {
            console.error('Error fetching user activity details:', error);
            return ApiResponse.serverError(res, 'Failed to retrieve user activity details');
        }
    }
};

module.exports = superAdminStatsController;
