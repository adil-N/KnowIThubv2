// Create a new file: utils/activityLogger.js

const AdminLog = require('../models/AdminLog');

const activityLogger = {
    async log(data) {
        try {
            await AdminLog.create({
                adminId: data.userId, // Using userId for both admin and regular user actions
                action: data.action,
                details: data.details || {},
                targetUser: data.targetUser || null,
                targetArticle: data.targetArticle || null,
                targetComment: data.targetComment || null,
                ip: data.ip || null,
                userAgent: data.userAgent || null
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
};

module.exports = activityLogger;