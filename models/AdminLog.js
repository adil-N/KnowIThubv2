// models/AdminLog.js - Enhanced version with advanced tracking capabilities
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            // User Management Actions
            'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED', 'USER_UPDATED',
            'USER_DELETED', 'USER_PASSWORD_RESET', 'USER_STATUS_CHANGED',
            'USER_ROLE_CHANGED', 'USER_BULK_OPERATION',
            
            // Article Management Actions
            'ARTICLE_CREATED', 'ARTICLE_UPDATED', 'ARTICLE_DELETED', 
            'ARTICLE_VISIBILITY_CHANGED', 'ARTICLE_VIEWED',
            
            // Comment Management Actions
            'COMMENT_ADDED', 'COMMENT_DELETED', 'COMMENT_MODERATED',
            
            // Admin Management Actions
            'ADMIN_LOGIN', 'ADMIN_CREATED', 'ADMIN_UPDATED', 'ADMIN_DELETED', 
            'ADMIN_PASSWORD_RESET', 'ADMIN_SESSION_STARTED', 'ADMIN_SESSION_ENDED',
            
            // System Actions
            'SETTINGS_UPDATED', 'BACKUP_CREATED', 'SYSTEM_MAINTENANCE',
            'SECURITY_ALERT_TRIGGERED', 'SUSPICIOUS_ACTIVITY_DETECTED',
            
            // Security Events
            'FAILED_LOGIN_ATTEMPT', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
            'PASSWORD_CHANGED', 'EMAIL_CHANGED', 'TWO_FACTOR_ENABLED',
            'TWO_FACTOR_DISABLED',
            
            // General
            'ERROR_OCCURRED', 'DATA_EXPORTED', 'BULK_OPERATION_COMPLETED'
        ]
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    targetArticle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: false
    },
    
    // Enhanced tracking fields
    sessionId: String,
    ipAddress: String,
    userAgent: String,
    requestUrl: String,
    requestMethod: String,
    
    // Security and context
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['user_management', 'content_management', 'admin_management', 
               'security', 'system', 'authentication'],
        default: 'system'
    },
    
    // Performance tracking
    executionTime: Number, // milliseconds
    resourcesAffected: [{
        type: String,
        id: String,
        name: String
    }],
    
    // Additional metadata
    metadata: {
        browserInfo: {
            browser: String,
            version: String,
            os: String,
            device: String
        },
        location: {
            country: String,
            city: String,
            timezone: String
        },
        requestSize: Number,
        responseSize: Number
    },
    
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better performance
schema.index({ adminId: 1, timestamp: -1 });
schema.index({ action: 1, timestamp: -1 });
schema.index({ severity: 1, timestamp: -1 });
schema.index({ category: 1, timestamp: -1 });
schema.index({ targetUser: 1, timestamp: -1 });
schema.index({ ipAddress: 1, timestamp: -1 });
schema.index({ sessionId: 1 });

// Static methods
schema.statics.logActivity = async function(data) {
    try {
        // Auto-determine category and severity if not provided
        if (!data.category) {
            data.category = this.determineCategory(data.action);
        }
        
        if (!data.severity) {
            data.severity = this.determineSeverity(data.action);
        }
        
        const log = new this(data);
        await log.save();
        
        // Trigger real-time notifications for high severity events
        if (data.severity === 'high' || data.severity === 'critical') {
            this.triggerSecurityAlert(log);
        }
        
        return log;
    } catch (error) {
        console.error('Error logging admin activity:', error);
        throw error;
    }
};

schema.statics.determineCategory = function(action) {
    const categoryMap = {
        'USER_': 'user_management',
        'ARTICLE_': 'content_management',
        'COMMENT_': 'content_management',
        'ADMIN_': 'admin_management',
        'FAILED_LOGIN': 'security',
        'ACCOUNT_': 'security',
        'PASSWORD_': 'security',
        'SECURITY_': 'security',
        'SUSPICIOUS_': 'security',
        'SETTINGS_': 'system',
        'BACKUP_': 'system',
        'SYSTEM_': 'system'
    };
    
    for (const [prefix, category] of Object.entries(categoryMap)) {
        if (action.startsWith(prefix)) {
            return category;
        }
    }
    
    return 'system';
};

schema.statics.determineSeverity = function(action) {
    const highSeverityActions = [
        'USER_DELETED', 'ADMIN_DELETED', 'ARTICLE_DELETED',
        'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY_DETECTED',
        'SECURITY_ALERT_TRIGGERED', 'USER_ROLE_CHANGED'
    ];
    
    const criticalSeverityActions = [
        'ADMIN_CREATED', 'ADMIN_PASSWORD_RESET', 'SETTINGS_UPDATED',
        'SYSTEM_MAINTENANCE', 'BACKUP_CREATED'
    ];
    
    if (criticalSeverityActions.includes(action)) {
        return 'critical';
    } else if (highSeverityActions.includes(action)) {
        return 'high';
    } else if (action.includes('FAILED') || action.includes('ERROR')) {
        return 'medium';
    }
    
    return 'low';
};

schema.statics.triggerSecurityAlert = async function(log) {
    // This could trigger real-time notifications, emails, etc.
    console.log(`🚨 Security Alert: ${log.action} by ${log.adminId} from ${log.ipAddress}`);
    
    // You could integrate with notification services here
    // await notificationService.sendSecurityAlert(log);
};

schema.statics.getRecentLogs = async function(limit = 20, filters = {}) {
    try {
        const query = {};
        
        // Apply filters
        if (filters.adminId) query.adminId = filters.adminId;
        if (filters.action) query.action = filters.action;
        if (filters.category) query.category = filters.category;
        if (filters.severity) query.severity = filters.severity;
        if (filters.startDate && filters.endDate) {
            query.timestamp = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }
        
        const logs = await this.find(query)
            .populate({
                path: 'targetArticle',
                model: 'Article',
                select: 'displayId articleNumber title author',
                populate: {
                    path: 'author',
                    model: 'User',
                    select: 'firstName lastName email'
                }
            })
            .populate('adminId', 'firstName lastName email role')
            .populate('targetUser', 'firstName lastName email role')
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        return logs.map(log => {
            let articleId = null;
            
            // Format article ID consistently
            if (log.action === 'ARTICLE_UPDATED') {
                if (log.details?.originalArticleNumber) {
                    articleId = `AN-${String(log.details.originalArticleNumber).padStart(5, '0')}`;
                } else if (log.targetArticle?.articleNumber) {
                    articleId = `AN-${String(log.targetArticle.articleNumber).padStart(5, '0')}`;
                }
            } else if (log.targetArticle?.articleNumber) {
                articleId = `AN-${String(log.targetArticle.articleNumber).padStart(5, '0')}`;
            } else if (log.details?.articleNumber) {
                articleId = `AN-${String(log.details.articleNumber).padStart(5, '0')}`;
            }

            // Clean any double AN- prefixes
            if (articleId) {
                articleId = articleId.replace(/AN-AN-/, 'AN-');
            }

            return {
                ...log,
                formattedArticleId: articleId
            };
        });
    } catch (error) {
        console.error('Error getting recent logs:', error);
        throw error;
    }
};

schema.statics.getLogsByDateRange = async function(startDate, endDate, limit = 1000) {
    try {
        const query = {};
        
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        return await this.find(query)
            .populate('adminId', 'firstName lastName email')
            .populate('targetUser', 'firstName lastName email')
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    } catch (error) {
        console.error('Error getting logs by date range:', error);
        throw error;
    }
};

schema.statics.getSecurityEvents = async function(severity = 'high', limit = 50) {
    try {
        return await this.find({
            severity: { $gte: severity },
            category: 'security'
        })
        .populate('adminId', 'firstName lastName email')
        .populate('targetUser', 'firstName lastName email')
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
        console.error('Error getting security events:', error);
        throw error;
    }
};

schema.statics.getAdminActivityStats = async function(adminId, timeframe = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeframe);
        
        const stats = await this.aggregate([
            {
                $match: {
                    adminId: new mongoose.Types.ObjectId(adminId),
                    timestamp: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    lastActivity: { $max: '$timestamp' },
                    actions: { $push: '$action' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
        
        return stats;
    } catch (error) {
        console.error('Error getting admin activity stats:', error);
        throw error;
    }
};

schema.statics.getSuspiciousActivity = async function(timeframe = 24) {
    try {
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - timeframe);
        
        // Find suspicious patterns
        const suspiciousPatterns = await this.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate },
                    $or: [
                        { action: 'FAILED_LOGIN_ATTEMPT' },
                        { severity: 'critical' },
                        { action: { $regex: /SUSPICIOUS|FAILED|ERROR/ } }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        ipAddress: '$ipAddress',
                        adminId: '$adminId'
                    },
                    count: { $sum: 1 },
                    actions: { $push: '$action' },
                    lastActivity: { $max: '$timestamp' }
                }
            },
            {
                $match: {
                    count: { $gte: 3 } // 3 or more suspicious activities
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
        
        return suspiciousPatterns;
    } catch (error) {
        console.error('Error getting suspicious activity:', error);
        throw error;
    }
};

schema.statics.getPerformanceMetrics = async function(timeframe = 7) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeframe);
        
        const metrics = await this.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate },
                    executionTime: { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$action',
                    avgExecutionTime: { $avg: '$executionTime' },
                    maxExecutionTime: { $max: '$executionTime' },
                    minExecutionTime: { $min: '$executionTime' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { avgExecutionTime: -1 }
            }
        ]);
        
        return metrics;
    } catch (error) {
        console.error('Error getting performance metrics:', error);
        throw error;
    }
};

// Instance methods
schema.methods.addResourceAffected = function(type, id, name) {
    this.resourcesAffected.push({ type, id, name });
    return this.save();
};

schema.methods.updateExecutionTime = function(startTime) {
    this.executionTime = Date.now() - startTime;
    return this.save();
};

const AdminLog = mongoose.model('AdminLog', schema);
module.exports = AdminLog;