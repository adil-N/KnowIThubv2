// middleware/fileHandler.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const crypto = require('crypto');

class FileHandler {
    constructor() {
        this.uploadsDir = path.join(process.cwd(), 'uploads', 'files');
        this.maxFileSize = 15 * 1024 * 1024; // 15MB
        this.maxFiles = 7;

        this.allowedTypes = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'text/plain': '.txt',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
        };

        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }

        this.storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    await fsPromises.mkdir(this.uploadsDir, { recursive: true });
                    cb(null, this.uploadsDir);
                } catch (error) {
                    cb(error);
                }
            },
            filename: (req, file, cb) => {
                const fileExt = path.extname(file.originalname);
                const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
                cb(null, `${uniqueSuffix}${fileExt}`);
            }
        });

        this.fileFilter = (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const allowedExts = Object.values(this.allowedTypes);

            if (this.allowedTypes[file.mimetype] || allowedExts.includes(ext)) {
                cb(null, true);
            } else {
                cb(new Error(`Unsupported file type: ${file.originalname}`));
            }
        };

        this.upload = multer({
            storage: this.storage,
            fileFilter: this.fileFilter,
            limits: {
                fileSize: this.maxFileSize,
                files: this.maxFiles
            }
        });
    }

    async deleteFile(filename) {
        try {
            const filePath = path.join(this.uploadsDir, filename);
            await fsPromises.unlink(filePath);
            return true;
        } catch (error) {
            console.error(`Error deleting file ${filename}:`, error);
            return false;
        }
    }

    async deleteFiles(files) {
        const results = await Promise.allSettled(
            files.map(file => this.deleteFile(file.filename))
        );
        return results.filter(result => result.status === 'fulfilled').length;
    }

    validateFile(file) {
        const errors = [];

        if (!file) {
            errors.push('No file provided');
            return errors;
        }

        if (file.size > this.maxFileSize) {
            errors.push(`File ${file.originalname} exceeds maximum size of 15MB`);
        }

        const ext = path.extname(file.originalname).toLowerCase();
        if (!this.allowedTypes[file.mimetype] && !Object.values(this.allowedTypes).includes(ext)) {
            errors.push(`File type ${ext} is not supported`);
        }

        return errors;
    }

    handleError(error, req, res, next) {
        if (error instanceof multer.MulterError) {
            switch (error.code) {
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
                default:
                    return res.status(400).json({
                        success: false,
                        message: error.message
                    });
            }
        }
        next(error);
    }

    async cleanupOnError(req) {
        if (req.files) {
            await this.deleteFiles(req.files);
        } else if (req.file) {
            await this.deleteFile(req.file.filename);
        }
    }

    getFileInfo(file) {
        return {
            originalname: file.originalname,
            filename: file.filename,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
            previewUrl: `/uploads/files/${file.filename}`,
            downloadUrl: `/uploads/files/${file.filename}?download=true`
        };
    }
}

const fileHandler = new FileHandler();

module.exports = {
    fileHandler,
    uploadMiddleware: fileHandler.upload.array('files', fileHandler.maxFiles),
    handleFileError: fileHandler.handleError.bind(fileHandler),
    validateFile: fileHandler.validateFile.bind(fileHandler),
    deleteFile: fileHandler.deleteFile.bind(fileHandler),
    deleteFiles: fileHandler.deleteFiles.bind(fileHandler),
    cleanupOnError: fileHandler.cleanupOnError.bind(fileHandler),
    getFileInfo: fileHandler.getFileInfo.bind(fileHandler)
};