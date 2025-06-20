// frontend/src/js/utils/frontendErrorHandler.js
import { ui } from './ui.js';

export const errorHandler = {
    handleApiError(error, context = '') {
        console.error(`API Error ${context}:`, error);

        if (error.response) {
            // Server responded with error
            switch (error.response.status) {
                case 401:
                    ui.showError('Session expired. Please login again.');
                    window.location.hash = '#login';
                    break;
                case 403:
                    ui.showError('You don\'t have permission to perform this action');
                    break;
                case 413:
                    ui.showError('File too large. Maximum size is 5MB');
                    break;
                default:
                    ui.showError(error.response.data?.message || 'An error occurred');
            }
        } else if (error.request) {
            // Network error
            ui.showError('Network error. Please check your connection');
        } else {
            // Other errors
            ui.showError('An unexpected error occurred');
        }
    },

    handleFileError(error) {
        const errorMessages = {
            'FILE_TOO_LARGE': 'File size exceeds 5MB limit',
            'INVALID_FILE_TYPE': 'Invalid file type. Only images, PDFs, DOC, DOCX and TXT files are allowed',
            'TOO_MANY_FILES': 'Maximum 5 files allowed',
            'UPLOAD_FAILED': 'Failed to upload file'
        };

        ui.showError(errorMessages[error.code] || error.message || 'Error processing file');
    }
};