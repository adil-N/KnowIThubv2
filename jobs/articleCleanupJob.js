// jobs/articleCleanupJob.js
const Article = require('../models/Article');

const cleanupExpiredArticles = async () => {
    try {
        const count = await Article.cleanupExpiredArticles();
        console.log(`[${new Date().toISOString()}] Cleanup job completed. Removed ${count} expired articles.`);
    } catch (error) {
        console.error('Error in cleanup job:', error);
    }
};

// Run cleanup every 6 hours
const startCleanupJob = () => {
    // Run immediately on start
    cleanupExpiredArticles();
    
    // Then schedule to run every 6 hours
    const interval = setInterval(cleanupExpiredArticles, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
    
    console.log('[Cleanup Job] Started with 6-hour interval');
    
    return interval;
};

module.exports = { startCleanupJob };