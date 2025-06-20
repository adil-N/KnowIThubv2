// middleware/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename with original extension
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
    }
});

// File filter function with expanded MIME types
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        // Images
        'image/jpeg',
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

    // Get file extension as fallback
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.originalname}. Allowed files: images, PDFs, Word, Excel, PowerPoint, and text files.`), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        checkAndCreateDir(uploadsDir);
        if (allowedMimes.includes(file.mimetype) || 
            allowedExtensions.includes(path.extname(file.originalname).toLowerCase().substring(1))) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.originalname}`), false);
        }
    },
    limits: {
        fileSize: 15 * 1024 * 1024,
        files: 7
    }
});

// Error handling middleware
const handleFileUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 15MB limit'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Maximum 7 files allowed'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected field in file upload'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: `File upload error: ${err.message}`
                });
        }
    } else if (err) {
        // Custom file filter errors
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// Cleanup middleware for failed uploads
const cleanupOnError = (req, res, next) => {
    const cleanupFiles = () => {
        if (req.files) {
            req.files.forEach(file => {
                const filePath = path.join(uploadsDir, file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    };

    // Store the original end function
    const originalEnd = res.end;
    
    // Override the end function
    res.end = function() {
        // If there was an error (status >= 400), cleanup files
        if (res.statusCode >= 400) {
            cleanupFiles();
        }
        // Call the original end function
        originalEnd.apply(res, arguments);
    };

    next();
};

module.exports = {
    uploadFiles: upload.array('files', 7), // 'files' is the field name, 7 is max count
    handleFileUploadErrors,
    cleanupOnError
};