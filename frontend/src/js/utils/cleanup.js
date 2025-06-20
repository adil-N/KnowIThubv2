// frontend/src/js/utils/cleanup.js
export const cleanup = {
    async removeOrphanedFiles() {
        try {
            await api.post('/admin/maintenance/cleanup-files');
            console.log('Orphaned files cleanup completed');
        } catch (error) {
            console.error('Error cleaning up files:', error);
        }
    },

    // Add to your logout function
    async handleLogout() {
        if (auth.isAdmin()) {
            await this.removeOrphanedFiles();
        }
        auth.logout();
        window.location.hash = '#login';
    }
};