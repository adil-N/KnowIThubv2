// jobs/backupJob.js
const BackupService = require('../services/backupService');
const cron = require('node-cron');

class BackupJob {
    constructor() {
        this.backupService = new BackupService({
            maxBackups: 3  // Keep only last 3 backups
        });
        this.cronJob = null;
    }

    async performBackup() {
        try {
            console.log(`[${new Date().toISOString()}] Starting scheduled backup...`);
            
            // Create new backup
            const backup = await this.backupService.createBackup();
            console.log('Backup created successfully:', backup);
            
            // Rotate old backups
            console.log('Starting backup rotation...');
            await this.backupService.rotateBackups();
            
            console.log(`[${new Date().toISOString()}] Scheduled backup completed successfully`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Scheduled backup error:`, {
                message: error.message,
                stack: error.stack
            });
        }
    }

    start() {
        // Schedule backup for 2 AM every day
        this.cronJob = cron.schedule('30 2 * * *', () => {
            this.performBackup();
        });

        console.log('[BackupJob] Scheduled daily backup for 2 AM');
    }

    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('[BackupJob] Stopped backup job');
        }
    }
}

module.exports = new BackupJob();