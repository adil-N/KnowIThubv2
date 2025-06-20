// utils/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
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
        // PowerPoint files
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed files: images, PDFs, Word, Excel, PowerPoint, and text files.'), false);
    }
};

// Create and export multer instance
const uploadMiddleware = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
        files: 7 // Maximum 7 files
    }
});

// Helper functions
const deleteFile = async (filename) => {
    return new Promise((resolve, reject) => {
        const filepath = path.join(uploadsDir, filename);
        fs.unlink(filepath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
};

const fileExists = async (filename) => {
    return new Promise((resolve) => {
        const filepath = path.join(uploadsDir, filename);
        fs.access(filepath, fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
};

module.exports = {
    uploadMiddleware,
    deleteFile,
    fileExists,
    uploadsDir
};