// routes/articleRoutes.js
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const auth = require('../middleware/auth');
const { roleAuth } = require('../middleware/roleAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Article = require('../models/Article');

// Import new file handling utilities
const { 
    fileHandler, 
    uploadMiddleware, 
    handleFileError 
} = require('../middleware/fileHandler');
const fileManagement = require('../middleware/fileManagement');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/');
const uploadsImageDir = path.join(__dirname, '../uploads/images/');
const uploadsFilesDir = path.join(__dirname, '../uploads/files/'); 
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(uploadsImageDir)) {
    fs.mkdirSync(uploadsImageDir, { recursive: true });
}
if (!fs.existsSync(uploadsFilesDir)) {  
    fs.mkdirSync(uploadsFilesDir, { recursive: true });
}

// Configure multer for general file uploads - FIXED
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsFilesDir);
    },
    filename: function (req, file, cb) {
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, extension);
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        cb(null, `${nameWithoutExt}-${timestamp}-${randomSuffix}${extension}`);
    }
});

// Configure specific storage for TinyMCE image uploads
const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsImageDir);
    },
    filename: function (req, file, cb) {
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, extension);
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        cb(null, `${nameWithoutExt}-${timestamp}-${randomSuffix}${extension}`);
    }
});

// FIXED Multer configuration with enhanced file validation
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB limit
        files: 7, // Maximum 7 files
        fieldSize: 2 * 1024 * 1024,  // 2MB for text fields
        fieldNameSize: 100, // Limit field name size
        fields: 20 // Limit number of fields
    },
    fileFilter: function(req, file, cb) {
        console.log('File filter processing:', {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype
        });
        
        const allowedTypes = [
            // Images
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            // Excel files
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/x-excel',
            'application/excel',
            // PowerPoint files
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/powerpoint',
            'application/x-powerpoint'
        ];

        const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'];
        
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.originalname}. Allowed files: images, PDFs, Word, Excel, PowerPoint, and text files.`));
        }
    }
});

// Configure image upload middleware for TinyMCE
const imageUpload = multer({
    storage: imageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for images
        fieldSize: 1024 * 1024,
        fieldNameSize: 100
    },
    fileFilter: function(req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// FIXED Enhanced file upload error handling middleware
const handleFileUploadError = (err, req, res, next) => {
    console.error('File upload error:', err);
    
    // Clean up any uploaded files on error
    if (req.files) {
        req.files.forEach(file => {
            const filePath = path.join(uploadsFilesDir, file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Cleaned up file on error:', filePath);
            }
        });
    }
    
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 15MB limit'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 7 files allowed'
                });
            case 'LIMIT_FIELD_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many fields in request'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected file field'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`
                });
        }
    }
    
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
        });
    }
    
    next();
};

// Debug middleware with enhanced logging
router.use((req, res, next) => {
    console.log('Article route accessed:', {
        method: req.method,
        path: req.path,
        contentType: req.headers['content-type'],
        auth: !!req.headers.authorization,
        hasFiles: !!req.files,
        bodyKeys: req.body ? Object.keys(req.body) : []
    });
    next();
});

// TinyMCE image upload route with enhanced handling
router.post('/upload-image', 
    auth,
    imageUpload.single('file'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file uploaded'
                });
            }

            const imageUrl = `/uploads/images/${req.file.filename}`;
            
            console.log('Image uploaded successfully:', {
                originalName: req.file.originalname,
                filename: req.file.filename,
                url: imageUrl
            });

            res.json({
                success: true,
                url: imageUrl,
                message: 'Image uploaded successfully'
            });
        } catch (error) {
            console.error('Image upload error:', error);
            // Cleanup on error
            if (req.file) {
                const filePath = path.join(uploadsImageDir, req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            res.status(500).json({
                success: false,
                message: 'Error uploading image'
            });
        }
    }
);

console.log('Available Article Controller Methods:', Object.keys(articleController));

// Public routes (no auth required)
router.get('/featured', articleController.getFeaturedArticles);

// Protected routes (require authentication)
router.use(auth);

// Add this new route with your other protected routes (after auth middleware)
router.get('/authors', articleController.getAuthors);

// Enhanced basic article operations
router.get('/', articleController.getAllArticles);
router.get('/search', articleController.searchArticles);
router.get('/tags/suggestions', articleController.getTagSuggestions);
router.get('/:articleId/related', articleController.getRelatedArticles);

// FIXED Enhanced create article with file upload and validation
router.post('/', 
    auth,
    upload.array('files', 7), 
    handleFileUploadError,
    articleController.createArticle
);

// Enhanced visibility toggle with error handling
router.post('/toggle/:id', auth, async (req, res) => {
    try {
        console.log('Toggle visibility request:', {
            articleId: req.params.id,
            userId: req.user?._id,
            userRole: req.user?.role
        });
        
        await articleController.toggleVisibility(req, res);
    } catch (error) {
        console.error('Toggle visibility error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling article visibility',
            error: error.message
        });
    }
});

// CRITICAL FIX: Enhanced individual article routes with file handling
router.get('/:id', auth, articleController.getArticle);

// FIXED PUT route with proper multer middleware
router.put('/:id', 
    auth,
    upload.array('files', 7), 
    handleFileUploadError,
    articleController.updateArticle
);

// Enhanced delete with file cleanup
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const article = await Article.findById(req.params.id);
        if (article?.files?.length) {
            for (const file of article.files) {
                await fileHandler.deleteFile(file.filename);
            }
        }
        next();
    } catch (error) {
        next(error);
    }
}, articleController.deleteArticle);

// Enhanced comment routes
router.get('/:id/comments', auth, articleController.getComments);
router.post('/:id/comments', auth, articleController.addComment);
router.put('/:id/comments/:commentId', auth, articleController.updateComment);
router.delete('/:id/comments/:commentId', auth, articleController.deleteComment);
router.post('/:id/comments/:commentId/like', auth, articleController.likeComment);

// Enhanced file management routes with validation and error handling
router.delete('/:id/files/:filename', auth, async (req, res) => {
    try {
        const { id, filename } = req.params;
        const article = await Article.findById(id);

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        const isAuthor = article.author.toString() === req.user._id.toString();
        const isAdmin = ['admin', 'super'].includes(req.user.role);

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this article'
            });
        }

        const fileIndex = article.files.findIndex(file => file.filename === filename);
        if (fileIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'File not found in article'
            });
        }

        // Use new file handler for deletion
        const deleted = await fileHandler.deleteFile(filename);
        if (!deleted) {
            throw new Error('Failed to delete file from storage');
        }

        article.files.splice(fileIndex, 1);
        await article.save();

        res.json({
            success: true,
            message: 'File deleted successfully',
            data: {
                remainingFiles: article.files.length,
                files: article.files
            }
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting file',
            error: error.message
        });
    }
});

// New file preview routes
router.get('/files/:filename/preview', auth, fileManagement.serveFile);
router.get('/files/:filename/download', auth, async (req, res, next) => {
    try {
        const { filename } = req.params;
        const filePath = fileHandler.getFilePath(filename);
        res.download(filePath);
    } catch (error) {
        next(error);
    }
});

// Enhanced admin-only routes with file handling
router.post('/bulk/visibility', 
    auth, 
    roleAuth(['admin', 'super']), 
    articleController.bulkToggleVisibility
);

router.post('/bulk/delete', 
    auth, 
    roleAuth(['admin', 'super']), 
    async (req, res, next) => {
        try {
            const articles = await Article.find({
                _id: { $in: req.body.articleIds }
            });

            // Delete all associated files first
            for (const article of articles) {
                if (article.files?.length) {
                    await Promise.all(article.files.map(file => 
                        fileHandler.deleteFile(file.filename)
                    ));
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    },
    articleController.bulkDeleteArticles
);

router.patch('/:id/visibility', auth, roleAuth(['admin', 'super']), articleController.toggleVisibility);
router.get('/admin/stats', auth, roleAuth(['admin', 'super']), articleController.getArticleStats);

// FIXED Enhanced error handling middleware
router.use((error, req, res, next) => {
    console.error('Article route error:', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path
    });
    
    // Clean up any uploaded files if there was an error
    if (req.files) {
        req.files.forEach(file => {
            const filePath = path.join(uploadsFilesDir, file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Cleaned up file on error:', filePath);
            }
        });
    }
    
    if (req.file) {
        const filePath = path.join(uploadsFilesDir, req.file.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Cleaned up single file on error:', filePath);
        }
    }
    
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
});

module.exports = router;