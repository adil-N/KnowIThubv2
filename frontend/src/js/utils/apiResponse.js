// utils/apiResponse.js
class ApiResponse {
    constructor(success, message, data = null, statusCode = 200) {
        this.success = success;
        this.message = message;
        if (data) this.data = data;
        this.statusCode = statusCode;
    }

    static success(res, message = 'Operation successful', data = null) {
        return res.status(200).json({
            success: true,
            message,
            data
        });
    }

    static error(res, message = 'Operation failed', statusCode = 400) {
        console.error('API Error:', message);
        return res.status(statusCode).json({
            success: false,
            message
        });
    }

    static serverError(res, message = 'Internal server error') {
        console.error('Server Error:', message);
        return res.status(500).json({
            success: false,
            message: message || 'Internal server error'
        });
    }

    static notFound(res, message = 'Resource not found') {
        return res.status(404).json({
            success: false,
            message
        });
    }

    static forbidden(res, message = 'Access forbidden') {
        return res.status(403).json({
            success: false,
            message
        });
    }


    static unauthorized(res, message = 'Unauthorized access') {
        return res.status(401).json(new ApiResponse(
            false,
            message,
            null,
            401
        ));
    }

   

}

module.exports = ApiResponse;