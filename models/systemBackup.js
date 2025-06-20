// systemBackup.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const systemBackup = {
    showBackupManager: async function(adminContent) {
        try {
            // Show loading indicator
            ui.showLoading();

            // Fetch backup information from the server
            const response = await api.get('/api/admin/system-backups');

            if (!response || !response.success) {
                throw new Error(response?.message || 'Failed to load backup information');
            }

            // Render backup management interface
            const backupContent = this.renderBackupManagerUI(response.data);
            
            // If adminContent is provided, update it
            if (adminContent) {
                adminContent.innerHTML = backupContent;
            }

            // Set up event listeners for backup actions
            this.setupBackupEventListeners();

        } catch (error) {
            console.error('Error in system backup management:', error);
            ui.showError(error.message || 'Failed to load backup management');
        } finally {
            ui.hideLoading();
        }
    },

    renderBackupManagerUI: function(backupData) {
        return `
            <div class="system-backup-container">
                <h2 class="text-2xl font-bold mb-4">System Backup Management</h2>
                
                <div class="backup-actions mb-6">
                    <button id="createFullBackup" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4">
                        Create Full Backup
                    </button>
                    <button id="createDatabaseBackup" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                        Backup Database
                    </button>
                </div>

                <div class="backup-history mt-6">
                    <h3 class="text-xl font-semibold mb-4">Backup History</h3>
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="border p-2">Timestamp</th>
                                <th class="border p-2">Type</th>
                                <th class="border p-2">Status</th>
                                <th class="border p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="backupHistoryList">
                            ${this.renderBackupHistoryRows(backupData)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderBackupHistoryRows: function(backupData) {
        // Render rows of backup history
        return backupData.map(backup => `
            <tr>
                <td class="border p-2">${new Date(backup.timestamp).toLocaleString()}</td>
                <td class="border p-2">${backup.type}</td>
                <td class="border p-2">${backup.status}</td>
                <td class="border p-2">
                    <button onclick="systemBackup.downloadBackup('${backup.id}')" 
                            class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2">
                        Download
                    </button>
                    <button onclick="systemBackup.restoreBackup('${backup.id}')" 
                            class="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                        Restore
                    </button>
                </td>
            </tr>
        `).join('') || `
            <tr>
                <td colspan="4" class="text-center p-4">No backup history available</td>
            </tr>
        `;
    },

    setupBackupEventListeners: function() {
        document.getElementById('createFullBackup')?.addEventListener('click', this.createFullBackup.bind(this));
        document.getElementById('createDatabaseBackup')?.addEventListener('click', this.createDatabaseBackup.bind(this));
    },

    createFullBackup: async function() {
        try {
            ui.showLoading();
            const response = await api.post('/api/admin/system-backups/full');
            
            if (response.success) {
                ui.showError('Full system backup created successfully', 'success');
                // Refresh backup history
                await this.showBackupManager();
            } else {
                throw new Error(response.message || 'Failed to create full backup');
            }
        } catch (error) {
            console.error('Full backup error:', error);
            ui.showError(error.message || 'Backup creation failed');
        } finally {
            ui.hideLoading();
        }
    },

    createDatabaseBackup: async function() {
        try {
            ui.showLoading();
            const response = await api.post('/api/admin/system-backups/database');
            
            if (response.success) {
                ui.showError('Database backup created successfully', 'success');
                // Refresh backup history
                await this.showBackupManager();
            } else {
                throw new Error(response.message || 'Failed to create database backup');
            }
        } catch (error) {
            console.error('Database backup error:', error);
            ui.showError(error.message || 'Backup creation failed');
        } finally {
            ui.hideLoading();
        }
    },

    downloadBackup: async function(backupId) {
        try {
            ui.showLoading();
            const response = await api.get(`/api/admin/system-backups/${backupId}/download`);
            
            if (response.success && response.data.downloadUrl) {
                // Trigger download
                const link = document.createElement('a');
                link.href = response.data.downloadUrl;
                link.download = `backup_${backupId}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                throw new Error(response.message || 'Failed to generate download link');
            }
        } catch (error) {
            console.error('Backup download error:', error);
            ui.showError(error.message || 'Download failed');
        } finally {
            ui.hideLoading();
        }
    },

    restoreBackup: async function(backupId) {
        if (!confirm('Are you sure you want to restore this backup? This will replace current system data.')) return;

        try {
            ui.showLoading();
            const response = await api.post(`/api/admin/system-backups/${backupId}/restore`);
            
            if (response.success) {
                ui.showError('System restored from backup successfully', 'success');
                // Potentially reload the page or refresh the admin panel
                window.location.reload();
            } else {
                throw new Error(response.message || 'Failed to restore backup');
            }
        } catch (error) {
            console.error('Backup restore error:', error);
            ui.showError(error.message || 'Restore failed');
        } finally {
            ui.hideLoading();
        }
    }
};