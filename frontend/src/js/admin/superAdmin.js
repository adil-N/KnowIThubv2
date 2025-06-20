// frontend/src/js/admin/superAdmin.js 
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';

export const superAdmin = {
    currentPage: 1,
    currentFilters: {},

    // =====================================
    // EXISTING ADMIN MANAGEMENT METHODS
    // =====================================
    async handleEditAdmin(adminId) {
        try {
            const response = await api.get(`/api/admin/super/admins/${adminId}`);
            if (!response.success) throw new Error(response.message);
            
            this.showEditModal(response.data);
        } catch (error) {
            ui.showError('Failed to load admin details');
        }
    },

    showEditModal(admin) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md w-full">
                <h3 class="text-lg font-bold mb-4">Edit Administrator</h3>
                <form id="editAdminForm" class="space-y-4">
                    <input type="hidden" id="adminId" value="${admin._id}">
                    <div>
                        <label class="block text-sm font-medium">First Name</label>
                        <input type="text" id="editFirstName" value="${admin.firstName}" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Last Name</label>
                        <input type="text" id="editLastName" value="${admin.lastName}" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Status</label>
                        <select id="editStatus" class="mt-1 w-full rounded border p-2">
                            <option value="active" ${admin.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${admin.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Role</label>
                        <select id="editRole" class="mt-1 w-full rounded border p-2"
                            ${admin.role === 'super' ? 'disabled' : ''}>
                            <option value="admin" ${admin.role === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="super" ${admin.role === 'super' ? 'selected' : ''}>Super Admin</option>
                        </select>
                    </div>
                    <div class="flex justify-end space-x-2 pt-4">
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                        <button type="submit"
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save Changes</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('editAdminForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSaveAdminChanges(modal);
        });
    },

    async handleSaveAdminChanges(modal) {
        try {
            ui.showLoading();
            const adminId = document.getElementById('adminId').value;
            const formData = {
                firstName: document.getElementById('editFirstName').value.trim(),
                lastName: document.getElementById('editLastName').value.trim(),
                status: document.getElementById('editStatus').value,
                role: document.getElementById('editRole').value
            };

            if (!formData.firstName || !formData.lastName) {
                throw new Error('First name and last name are required');
            }

            const response = await api.put(`/api/admin/super/admins/${adminId}`, formData);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to update administrator');
            }

            modal.remove();
            ui.showError('Administrator updated successfully', 'success');
            
            try {
                await this.reloadAdminPanel();
            } catch (reloadError) {
                console.error('Error reloading admin panel:', reloadError);
                window.location.hash = '#admin';
            }
        } catch (error) {
            console.error('Error in handleSaveAdminChanges:', error);
            ui.showError(error.message || 'Failed to update administrator');
        } finally {
            ui.hideLoading();
        }
    },

    async handleResetPassword(adminId) {
        if (!confirm('Reset password? Administrator will need to change it on next login.')) return;

        try {
            ui.showLoading();
            const endpoint = `/api/admin/super/admins/${adminId}/reset-password`;
            const response = await api.post(endpoint, {});

            if (!response.success || !response.data?.temporaryPassword) {
                throw new Error(response.message || 'Failed to reset password');
            }

            if (response.data.email) {
                localStorage.setItem('resetEmail', response.data.email);
            }

            await this.showResetPasswordModal(response.data.temporaryPassword, adminId);
            ui.showError('Password has been reset successfully', 'success');

        } catch (error) {
            console.error('Password reset error:', error);
            ui.showError(error.message || 'Failed to reset password');
        } finally {
            ui.hideLoading();
        }
    },

    showResetPasswordModal(temporaryPassword, adminId) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white p-6 rounded-lg max-w-md w-full">
                    <h3 class="text-lg font-bold mb-4">Password Reset Successful</h3>
                    <p class="mb-2">Temporary password for Admin ID: ${adminId}</p>
                    <div class="relative mb-4">
                        <div class="flex items-center space-x-0">
                            <input type="text" 
                                value="${temporaryPassword}" 
                                readonly 
                                id="tempPasswordField"
                                class="flex-1 bg-gray-100 p-3 rounded-l font-mono">
                            <button id="copyPasswordBtn"
                                type="button"
                                class="px-4 py-3 bg-blue-500 text-white rounded-r hover:bg-blue-600 focus:outline-none">
                                Copy
                            </button>
                        </div>
                        <span id="copyFeedback" class="hidden text-green-600 text-sm mt-1">
                            Password copied!
                        </span>
                    </div>
                    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <div class="flex">
                            <div class="flex-1">
                                <p class="text-sm text-yellow-700">
                                    <strong>Important Notes:</strong>
                                    <ul class="list-disc ml-4 mt-2">
                                        <li>This password is temporary and must be changed on first login</li>
                                        <li>Communicate this password securely to the administrator</li>
                                        <li>The password will only be shown once in this window</li>
                                    </ul>
                                </p>
                            </div>
                        </div>
                    </div>
                    <button id="closeModalBtn" 
                        type="button"
                        class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 focus:outline-none">
                        Close
                    </button>
                </div>
            `;

            document.body.appendChild(modal);

            const copyButton = modal.querySelector('#copyPasswordBtn');
            const passwordField = modal.querySelector('#tempPasswordField');
            const copyFeedback = modal.querySelector('#copyFeedback');
            const closeButton = modal.querySelector('#closeModalBtn');

            copyButton.addEventListener('click', () => {
                try {
                    passwordField.select();
                    passwordField.setSelectionRange(0, 99999);
                    
                    document.execCommand('copy');
                    if (!document.execCommand('copy')) {
                        navigator.clipboard.writeText(temporaryPassword);
                    }
                    
                    copyFeedback.classList.remove('hidden');
                    setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
                    
                    window.getSelection().removeAllRanges();
                    
                    ui.showError('Password copied to clipboard!', 'success');
                } catch (error) {
                    console.error('Copy failed:', error);
                    ui.showError('Failed to copy password. Please copy manually.');
                }
            });

            closeButton.addEventListener('click', () => {
                modal.remove();
                resolve();
            });
        });
    },

    async handleDeleteAdmin(adminId) {
        if (!confirm('Delete this administrator? This cannot be undone.')) return;
        
        try {
            ui.showLoading();
            const response = await api.delete(`/api/admin/super/admins/${adminId}`);
            
            if (response.success) {
                ui.showError('Administrator deleted successfully', 'success');
                await window.loadStatistics();
            }
        } catch (error) {
            ui.showError('Failed to delete administrator');
        } finally {
            ui.hideLoading();
        }
    },

    async handleCreateAdmin() {
        this.showCreateAdminModal();
    },

    showCreateAdminModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md w-full">
                <h3 class="text-lg font-bold mb-4">Create New Administrator</h3>
                <form id="createAdminForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium">First Name</label>
                        <input type="text" id="createAdminFirstName" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Last Name</label>
                        <input type="text" id="createAdminLastName" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Email (@ddf.ae required)</label>
                        <input type="email" id="createAdminEmail" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Password</label>
                        <input type="password" id="createAdminPassword" required
                            class="mt-1 w-full rounded border p-2">
                        <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Role</label>
                        <select id="createAdminRole" class="mt-1 w-full rounded border p-2">
                            <option value="admin">Admin</option>
                            <option value="super">Super Admin</option>
                        </select>
                    </div>
                    <div id="createAdminError" class="text-red-600 text-sm hidden"></div>
                    <div class="flex justify-end space-x-2 pt-4">
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                        <button type="submit"
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Create Admin</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('createAdminForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateAdminSubmit(modal);
        });
    },

    async handleCreateAdminSubmit(modal) {
        try {
            const errorDiv = document.getElementById('createAdminError');
            errorDiv.classList.add('hidden');

            const formData = {
                firstName: document.getElementById('createAdminFirstName').value.trim(),
                lastName: document.getElementById('createAdminLastName').value.trim(),
                email: document.getElementById('createAdminEmail').value.trim(),
                password: document.getElementById('createAdminPassword').value,
                role: document.getElementById('createAdminRole').value
            };

            if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
                throw new Error('All fields are required');
            }

            if (formData.password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }

            ui.showLoading();
            const response = await api.post('/api/admin/super/admins', formData);

            if (!response.success) {
                throw new Error(response.message);
            }

            modal.remove();
            ui.showError('Administrator created successfully', 'success');
            await this.reloadAdminPanel();

        } catch (error) {
            const errorDiv = document.getElementById('createAdminError');
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            ui.hideLoading();
        }
    },
    // =====================================
    // NEW USER MANAGEMENT METHODS 
    // 
    // =====================================
    async handleCreateUser() {
        this.showCreateUserModal();
    },

    showCreateUserModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md w-full">
                <h3 class="text-lg font-bold mb-4">Create New User</h3>
                <form id="createUserForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium">First Name</label>
                        <input type="text" id="createFirstName" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Last Name</label>
                        <input type="text" id="createLastName" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Email</label>
                        <input type="email" id="createEmail" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Password</label>
                        <input type="password" id="createPassword" required
                            class="mt-1 w-full rounded border p-2">
                        <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Role</label>
                        <select id="createRole" class="mt-1 w-full rounded border p-2">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div id="createUserError" class="text-red-600 text-sm hidden"></div>
                    <div class="flex justify-end space-x-2 pt-4">
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                        <button type="submit"
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Create User</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('createUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateUserSubmit(modal);
        });
    },

    async handleCreateUserSubmit(modal) {
        try {
            const errorDiv = document.getElementById('createUserError');
            errorDiv.classList.add('hidden');

            const formData = {
                firstName: document.getElementById('createFirstName').value.trim(),
                lastName: document.getElementById('createLastName').value.trim(),
                email: document.getElementById('createEmail').value.trim(),
                password: document.getElementById('createPassword').value,
                role: document.getElementById('createRole').value
            };

            if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
                throw new Error('All fields are required');
            }

            if (formData.password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }

            ui.showLoading();
            const response = await api.post('/api/admin/super/users', formData);

            if (!response.success) {
                throw new Error(response.message);
            }

            modal.remove();
            ui.showError('User created successfully', 'success');
            await this.refreshUserList();

        } catch (error) {
            const errorDiv = document.getElementById('createUserError');
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            ui.hideLoading();
        }
    },

    async viewUserDetails(userId) {
        try {
            ui.showLoading();
            const response = await api.get(`/api/admin/super/users/${userId}`);
            
            if (!response.success) throw new Error(response.message);
            
            this.showUserDetailsModal(response.data);
        } catch (error) {
            ui.showError('Failed to load user details');
        } finally {
            ui.hideLoading();
        }
    },

    showUserDetailsModal(userData) {
        const { user, activitySummary } = userData;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold">User Details: ${user.firstName} ${user.lastName}</h3>
                    <button onclick="this.closest('.fixed').remove()" 
                        class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- User Information -->
                    <div class="space-y-4">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-semibold mb-2">Basic Information</h4>
                            <div class="space-y-2 text-sm">
                                <p><span class="font-medium">Name:</span> ${user.firstName} ${user.lastName}</p>
                                <p><span class="font-medium">Email:</span> ${user.email}</p>
                                <p><span class="font-medium">Role:</span> 
                                    <span class="px-2 py-1 text-xs rounded-full ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                                        ${user.role.toUpperCase()}
                                    </span>
                                </p>
                                <p><span class="font-medium">Status:</span> 
                                    <span class="px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${user.status.toUpperCase()}
                                    </span>
                                </p>
                                <p><span class="font-medium">Created:</span> ${new Date(user.createdAt).toLocaleDateString()}</p>
                                <p><span class="font-medium">Last Login:</span> ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</p>
                            </div>
                        </div>
                        
                        ${user.adminMetrics ? `
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <h4 class="font-semibold mb-2">Admin Metrics</h4>
                                <div class="space-y-2 text-sm">
                                    <p><span class="font-medium">Total Actions:</span> ${user.adminMetrics.totalActions}</p>
                                    <p><span class="font-medium">Articles Created:</span> ${user.adminMetrics.articlesCreated}</p>
                                    <p><span class="font-medium">Articles Edited:</span> ${user.adminMetrics.articlesEdited}</p>
                                    <p><span class="font-medium">Performance Score:</span> ${user.adminMetrics.performanceScore}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Activity Summary -->
                    <div class="space-y-4">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-semibold mb-2">Activity Summary</h4>
                            <div class="space-y-2 text-sm">
                                <p><span class="font-medium">Total Sessions:</span> ${activitySummary.totalSessions}</p>
                                <p><span class="font-medium">Active Sessions:</span> ${activitySummary.activeSessions}</p>
                                <p><span class="font-medium">Security Events:</span> ${activitySummary.totalSecurityEvents}</p>
                            </div>
                        </div>
                        
                        <!-- Recent Sessions -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-semibold mb-2">Recent Sessions</h4>
                            <div class="space-y-2 max-h-32 overflow-y-auto">
                                ${activitySummary.recentSessions.length > 0 ? 
                                    activitySummary.recentSessions.map(session => `
                                        <div class="text-xs bg-white p-2 rounded">
                                            <p class="font-medium">${session.ipAddress}</p>
                                            <p class="text-gray-600">${new Date(session.loginTime).toLocaleString()}</p>
                                            <span class="px-1 py-0.5 text-xs rounded ${session.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                                ${session.isActive ? 'Active' : 'Ended'}
                                            </span>
                                        </div>
                                    `).join('') : 
                                    '<p class="text-xs text-gray-500">No recent sessions</p>'
                                }
                            </div>
                        </div>
                        
                        <!-- Security Events -->
                        <div class="bg-yellow-50 p-4 rounded-lg">
                            <h4 class="font-semibold mb-2">Recent Security Events</h4>
                            <div class="space-y-2 max-h-32 overflow-y-auto">
                                ${activitySummary.recentSecurityEvents.length > 0 ? 
                                    activitySummary.recentSecurityEvents.map(event => `
                                        <div class="text-xs bg-white p-2 rounded">
                                            <p class="font-medium">${event.type}</p>
                                            <p class="text-gray-600">${event.description}</p>
                                            <div class="flex justify-between items-center mt-1">
                                                <span class="px-1 py-0.5 text-xs rounded ${event.severity === 'high' ? 'bg-red-100 text-red-800' : event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">
                                                    ${event.severity.toUpperCase()}
                                                </span>
                                                <span class="text-gray-500">${new Date(event.timestamp).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    `).join('') : 
                                    '<p class="text-xs text-gray-500">No recent security events</p>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex justify-end space-x-2 mt-6 pt-4 border-t">
                    <button onclick="superAdmin.viewUserTimeline('${user._id}')" 
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        View Timeline
                    </button>
                    <button onclick="superAdmin.editUser('${user._id}')" 
                        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Edit User
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                        class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async editUser(userId) {
        try {
            ui.showLoading();
            const response = await api.get(`/api/admin/super/users/${userId}`);
            
            if (!response.success) throw new Error(response.message);
            
            this.showEditUserModal(response.data.user);
        } catch (error) {
            ui.showError('Failed to load user details');
        } finally {
            ui.hideLoading();
        }
    },

    showEditUserModal(user) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md w-full">
                <h3 class="text-lg font-bold mb-4">Edit User: ${user.firstName} ${user.lastName}</h3>
                <form id="editUserForm" class="space-y-4">
                    <input type="hidden" id="editUserId" value="${user._id}">
                    <div>
                        <label class="block text-sm font-medium">First Name</label>
                        <input type="text" id="editUserFirstName" value="${user.firstName}" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Last Name</label>
                        <input type="text" id="editUserLastName" value="${user.lastName}" required
                            class="mt-1 w-full rounded border p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Status</label>
                        <select id="editUserStatus" class="mt-1 w-full rounded border p-2" ${user.role === 'super' ? 'disabled' : ''}>
                            <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Role</label>
                        <select id="editUserRole" class="mt-1 w-full rounded border p-2" ${user.role === 'super' ? 'disabled' : ''}>
                            <option value="user"<option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                            ${user.role === 'super' ? '<option value="super" selected>Super Admin</option>' : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Reason for Change</label>
                        <textarea id="editUserReason" rows="2" 
                            class="mt-1 w-full rounded border p-2" 
                            placeholder="Optional: Reason for this change"></textarea>
                    </div>
                    <div id="editUserError" class="text-red-600 text-sm hidden"></div>
                    <div class="flex justify-end space-x-2 pt-4">
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                        <button type="submit"
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save Changes</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('editUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditUserSubmit(modal);
        });
    },

    async handleEditUserSubmit(modal) {
        try {
            const errorDiv = document.getElementById('editUserError');
            errorDiv.classList.add('hidden');

            const userId = document.getElementById('editUserId').value;
            const firstName = document.getElementById('editUserFirstName').value.trim();
            const lastName = document.getElementById('editUserLastName').value.trim();
            const status = document.getElementById('editUserStatus').value;
            const role = document.getElementById('editUserRole').value;
            const reason = document.getElementById('editUserReason').value.trim();

            if (!firstName || !lastName) {
                throw new Error('First name and last name are required');
            }

            ui.showLoading();

            // Update status if changed
            await api.put(`/api/admin/super/users/${userId}/status`, {
                status,
                reason: reason || 'Updated by super admin'
            });

            // Update role if changed
            await api.put(`/api/admin/super/users/${userId}/role`, {
                role,
                reason: reason || 'Updated by super admin'
            });

            modal.remove();
            ui.showError('User updated successfully', 'success');
            await this.refreshUserList();

        } catch (error) {
            const errorDiv = document.getElementById('editUserError');
            errorDiv.textContent = error.message || 'Failed to update user';
            errorDiv.classList.remove('hidden');
        } finally {
            ui.hideLoading();
        }
    },

    async toggleUserStatus(userId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'enable' : 'disable';
        
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            ui.showLoading();
            const response = await api.put(`/api/admin/super/users/${userId}/status`, {
                status: newStatus,
                reason: `User ${action}d by super admin`
            });

            if (!response.success) throw new Error(response.message);

            ui.showError(`User ${action}d successfully`, 'success');
            await this.refreshUserList();

        } catch (error) {
            ui.showError(`Failed to ${action} user: ${error.message}`);
        } finally {
            ui.hideLoading();
        }
    },

    async viewUserTimeline(userId) {
        try {
            ui.showLoading();
            const response = await api.get(`/api/admin/super/users/${userId}/timeline`);
            
            if (!response.success) throw new Error(response.message);
            
            this.showUserTimelineModal(response.data);
        } catch (error) {
            ui.showError('Failed to load user timeline');
        } finally {
            ui.hideLoading();
        }
    },

    showUserTimelineModal(timelineData) {
        const { userId, timeline } = timelineData;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold">User Activity Timeline</h3>
                    <button onclick="this.closest('.fixed').remove()" 
                        class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="space-y-4 max-h-[70vh] overflow-y-auto">
                    ${timeline.length > 0 ? timeline.map(event => `
                        <div class="flex items-start space-x-4 p-4 border rounded-lg ${this.getTimelineEventColor(event.type)}">
                            <div class="flex-shrink-0 mt-1">
                                ${this.getTimelineEventIcon(event.type)}
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center justify-between">
                                    <h4 class="text-sm font-medium text-gray-900">
                                        ${this.formatTimelineAction(event.action, event.type)}
                                    </h4>
                                    <span class="text-xs text-gray-500">
                                        ${new Date(event.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div class="mt-1 text-sm text-gray-600">
                                    ${this.formatTimelineDetails(event.details, event.type)}
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="text-center text-gray-500 py-8">
                            No timeline events found
                        </div>
                    `}
                </div>
                
                <div class="flex justify-end mt-6 pt-4 border-t">
                    <button onclick="this.closest('.fixed').remove()" 
                        class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    getTimelineEventColor(type) {
        const colors = {
            'session': 'bg-blue-50 border-blue-200',
            'security': 'bg-red-50 border-red-200',
            'role_change': 'bg-purple-50 border-purple-200',
            'admin_action': 'bg-green-50 border-green-200'
        };
        return colors[type] || 'bg-gray-50 border-gray-200';
    },

    getTimelineEventIcon(type) {
        const icons = {
            'session': '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>',
            'security': '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>',
            'role_change': '<svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>',
            'admin_action': '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>'
        };
        return icons[type] || '<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    },

    formatTimelineAction(action, type) {
        const actionMap = {
            'login': 'User logged in',
            'logout': 'User logged out',
            'role_updated': 'Role changed',
            'status_change': 'Status changed',
            'failed_login': 'Failed login attempt',
            'USER_STATUS_CHANGED': 'Status modified by admin',
            'USER_ROLE_CHANGED': 'Role modified by admin'
        };
        return actionMap[action] || action.replace(/_/g, ' ').toLowerCase();
    },

    formatTimelineDetails(details, type) {
        if (!details) return '';
        
        if (type === 'session') {
            return `IP: ${details.ipAddress || 'Unknown'}${details.location ? `, Location: ${details.location.city}` : ''}`;
        } else if (type === 'security') {
            return details.description || '';
        } else if (type === 'role_change') {
            return `From ${details.fromRole} to ${details.toRole}${details.reason ? ` - ${details.reason}` : ''}`;
        } else if (type === 'admin_action') {
            return `By ${details.admin || 'System'}${details.reason ? ` - ${details.reason}` : ''}`;
        }
        
        return '';
    },

    async handleBulkOperations() {
        const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);
        
        if (selectedUsers.length === 0) {
            ui.showError('Please select users for bulk operations');
            return;
        }

        this.showBulkOperationsModal(selectedUsers);
    },

    showBulkOperationsModal(userIds) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md w-full">
                <h3 class="text-lg font-bold mb-4">Bulk Operations (${userIds.length} users)</h3>
                <form id="bulkOperationForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium">Operation</label>
                        <select id="bulkOperation" class="mt-1 w-full rounded border p-2" required>
                            <option value="">Select Operation</option>
                            <option value="updateStatus">Update Status</option>
                            <option value="updateRole">Update Role</option>
                            <option value="resetPassword">Reset Passwords</option>
                        </select>
                    </div>
                    
                    <div id="bulkStatusOptions" class="hidden">
                        <label class="block text-sm font-medium">New Status</label>
                        <select id="bulkStatus" class="mt-1 w-full rounded border p-2">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    
                    <div id="bulkRoleOptions" class="hidden">
                        <label class="block text-sm font-medium">New Role</label>
                        <select id="bulkRole" class="mt-1 w-full rounded border p-2">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium">Reason</label>
                        <textarea id="bulkReason" rows="2" 
                            class="mt-1 w-full rounded border p-2" 
                            placeholder="Reason for this bulk operation"></textarea>
                    </div>
                    
                    <div id="bulkOperationError" class="text-red-600 text-sm hidden"></div>
                    
                    <div class="flex justify-end space-x-2 pt-4">
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                        <button type="submit"
                            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Execute Operation</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Setup form behavior
        const operationSelect = document.getElementById('bulkOperation');
        const statusOptions = document.getElementById('bulkStatusOptions');
        const roleOptions = document.getElementById('bulkRoleOptions');
        
        operationSelect.addEventListener('change', (e) => {
            statusOptions.classList.add('hidden');
            roleOptions.classList.add('hidden');
            
            if (e.target.value === 'updateStatus') {
                statusOptions.classList.remove('hidden');
            } else if (e.target.value === 'updateRole') {
                roleOptions.classList.remove('hidden');
            }
        });

        document.getElementById('bulkOperationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleBulkOperationSubmit(modal, userIds);
        });
    },

    async handleBulkOperationSubmit(modal, userIds) {
        try {
            const errorDiv = document.getElementById('bulkOperationError');
            errorDiv.classList.add('hidden');

            const operation = document.getElementById('bulkOperation').value;
            const reason = document.getElementById('bulkReason').value.trim();

            if (!operation) {
                throw new Error('Please select an operation');
            }

            const data = { reason: reason || 'Bulk operation by super admin' };
            
            if (operation === 'updateStatus') {
                data.status = document.getElementById('bulkStatus').value;
            } else if (operation === 'updateRole') {
                data.role = document.getElementById('bulkRole').value;
            }

            if (!confirm(`Are you sure you want to perform this bulk operation on ${userIds.length} users?`)) {
                return;
            }

            ui.showLoading();
            const response = await api.post('/api/admin/super/users/bulk', {
                operation,
                userIds,
                data
            });

            if (!response.success) throw new Error(response.message);

            modal.remove();
            
            const results = response.data;
            const successCount = results.success.length;
            const failedCount = results.failed.length;
            
            ui.showError(`Bulk operation completed: ${successCount} successful, ${failedCount} failed`, 'success');
            await this.refreshUserList();

        } catch (error) {
            const errorDiv = document.getElementById('bulkOperationError');
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            ui.hideLoading();
        }
    },
    // =====================================
    // SEARCH AND NAVIGATION METHODS - PART 4
    // Add this section after Part 3
    // =====================================
    async searchUsers() {
        const search = document.getElementById('userSearch')?.value.trim() || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const role = document.getElementById('roleFilter')?.value || '';
        
        this.currentFilters = { search, status, role };
        this.currentPage = 1;
        
        await this.loadUserPage(1);
    },

    async loadUserPage(page) {
        this.currentPage = page;
        
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20',
            ...this.currentFilters
        });

        try {
            ui.showLoading();
            const response = await api.get(`/api/admin/super/users?${params}`);
            
            if (!response.success) throw new Error(response.message);
            
            this.updateUserTable(response.data);
            
        } catch (error) {
            ui.showError('Failed to load users');
        } finally {
            ui.hideLoading();
        }
    },

    updateUserTable(data) {
        const { users, pagination } = data;
        const tableBody = document.getElementById('userTableBody');
        
        if (!tableBody) return;
        
        tableBody.innerHTML = users.map(user => `
            <tr class="hover:bg-gray-50" data-user-id="${user._id}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" class="user-checkbox rounded border-gray-300" value="${user._id}">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span class="text-sm font-medium text-gray-700">
                                    ${user.firstName.charAt(0)}${user.lastName.charAt(0)}
                                </span>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">
                                ${user.firstName} ${user.lastName}
                            </div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full 
                        ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                          user.role === 'super' ? 'bg-purple-100 text-purple-800' : 
                          'bg-gray-100 text-gray-800'}">
                        ${user.role.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full 
                        ${user.status === 'active' ? 'bg-green-100 text-green-800' : 
                          user.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}">
                        ${user.status.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="superAdmin.viewUserDetails('${user._id}')" 
                            class="text-blue-600 hover:text-blue-900">View</button>
                        <button onclick="superAdmin.editUser('${user._id}')" 
                            class="text-indigo-600 hover:text-indigo-900">Edit</button>
                        ${user.role !== 'super' ? `
                            <button onclick="superAdmin.toggleUserStatus('${user._id}', '${user.status}')" 
                                class="text-${user.status === 'active' ? 'yellow' : 'green'}-600 hover:text-${user.status === 'active' ? 'yellow' : 'green'}-900">
                                ${user.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Update pagination info
        this.updatePaginationInfo(pagination);
        
        // Re-setup event listeners
        this.setupUserTableEventListeners();
    },

    updatePaginationInfo(pagination) {
        // Update pagination display if needed
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            // Update pagination buttons and info
        }
    },

    setupUserTableEventListeners() {
        // Re-setup checkbox listeners
        const selectAllCheckbox = document.getElementById('selectAll');
        const userCheckboxes = document.querySelectorAll('.user-checkbox');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                userCheckboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
        
        userCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = checkedBoxes.length === userCheckboxes.length;
                }
            });
        });
    },

    async refreshUserList() {
        await this.loadUserPage(this.currentPage);
    },

    async investigateUser(userId) {
        // Open user details in investigation mode
        await this.viewUserDetails(userId);
    },

    async viewAdminDetails(adminId) {
        // Redirect to admin details view
        await this.handleEditAdmin(adminId);
    },

    // =====================================
    // EXISTING UTILITY METHODS - PART 4
    // =====================================
    checkAuthStatus() {
        const token = auth.getToken();
        if (!token) {
            window.location.hash = '#login';
            return false;
        }
        return true;
    },

    async reloadAdminPanel() {
        try {
            const loadStatistics = window.loadStatistics;
            if (typeof loadStatistics === 'function') {
                await loadStatistics();
            } else {
                window.location.hash = '#admin';
            }
        } catch (error) {
            console.error('Error reloading admin panel:', error);
            window.location.hash = '#admin';
        }
    },

    initialize() {
        if (!this.checkAuthStatus() || !this.isSuperAdmin()) {
            window.location.hash = '#login';
            return;
        }
    },

    isSuperAdmin() {
        const user = auth.user.get();
        return user?.user?.role === 'super';
    },

    handleFilterLogs(startDate, endDate) {
        if (startDate && endDate) {
            window.loadActivityLog(startDate, endDate);
        }
    },

    handleExportLogs() {
        const startDate = document.getElementById('logStartDate')?.value;
        const endDate = document.getElementById('logEndDate')?.value;
        
        if (startDate && endDate) {
            window.location.href = `/api/admin/super/logs/export?start=${startDate}&end=${endDate}`;
        } else {
            ui.showError('Please select a date range to export');
        }
    }
};

// Make functions globally available
window.superAdmin = superAdmin;
