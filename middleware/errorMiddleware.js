// middleware/errorMiddleware.js
const backendErrorHandler = {
    logError(err, context = {}) {
        console.error('[Error]', {
            timestamp: new Date().toISOString(),
            error: err.message,
            stack: err.stack,
            ...context
        });
    },

    handleError(err, req, res, next) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : err.message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack
        });
    }
};

const errorLogger = (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
        console.log('Response:', {
            path: req.path,
            method: req.method,
            body: req.body,
            response: data
        });
        originalSend.apply(res, arguments);
    };
    next();
};

const notFound = (req, res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    res.status(404);
    return res.json({
        success: false,
        message: error.message
    });
};

const errorHandler = (err, req, res, next) => {
    backendErrorHandler.logError(err, {
        path: req.path,
        method: req.method,
        userId: req.user?.id
    });

    if (err.isOperational) {
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message
        });
    }

    return backendErrorHandler.handleError(err, req, res, next);
};

module.exports = {
    errorLogger,
    notFound,
    errorHandler
};