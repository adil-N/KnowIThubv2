// utils/backendErrorHandler.js
const ApiResponse = require('./apiResponse');

const errorHandler = {
    handleError: (err, req, res, next) => {
        console.error('Error:', {
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            path: req.path,
            method: req.method,
            userId: req.user?.userId
        });

        // Handle specific error types
        if (err.name === 'ValidationError') {
            return ApiResponse.error(res, 'Validation Error', 400, 
                Object.values(err.errors).map(e => e.message)
            );
        }

        if (err.name === 'MongoError' || err.name === 'MongoServerError') {
            if (err.code === 11000) {
                return ApiResponse.error(res, 'This record already exists', 400);
            }
        }

        if (err.name === 'JsonWebTokenError') {
            return ApiResponse.unauthorized(res, 'Please authenticate');
        }

        if (err.name === 'MulterError') {
            switch (err.code) {
                case 'LIMIT_FILE_SIZE':
                    return ApiResponse.error(res, 'File too large. Maximum size is 5MB', 413);
                case 'LIMIT_FILE_COUNT':
                    return ApiResponse.error(res, 'Too many files. Maximum is 5 files', 413);
                default:
                    return ApiResponse.error(res, 'File upload error', 400);
            }
        }

        // Default error response
        return ApiResponse.serverError(res, err);
    },

    logError: (error, context = {}) => {
        console.error('Error:', {
            message: error.message,
            stack: error.stack,
            ...context
        });
    }
};

module.exports = errorHandler;