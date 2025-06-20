// jobs/fileCleanupJob.js
const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const Article = mongoose.model('Article');

class FileCleanupService {
    constructor() {
        this.uploadsDir = path.join(__dirname, '..', 'uploads');
        this.uploadsFilesDir = path.join(this.uploadsDir, 'files');
        this.cleanupSchedule = '0 0 * * *'; // Run at midnight daily
        this.job = null;
    }

    async cleanupOrphanedFiles() {
        try {
            console.log('Starting orphaned files cleanup...');
            // Get all files from both main uploads and files directory
            const mainFiles = await this.getDirectoryFiles(this.uploadsDir);
            const subFiles = await this.getDirectoryFiles(this.uploadsFilesDir);
            const allFiles = [...mainFiles, ...subFiles];
            
            const dbFiles = await this.getDBFiles();
            
            // Add a list of protected directories and files
            const protectedItems = [
                'images',
                'temp',
                'files',
                '.gitkeep',
                'README.md'
            ];
            
            let deletedCount = 0;
            for (const file of allFiles) {
                // Skip protected items
                if (protectedItems.includes(file) || file.startsWith('.')) {
                    continue;
                }
                
                const isReferenced = dbFiles.has(file);
                if (!isReferenced) {
                    try {
                        // Try both directories
                        const mainPath = path.join(this.uploadsDir, file);
                        const subPath = path.join(this.uploadsFilesDir, file);
                        
                        if (await this.isFile(mainPath)) {
                            await fs.unlink(mainPath);
                            deletedCount++;
                            console.log(`Deleted orphaned file from main dir: ${file}`);
                        } else if (await this.isFile(subPath)) {
                            await fs.unlink(subPath);
                            deletedCount++;
                            console.log(`Deleted orphaned file from files dir: ${file}`);
                        }
                    } catch (error) {
                        console.error(`Error deleting file ${file}:`, error);
                    }
                }
            }
            console.log(`Cleanup completed. Deleted ${deletedCount} orphaned files.`);
        } catch (error) {
            console.error('Error in cleanupOrphanedFiles:', error);
        }
    }

    async getDirectoryFiles(directory) {
        try {
            return await fs.readdir(directory);
        } catch (error) {
            console.error(`Error reading directory ${directory}:`, error);
            return [];
        }
    }

    async isFile(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.isFile();
        } catch {
            return false;
        }
    }

    async cleanupExpiredArticleFiles() {
        try {
            console.log('Starting expired articles file cleanup...');
            const expiredArticles = await Article.find({
                isTemporary: true,
                expiresAt: { $lte: new Date() }
            });

            let deletedCount = 0;
            for (const article of expiredArticles) {
                if (article.files?.length > 0) {
                    for (const file of article.files) {
                        try {
                            // Try both possible locations
                            const mainPath = path.join(this.uploadsDir, file.filename);
                            const subPath = path.join(this.uploadsFilesDir, file.filename);
                            
                            if (await this.isFile(mainPath)) {
                                await fs.unlink(mainPath);
                                deletedCount++;
                            } else if (await this.isFile(subPath)) {
                                await fs.unlink(subPath);
                                deletedCount++;
                            }
                            console.log(`Deleted expired article file: ${file.filename}`);
                        } catch (error) {
                            console.error(`Error deleting file ${file.filename}:`, error);
                        }
                    }
                    // Clear files array from article
                    article.files = [];
                    await article.save();
                }
            }
            console.log(`Expired articles cleanup completed. Deleted ${deletedCount} files.`);
        } catch (error) {
            console.error('Error in cleanupExpiredArticleFiles:', error);
        }
    }

    async getDBFiles() {
        try {
            const files = new Set();
            const articles = await Article.find({ 'files.0': { $exists: true } }, 'files').lean();
            
            articles.forEach(article => {
                if (article.files?.length > 0) {
                    article.files.forEach(file => {
                        if (file.filename) {
                            files.add(file.filename);
                        }
                    });
                }
            });
            
            return files;
        } catch (error) {
            console.error('Error getting DB files:', error);
            return new Set();
        }
    }

    async validateFileIntegrity() {
        try {
            console.log('Validating file integrity...');
            const articles = await Article.find({ 'files.0': { $exists: true } });
            let cleanedCount = 0;
            
            for (const article of articles) {
                const validFiles = [];
                for (const file of article.files) {
                    try {
                        const mainPath = path.join(this.uploadsDir, file.filename);
                        const subPath = path.join(this.uploadsFilesDir, file.filename);
                        
                        if (await this.isFile(mainPath) || await this.isFile(subPath)) {
                            validFiles.push(file);
                        } else {
                            cleanedCount++;
                            console.log(`Removing reference to missing file ${file.filename} from article ${article._id}`);
                        }
                    } catch (error) {
                        console.error(`Error checking file ${file.filename}:`, error);
                    }
                }
                
                if (validFiles.length !== article.files.length) {
                    article.files = validFiles;
                    await article.save();
                }
            }
            console.log(`File integrity validation completed. Cleaned ${cleanedCount} invalid references.`);
        } catch (error) {
            console.error('Error in validateFileIntegrity:', error);
        }
    }

    async startCleanup() {
        console.log('Starting cleanup tasks...');
        try {
            await this.cleanupOrphanedFiles();
            await this.cleanupExpiredArticleFiles();
            await this.validateFileIntegrity();
            console.log('All cleanup tasks completed successfully');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    start() {
        console.log('Starting file cleanup service...');
        
        // Run cleanup job according to schedule
        this.job = cron.schedule(this.cleanupSchedule, async () => {
            await this.startCleanup();
        });

        // Run initial cleanup
        this.startCleanup().catch(error => {
            console.error('Error during initial cleanup:', error);
        });
    }

    stop() {
        if (this.job) {
            this.job.stop();
            console.log('File cleanup service stopped');
        }
    }
}

const fileCleanupService = new FileCleanupService();

module.exports = fileCleanupService;