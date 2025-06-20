// middleware/fileManagement.js
const { fileHandler } = require('./fileHandler');
const Article = require('../models/Article');

const fileManagement = {
    // Middleware to handle file uploads for articles
    async handleArticleFiles(req, res, next) {
        if (!req.files || req.files.length === 0) {
            return next();
        }

        try {
            // Validate each file
            const errors = req.files.flatMap(file => fileHandler.validateFile(file));
            if (errors.length > 0) {
                await fileHandler.cleanupOnError(req);
                return res.status(400).json({
                    success: false,
                    message: 'File validation failed',
                    errors
                });
            }

            // Process files and add them to request
            req.processedFiles = req.files.map(file => fileHandler.getFileInfo(file));
            next();
        } catch (error) {
            await fileHandler.cleanupOnError(req);
            next(error);
        }
    },

    // Middleware to handle file deletion for articles
    async handleFileDelete(req, res, next) {
        const { articleId, filename } = req.params;

        try {
            const article = await Article.findById(articleId);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'Article not found'
                });
            }

            // Check if file exists in article
            const fileIndex = article.files.findIndex(file => file.filename === filename);
            if (fileIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found in article'
                });
            }

            // Delete file from storage
            const deleted = await fileHandler.deleteFile(filename);
            if (!deleted) {
                return res.status(500).json({
                    success: false,
                    message: 'Error deleting file'
                });
            }

            // Remove file from article
            article.files.splice(fileIndex, 1);
            await article.save();

            res.json({
                success: true,
                message: 'File deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    // Middleware to check file limits before upload
    checkFileLimits(req, res, next) {
        const maxFiles = fileHandler.maxFiles;
        const currentFiles = req.body.existingFiles ? JSON.parse(req.body.existingFiles).length : 0;
        const newFiles = req.files ? req.files.length : 0;
        
        if (currentFiles + newFiles > maxFiles) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${maxFiles} files allowed per article`
            });
        }
        next();
    },

    // Middleware to handle file updates for articles
async handleFileUpdate(req, res, next) {
    if (!req.files && !req.body.removedFiles) {
        return next();
    }

    try {
        const article = await Article.findById(req.params.id);  // Changed from articleId to id
        if (!article) {
            await fileHandler.cleanupOnError(req);
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        // Handle file removals if specified
        if (req.body.removedFiles) {
            const removedFiles = JSON.parse(req.body.removedFiles);
            for (const filename of removedFiles) {
                await fileHandler.deleteFile(filename);
                article.files = article.files.filter(file => file.filename !== filename);
            }
        }

        // Add new files if any
        if (req.files && req.files.length > 0) {
            const newFiles = req.files.map(file => fileHandler.getFileInfo(file));
            article.files = [...article.files, ...newFiles];
        }

        req.updatedArticle = article;
        next();
    } catch (error) {
        await fileHandler.cleanupOnError(req);
        next(error);
    }
},

    // Middleware to serve files securely
    async serveFile(req, res, next) {
        const { filename } = req.params;
        try {
            // Implement any necessary security checks here
            const filePath = fileHandler.getFilePath(filename);
            res.sendFile(filePath);
        } catch (error) {
            next(error);
        }
    },

    // Middleware to get file preview URLs
    getPreviewUrls(files) {
        return files.map(file => ({
            ...file,
            previewUrl: `/uploads/${file.filename}`,
            downloadUrl: `/api/files/${file.filename}/download`
        }));
    }
};

module.exports = fileManagement;