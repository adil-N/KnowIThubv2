// frontend/src/js/user/userProfile.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';

export const userProfile = {
    userData: null,

    initialize() {
        this.render();
        this.fetchUserData();
    },

    async fetchUserData() {
        try {
            ui.showLoading();
            const response = await api.get('/users/profile');
            
            if (response.success) {
                this.userData = response.data;
                this.renderUserData(response.data);
                this.updateActionButtons(response.data);
            } else {
                ui.showError(response.message);
            }
        } catch (error) {
            ui.showError('Failed to load user profile');
        } finally {
            ui.hideLoading();
        }
    },

    render() {
        const profileSection = document.getElementById('userProfileSection');
        if (!profileSection) return;

        profileSection.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <!-- User Profile Card -->
                <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div class="flex justify-between items-start">
                        <h2 class="text-2xl font-bold">User Profile</h2>
                        <span id="userRoleBadge" class="px-3 py-1 rounded-full text-sm font-semibold"></span>
                    </div>
                    <div id="profileContent" class="animate-pulse">
                        <!-- Loading placeholder -->
                        <div class="space-y-4">
                            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 class="text-lg font-semibold mb-4">Account Actions</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="actionButtons">
                        <button id="changePasswordBtn" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Change Password
                        </button>
                        <button id="updateProfileBtn" 
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                            Update Profile Information
                        </button>
                    </div>
                </div>

                <!-- Admin/Super Actions -->
                <div id="adminActions" class="bg-white rounded-lg shadow-md p-6 mb-6 hidden">
                    <h3 class="text-lg font-semibold mb-4">Administrative Actions</h3>
                    <div class="space-y-4">
                        <!-- Admin content will be dynamically added -->
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 class="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div id="recentActivity" class="space-y-4">
                        <!-- Activity content will be dynamically added -->
                    </div>
                </div>

                <!-- Forms Container -->
                <div id="profileForms" class="mt-6"></div>
            </div>
        `;

        this.attachEventListeners();
    },

    renderUserData(userData) {
        const profileContent = document.getElementById('profileContent');
        const userRoleBadge = document.getElementById('userRoleBadge');
        if (!profileContent || !userRoleBadge) return;

        // Set role badge color
        const roleColors = {
            super: 'bg-red-100 text-red-800',
            admin: 'bg-purple-100 text-purple-800',
            user: 'bg-blue-100 text-blue-800'
        };

        userRoleBadge.className = `px-3 py-1 rounded-full text-sm font-semibold ${roleColors[userData.role]}`;
        userRoleBadge.textContent = userData.role.toUpperCase();

        profileContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                    <h3 class="text-lg font-semibold mb-3">Personal Information</h3>
                    <div class="space-y-2">
                        <p><span class="font-medium">Name:</span> ${userData.firstName} ${userData.lastName}</p>
                        <p><span class="font-medium">Email:</span> ${userData.email}</p>
                        <p><span class="font-medium">Status:</span> 
                            <span class="px-2 py-1 rounded-full text-sm font-semibold 
                                ${userData.status === 'active' ? 'bg-green-100 text-green-800' : 
                                userData.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'}">
                                ${userData.status.toUpperCase()}
                            </span>
                        </p>
                        <p><span class="font-medium">Member Since:</span> ${new Date(userData.createdAt).toLocaleDateString()}</p>
                        <p><span class="font-medium">Last Login:</span> ${new Date(userData.lastLogin).toLocaleString()}</p>
                    </div>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-3">Activity Statistics</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-blue-50 p-4 rounded">
                            <p class="text-2xl font-bold">${userData.stats?.totalArticles || 0}</p>
                            <p class="text-sm text-gray-600">Articles</p>
                        </div>
                        <div class="bg-green-50 p-4 rounded">
                            <p class="text-2xl font-bold">${userData.stats?.totalComments || 0}</p>
                            <p class="text-sm text-gray-600">Comments</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderAdminSection(userData);
        this.fetchAndRenderRecentActivity();
    },

    updateActionButtons(userData) {
        const actionButtons = document.getElementById('actionButtons');
        if (!actionButtons) return;

        // Add role-specific buttons
        if (userData.role === 'admin' || userData.role === 'super') {
            actionButtons.innerHTML += `
                <button id="manageUsersBtn" 
                    class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                    Manage Users
                </button>
            `;
        }

        this.attachActionButtonListeners(userData);
    },

    renderAdminSection(userData) {
        const adminActions = document.getElementById('adminActions');
        if (!adminActions) return;

        if (userData.role === 'admin' || userData.role === 'super') {
            adminActions.classList.remove('hidden');
            adminActions.querySelector('.space-y-4').innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-purple-50 p-4 rounded">
                        <h4 class="font-semibold mb-2">Administrative Overview</h4>
                        <div class="space-y-1">
                            <p class="text-sm">Role: ${userData.role}</p>
                            <p class="text-sm">Access Level: ${userData.role === 'super' ? 'Full Access' : 'Limited Access'}</p>
                        </div>
                    </div>
                    <div class="bg-blue-50 p-4 rounded">
                        <h4 class="font-semibold mb-2">Quick Actions</h4>
                        <div class="space-y-2">
                            <button id="viewLogsBtn" class="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm">
                                View Activity Logs
                            </button>
                            ${userData.role === 'super' ? `
                                <button id="systemSettingsBtn" class="w-full px-3 py-1 bg-purple-600 text-white rounded text-sm">
                                    System Settings
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            this.attachAdminEventListeners();
        }
    },

    async fetchAndRenderRecentActivity() {
        try {
            const response = await api.get('/users/activity');
            if (response.success) {
                this.renderRecentActivity(response.data);
            }
        } catch (error) {
            console.error('Error fetching activity:', error);
        }
    },

    renderRecentActivity(activities) {
        const activityContainer = document.getElementById('recentActivity');
        if (!activityContainer) return;

        if (!activities || activities.length === 0) {
            activityContainer.innerHTML = '<p class="text-gray-500">No recent activity</p>';
            return;
        }

        activityContainer.innerHTML = activities.map(activity => `
            <div class="flex items-center space-x-3 border-l-4 border-blue-500 pl-3">
                <div class="flex-1">
                    <p class="text-sm">${activity.description}</p>
                    <p class="text-xs text-gray-500">${new Date(activity.timestamp).toLocaleString()}</p>
                </div>
            </div>
        `).join('');
    },

    attachEventListeners() {
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
            this.showChangePasswordForm();
        });

        document.getElementById('updateProfileBtn')?.addEventListener('click', () => {
            this.showUpdateProfileForm();
        });
    },

    attachActionButtonListeners(userData) {
        if (userData.role === 'admin' || userData.role === 'super') {
            document.getElementById('manageUsersBtn')?.addEventListener('click', () => {
                window.location.hash = '#admin/users';
            });
        }
    },

    attachAdminEventListeners() {
        document.getElementById('viewLogsBtn')?.addEventListener('click', () => {
            this.showActivityLogs();
        });

        document.getElementById('systemSettingsBtn')?.addEventListener('click', () => {
            this.showSystemSettings();
        });
    },

    // ... (keeping your existing form methods)

    async showActivityLogs() {
        // Implementation for viewing activity logs
        console.log('Activity logs feature to be implemented');
    },

    async showSystemSettings() {
        // Implementation for system settings
        console.log('System settings feature to be implemented');
    }
};