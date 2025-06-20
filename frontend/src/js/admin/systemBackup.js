// frontend/src/js/admin/systemBackup.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

class SystemBackup {
    constructor() {
        this.init = this.init.bind(this);
        this.handleBackup = this.handleBackup.bind(this);
        this.deleteBackup = this.deleteBackup.bind(this);
        this.restoreBackup = this.restoreBackup.bind(this);
    }

    init() {
        // Attach this instance to window for global access
        window.systemBackup = this;
        this.showBackupManager(document.getElementById('adminContent'));
    }

    async showBackupManager(adminContent) {
        try {
            if (!adminContent) {
                console.error('Admin content element not found');
                return;
            }

            ui.showLoading();
            
            // Let the server handle authorization via the auth middleware
            const response = await api.get('/api/admin/backups');
            console.log('Backup data response:', response);

            if (!response.success) {
                throw new Error(response.message || 'Failed to load backup information');
            }

            const backupContent = this.renderBackupManagerUI(response.data);
            adminContent.innerHTML = backupContent;
            
            // Setup event listeners after content is rendered
            this.setupBackupEventListeners();

        } catch (error) {
            console.error('Error in system backup management:', error);
            if (adminContent) {
                // Show appropriate error message based on status
                if (error.status === 403) {
                    adminContent.innerHTML = `
                        <div class="text-red-500 p-4">
                            Access denied. Admin privileges required.
                        </div>
                    `;
                } else {
                    adminContent.innerHTML = `
                        <div class="text-red-500 p-4">
                            Error loading backups: ${error.message || 'Unknown error'}
                        </div>
                    `;
                    ui.showError(error.message || 'Failed to load backup management');
                }
            }
        } finally {
            ui.hideLoading();
        }
    }

    renderBackupManagerUI(backupData) {
        return `
            <div class="system-backup-container p-4">
                <h2 class="text-2xl font-bold mb-4">System Backup Management</h2>
                
                <div class="backup-actions mb-6">
                    <button id="createBackup" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
                        Create New Backup
                    </button>
                </div>

                <div class="backup-history mt-6">
                    <h3 class="text-xl font-semibold mb-4">Backup History</h3>
                    <div id="backupList" class="space-y-4">
                        ${this.renderBackupHistoryRows(backupData)}
                    </div>
                </div>
            </div>
        `;
    }

    // Update the renderBackupHistoryRows method in systemBackup.js
renderBackupHistoryRows(backupData) {
    if (!backupData || backupData.length === 0) {
        return `
            <div class="text-center text-gray-500 p-4 bg-gray-50 rounded-lg">
                No backups available. Create your first backup!
            </div>
        `;
    }

    return backupData.map(backup => {
        const createdDate = new Date(backup.timestamp || backup.createdAt);
        const formattedDate = createdDate.toLocaleString();
        
        return `
            <div class="bg-white shadow rounded-lg p-4 flex justify-between items-center">
                <div>
                    <h4 class="text-lg font-semibold">Backup from ${formattedDate}</h4>
                    <p class="text-sm text-gray-600">Manifest: ${backup.filename}</p>
                    ${backup.databaseBackup ? 
                        `<p class="text-sm text-gray-500">Database: ${backup.databaseBackup}</p>` : 
                        ''}
                    <p class="text-sm text-gray-500">Size: ${this.formatFileSize(backup.size)}</p>
                </div>
                <div class="flex space-x-2">
                    <button 
                        class="restore-backup px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        data-filename="${backup.filename}"
                    >
                        Restore
                    </button>
                    <button 
                        class="delete-backup px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        data-filename="${backup.filename}"
                    >
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupBackupEventListeners() {
        // Create backup button
        const createBackupBtn = document.getElementById('createBackup');
        console.log('Create backup button:', createBackupBtn); // Debug log
        
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', this.handleBackup);
        } else {
            console.error('Create backup button not found in DOM');
        }

        // Restore backup buttons
        const restoreButtons = document.querySelectorAll('.restore-backup');
        console.log('Restore buttons found:', restoreButtons.length); // Debug log
        
        restoreButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filename = button.getAttribute('data-filename');
                this.restoreBackup(filename);
            });
        });

        // Delete backup buttons
        const deleteButtons = document.querySelectorAll('.delete-backup');
        console.log('Delete buttons found:', deleteButtons.length); // Debug log
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filename = button.getAttribute('data-filename');
                this.deleteBackup(filename);
            });
        });
    }


    async handleBackup() {
        try {
            console.log('Backup handler triggered'); // Debug log
            ui.showLoading();
            const response = await api.post('/api/admin/backups');
            console.log('Backup API response:', response); // Debug log
    
            if (response.success) {
                ui.showSuccess('Backup created successfully');
                await this.showBackupManager(document.getElementById('adminContent'));
            } else {
                throw new Error(response.message || 'Failed to create backup');
            }
        } catch (error) {
            console.error('Error handling backup:', error);
            ui.showError(error.message || 'Failed to create backup');
        } finally {
            ui.hideLoading();
        }
    }

    async restoreBackup(filename) {
        if (!confirm(`Are you sure you want to restore the backup "${filename}"? This will replace current system data.`)) {
            return;
        }

        try {
            ui.showLoading();
            const response = await api.post(`/api/admin/backups/${filename}/restore`);
            
            if (response.success) {
                ui.showSuccess('Backup restored successfully');
                // Reload the page after a short delay
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error(response.message || 'Failed to restore backup');
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            ui.showError(error.message || 'Failed to restore backup');
        } finally {
            ui.hideLoading();
        }
    }

    async deleteBackup(filename) {
        if (!confirm(`Are you sure you want to delete the backup "${filename}"?`)) {
            return;
        }

        try {
            ui.showLoading();
            const response = await api.delete(`/api/admin/backups/${filename}`);
            
            if (response.success) {
                ui.showSuccess('Backup deleted successfully');
                await this.showBackupManager(document.getElementById('adminContent'));
            } else {
                throw new Error(response.message || 'Failed to delete backup');
            }
        } catch (error) {
            console.error('Error deleting backup:', error);
            ui.showError(error.message || 'Failed to delete backup');
        } finally {
            ui.hideLoading();
        }
    }
}

// Create and initialize the system backup manager
const systemBackup = new SystemBackup();
document.addEventListener('DOMContentLoaded', systemBackup.init);

export { systemBackup };