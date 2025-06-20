// utils/apiResponse.js
class ApiResponse {
    constructor(success, message, data = null, statusCode = 200) {
        this.success = success;
        this.message = message;
        if (data) this.data = data;
        this.statusCode = statusCode;
    }

    static success(res, message, data = null, statusCode = 200) {
        return res.status(statusCode).json(new ApiResponse(true, message, data));
    }

    static error(res, message, statusCode = 400, errors = null) {
        const response = new ApiResponse(false, message, null, statusCode);
        if (errors) response.errors = errors;
        return res.status(statusCode).json(response);
    }

    static serverError(res, error) {
        console.error('Server Error:', error);
        return res.status(500).json(new ApiResponse(
            false,
            'Internal server error',
            null,
            500
        ));
    }

    static unauthorized(res, message = 'Unauthorized access') {
        return res.status(401).json(new ApiResponse(
            false,
            message,
            null,
            401
        ));
    }

    static forbidden(res, message = 'Access forbidden') {
        return res.status(403).json(new ApiResponse(
            false,
            message,
            null,
            403
        ));
    }

    static notFound(res, message = 'Resource not found') {
        return res.status(404).json(new ApiResponse(
            false,
            message,
            null,
            404
        ));
    }
}

module.exports = ApiResponse;