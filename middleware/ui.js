// middleware/ui.js

const ui = {
    showLoading() {
        console.log('Loading...');
    },

    hideLoading() {
        console.log('Loading complete');
    },

    showError(message, type = 'error') {
        console.error(`[${type.toUpperCase()}]: ${message}`);
    },

    clearError() {
        // Clear any displayed errors
    },

    updatePreviewState(state) {
        console.log('Preview state updated:', state);
    }
};

module.exports = ui;