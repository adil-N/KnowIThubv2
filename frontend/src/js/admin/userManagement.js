// frontend/src/js/admin/userManagement.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const userManagement = {
    async show() {
        const adminContent = document.getElementById('adminContentArea');
        if (!adminContent) return;

        try {
            ui.showLoading();
            const response = await api.get('/admin/users');
            
            if (response.success) {
                this.renderUserTable(response.data);
                this.attachEventListeners();
            }
        } catch (error) {
            ui.showError('Failed to load users');
            console.error('Error loading users:', error);
        } finally {
            ui.hideLoading();
        }
    },

    renderUserTable(users) {
        const adminContent = document.getElementById('adminContentArea');
        if (!adminContent) return;

        adminContent.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${users.map(user => this.renderUserRow(user)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderUserRow(user) {
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">${user.firstName} ${user.lastName}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full 
                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'super' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'}">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full 
                        ${user.status === 'active' ? 'bg-green-100 text-green-800' : 
                          'bg-yellow-100 text-yellow-800'}">
                        ${user.status || 'active'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${user.role !== 'super' ? `
                        <button class="reset-password-btn text-blue-600 hover:text-blue-900 mr-2"
                            data-user-id="${user._id}">
                            Reset Password
                        </button>
                        <button class="delete-user-btn text-red-600 hover:text-red-900"
                            data-user-id="${user._id}">
                            Delete
                        </button>
                    ` : '<span class="text-gray-500">No actions available</span>'}
                </td>
            </tr>
        `;
    },

    attachEventListeners() {
        document.querySelectorAll('.reset-password-btn').forEach(button => {
            button.addEventListener('click', () => this.handleResetPassword(button.dataset.userId));
        });

        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', () => this.handleDeleteUser(button.dataset.userId));
        });
    },

    renderUserData(users) {
        const adminContent = document.getElementById('adminContentArea');
        if (!adminContent) return;

        adminContent.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${users.map(user => {
                            // Admin can't modify super admin accounts
                            const canModify = this.currentUser.role === 'super' || user.role !== 'super';
                            return `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">${user.firstName} ${user.lastName}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs font-semibold rounded-full 
                                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'super' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'}">
                                            ${user.role}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs font-semibold rounded-full 
                                            ${user.status === 'active' ? 'bg-green-100 text-green-800' : 
                                            'bg-yellow-100 text-yellow-800'}">
                                            ${user.status || 'active'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        ${canModify ? `
                                            <button class="reset-password-btn text-blue-600 hover:text-blue-900 mr-2"
                                                data-user-id="${user._id}">
                                                Reset Password
                                            </button>
                                            <button class="delete-user-btn text-red-600 hover:text-red-900"
                                                data-user-id="${user._id}">
                                                Delete
                                            </button>
                                        ` : '<span class="text-gray-500">No actions available</span>'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },


    async handleResetPassword(userId) {
        if (!confirm('Are you sure you want to reset this user\'s password?')) return;

        try {
            ui.showLoading();
            const response = await api.post(`/admin/users/${userId}/reset-password`);
            
            if (response.success) {
                this.showPasswordResetModal(response.data.temporaryPassword);
            }
        } catch (error) {
            ui.showError('Failed to reset password');
            console.error('Error resetting password:', error);
        } finally {
            ui.hideLoading();
        }
    },

    async handleDeleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            ui.showLoading();
            const response = await api.delete(`/admin/users/${userId}`);
            
            if (response.success) {
                await this.show(); // Refresh the user list
                ui.showError('User deleted successfully', 'success');
            }
        } catch (error) {
            ui.showError('Failed to delete user');
            console.error('Error deleting user:', error);
        } finally {
            ui.hideLoading();
        }
    },

    showPasswordResetModal(temporaryPassword) {
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
                id="passwordResetModal">
                <div class="bg-white p-6 rounded-lg max-w-md w-full">
                    <h3 class="text-lg font-bold mb-4">Password Reset Successful</h3>
                    <p class="mb-2">Temporary password:</p>
                    <div class="relative">
                        <input type="text" 
                            value="${temporaryPassword}" 
                            readonly 
                            class="w-full bg-gray-100 p-3 rounded font-mono mb-2 pr-20"
                            id="tempPassword">
                        <button onclick="copyToClipboard('tempPassword')"
                            class="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                            Copy
                        </button>
                    </div>
                    <p class="text-sm text-gray-600 mb-4">
                        Please securely share this password with the user.
                        They will be required to change it on their next login.
                    </p>
                    <button onclick="document.getElementById('passwordResetModal').remove()" 
                        class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

};
window.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    // Use ui.showError for consistency with the rest of the application
    ui.showError('Copied to clipboard!', 'success');
};