// middleware/fileCleanup.js
const fs = require('fs').promises;
const path = require('path');

const fileCleanup = {
    async deleteFile(filename) {
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        try {
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.error('File deletion error:', error);
            return false;
        }
    },

    async cleanupOrphanedFiles() {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        try {
            const files = await fs.readdir(uploadsDir);
            // Add logic to check against database records
            // Delete files not referenced in any article
            return true;
        } catch (error) {
            console.error('Cleanup error:', error);
            return false;
        }
    },

    handleArticleDelete: async (req, res, next) => {
        const article = req.articleToDelete;
        if (article?.files?.length) {
            try {
                await Promise.all(article.files.map(file => 
                    fileCleanup.deleteFile(file.filename)
                ));
            } catch (error) {
                console.error('Error deleting article files:', error);
            }
        }
        next();
    }
};

module.exports = fileCleanup;