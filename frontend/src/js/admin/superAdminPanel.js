// frontend/src/js/admin/superAdminPanel.js - Complete Enhanced Version
import { superAdmin } from './superAdmin.js';
import { superAdminStatsPanel } from './superAdminStatsPanel.js';
import { ui } from '../utils/ui.js';
import { api } from '../utils/api.js';
import { auth } from '../utils/auth.js';

// Make functions globally available
window.superAdmin = superAdmin;

export async function showSuperAdminPanel() {
    try {
        const superAdminContent = document.getElementById('superAdminContent');
        if (!superAdminContent) throw new Error('Required elements not found');
        
        const user = auth.user.get();
        if (!user?.user?.role || user.user.role !== 'super') {
            throw new Error('Not a super admin user');
        }

        // Render the main panel structure with enhanced tabs
        superAdminContent.innerHTML = `
            <div class="p-4">
                <h1 class="text-2xl font-bold mb-4">Super Admin Dashboard</h1>
                
                <!-- Tab Navigation -->
                <div class="border-b border-gray-200 mb-4">
                    <nav class="-mb-px flex space-x-8">
                        <button id="tab-stats" class="tab-button border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            Statistics Dashboard
                        </button>
                        <button id="tab-admin" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            Administrator Management
                        </button>
                        <button id="tab-users" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            User Management
                        </button>
                        <button id="tab-security" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            Security Monitor
                        </button>
                        <button id="tab-monitoring" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            Real-time Monitoring
                        </button>
                    </nav>
                </div>
                
                <!-- Tab Content -->
                <div id="tabContent" class="min-h-[600px]">
                    <!-- Content will be loaded here -->
                    <div class="flex items-center justify-center h-64">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                </div>
            </div>
        `;

        // Initialize the panel and show the default tab
        await initializeSuperAdminPanel();
        return true;

    } catch (error) {
        console.error('Error in showSuperAdminPanel:', error);
        ui.showError(error.message);
        return false;
    }
}

async function initializeSuperAdminPanel() {
    try {
        // Set up tab switching
        const tabContent = document.getElementById('tabContent');
        const statsTab = document.getElementById('tab-stats');
        const adminTab = document.getElementById('tab-admin');
        const usersTab = document.getElementById('tab-users');
        const securityTab = document.getElementById('tab-security');
        const monitoringTab = document.getElementById('tab-monitoring');
        
        if (!tabContent) {
            throw new Error('Required elements not found');
        }
        
        // Show statistics dashboard by default
        await showStatisticsTab();
        
        // Add event listeners for tab switching
        statsTab?.addEventListener('click', async () => {
            setActiveTab('stats');
            await showStatisticsTab();
        });
        
        adminTab?.addEventListener('click', async () => {
            setActiveTab('admin');
            await showAdminManagementTab();
        });

        usersTab?.addEventListener('click', async () => {
            setActiveTab('users');
            await showUserManagementTab();
        });

        securityTab?.addEventListener('click', async () => {
            setActiveTab('security');
            await showSecurityMonitorTab();
        });

        monitoringTab?.addEventListener('click', async () => {
            setActiveTab('monitoring');
            await showRealTimeMonitoringTab();
        });
        
        // Attach event listeners for other functionality
        attachEventListeners();
    } catch (error) {
        console.error('Error initializing super admin panel:', error);
        ui.showError('Failed to initialize super admin panel');
    }
}

function setActiveTab(tabName) {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        if (tab.id === `tab-${tabName}`) {
            tab.classList.add('border-blue-500', 'text-blue-600');
            tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        } else {
            tab.classList.remove('border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        }
    });
}

async function showStatisticsTab() {
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    `;
    
    await superAdminStatsPanel.initialize(tabContent);
}

async function showAdminManagementTab() {
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    `;
    
    try {
        await loadAdminManagement(tabContent);
    } catch (error) {
        console.error('Error loading admin management tab:', error);
        tabContent.innerHTML = `
            <div class="p-4 bg-red-100 text-red-800 rounded-md">
                <p class="font-semibold">Error loading administrator management</p>
                <p>${error.message || 'Unknown error occurred'}</p>
            </div>
        `;
    }
}

async function showUserManagementTab() {
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    `;
    
    try {
        await loadUserManagement(tabContent);
    } catch (error) {
        console.error('Error loading user management tab:', error);
        tabContent.innerHTML = `
            <div class="p-4 bg-red-100 text-red-800 rounded-md">
                <p class="font-semibold">Error loading user management</p>
                <p>${error.message || 'Unknown error occurred'}</p>
            </div>
        `;
    }
}

async function showSecurityMonitorTab() {
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    `;
    
    try {
        await loadSecurityMonitor(tabContent);
    } catch (error) {
        console.error('Error loading security monitor tab:', error);
        tabContent.innerHTML = `
            <div class="p-4 bg-red-100 text-red-800 rounded-md">
                <p class="font-semibold">Error loading security monitor</p>
                <p>${error.message || 'Unknown error occurred'}</p>
            </div>
        `;
    }
}

async function showRealTimeMonitoringTab() {
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    `;
    
    try {
        await loadRealTimeMonitoring(tabContent);
    } catch (error) {
        console.error('Error loading real-time monitoring tab:', error);
        tabContent.innerHTML = `
            <div class="p-4 bg-red-100 text-red-800 rounded-md">
                <p class="font-semibold">Error loading real-time monitoring</p>
                <p>${error.message || 'Unknown error occurred'}</p>
            </div>
        `;
    }
}

async function loadAdminManagement(container) {
    try {
        ui.showLoading();
        const response = await api.get('/api/admin/super/admins');
        if (!response.success) throw new Error(response.message);

        const admins = response.data;
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Admin Statistics Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-sm font-medium text-gray-500">Total Admins</h3>
                        <p class="mt-2 text-3xl font-bold text-gray-900">${admins.length}</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-sm font-medium text-gray-500">Active Admins</h3>
                        <p class="mt-2 text-3xl font-bold text-green-600">
                            ${admins.filter(admin => admin.status === 'active').length}
                        </p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-sm font-medium text-gray-500">System Status</h3>
                        <p class="mt-2 text-3xl font-bold text-green-600">Active</p>
                    </div>
                </div>

                <!-- Admin Management Section -->
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-semibold text-gray-900">Administrator Management</h2>
                            <button onclick="superAdmin.handleCreateAdmin()" 
                                class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                                Add Admin
                            </button>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${admins.map(admin => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="flex items-center">
                                                <div class="flex-shrink-0 h-10 w-10">
                                                    <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                                        <span class="text-sm font-medium text-gray-700">
                                                            ${admin.firstName.charAt(0)}${admin.lastName.charAt(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div class="ml-4">
                                                    <div class="text-sm font-medium text-gray-900">
                                                        ${admin.firstName} ${admin.lastName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-gray-900">${admin.email}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${admin.role === 'super' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                                                ${admin.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${admin.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${admin.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button onclick="superAdmin.handleEditAdmin('${admin._id}')" 
                                                class="text-indigo-600 hover:text-indigo-900">Edit</button>
                                            ${admin.role !== 'super' ? `
                                                <button onclick="superAdmin.handleResetPassword('${admin._id}')"
                                                    class="text-yellow-600 hover:text-yellow-900">Reset Password</button>
                                                <button onclick="superAdmin.handleDeleteAdmin('${admin._id}')"
                                                    class="text-red-600 hover:text-red-900">Delete</button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Recent Activity Section -->
                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">Recent Activity</h3>
                            <div class="flex space-x-2">
                                <input type="date" id="logStartDate" 
                                    class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                                <input type="date" id="logEndDate" 
                                    class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                                <button id="filterLogs" 
                                    class="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                                    Filter
                                </button>
                                <button id="exportLogs" 
                                    class="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="p-6">
                        <div id="activityLogContainer" class="min-h-[300px]">
                            Loading activity logs...
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        await loadActivityLog();
        
    } catch (error) {
        console.error('Error loading admin management:', error);
        ui.showError('Failed to load admin management');
    } finally {
        ui.hideLoading();
    }
}
async function loadUserManagement(container) {
    try {
        ui.showLoading();
        const response = await api.get('/api/admin/super/users?limit=50');
        if (!response.success) throw new Error(response.message);

        const { users, pagination } = response.data;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- User Management Header -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold">User Management</h2>
                        <div class="flex space-x-2">
                            <button onclick="superAdmin.handleCreateUser()" 
                                class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                Create User
                            </button>
                            <button onclick="superAdmin.handleBulkOperations()" 
                                class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                                Bulk Actions
                            </button>
                        </div>
                    </div>
                    
                    <!-- User Statistics -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h3 class="text-sm font-medium text-blue-600">Total Users</h3>
                            <p class="mt-1 text-2xl font-semibold text-blue-900">${pagination.total}</p>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h3 class="text-sm font-medium text-green-600">Active Users</h3>
                            <p class="mt-1 text-2xl font-semibold text-green-900">
                                ${users.filter(user => user.status === 'active').length}
                            </p>
                        </div>
                        <div class="bg-yellow-50 p-4 rounded-lg">
                            <h3 class="text-sm font-medium text-yellow-600">Inactive Users</h3>
                            <p class="mt-1 text-2xl font-semibold text-yellow-900">
                                ${users.filter(user => user.status === 'inactive').length}
                            </p>
                        </div>
                        <div class="bg-red-50 p-4 rounded-lg">
                            <h3 class="text-sm font-medium text-red-600">Suspended Users</h3>
                            <p class="mt-1 text-2xl font-semibold text-red-900">
                                ${users.filter(user => user.status === 'suspended').length}
                            </p>
                        </div>
                    </div>
                    
                    <!-- Search and Filter Controls -->
                    <div class="flex flex-wrap gap-4 mb-4">
                        <input type="text" id="userSearch" placeholder="Search users..." 
                            class="flex-1 min-w-64 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
                        <select id="statusFilter" class="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <select id="roleFilter" class="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
                            <option value="">All Roles</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button onclick="superAdmin.searchUsers()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Search
                        </button>
                    </div>
                </div>
                
                <!-- User List -->
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-medium">Users (${pagination.total})</h3>
                            <div class="flex items-center space-x-2">
                                <input type="checkbox" id="selectAll" class="rounded border-gray-300">
                                <label for="selectAll" class="text-sm text-gray-600">Select All</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        <input type="checkbox" class="rounded border-gray-300">
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200" id="userTableBody">
                                ${generateUserTableRows(users)}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    ${generatePagination(pagination)}
                </div>
            </div>
        `;
        
        setupUserManagementEventListeners();
        
    } catch (error) {
        console.error('Error loading user management:', error);
        ui.showError('Failed to load user management');
    } finally {
        ui.hideLoading();
    }
}

function generateUserTableRows(users) {
    return users.map(user => `
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
}

function generatePagination(pagination) {
    return `
        <div class="px-6 py-4 border-t border-gray-200">
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-700">
                    Showing ${((pagination.page - 1) * pagination.limit) + 1} to 
                    ${Math.min(pagination.page * pagination.limit, pagination.total)} of 
                    ${pagination.total} results
                </div>
                <div class="flex space-x-2">
                    ${pagination.page > 1 ? `
                        <button onclick="superAdmin.loadUserPage(${pagination.page - 1})" 
                            class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                            Previous
                        </button>
                    ` : ''}
                    ${pagination.page < pagination.pages ? `
                        <button onclick="superAdmin.loadUserPage(${pagination.page + 1})" 
                            class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                            Next
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}
async function loadSecurityMonitor(container) {
    try {
        ui.showLoading();
        const response = await api.get('/api/admin/super/monitoring/security-dashboard');
        if (!response.success) throw new Error(response.message);

        const securityData = response.data;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Security Overview -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center">
                            <div class="p-2 bg-blue-100 rounded-lg">
                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 5.197v1M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                </svg>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Active Sessions</p>
                                <p class="text-2xl font-semibold text-gray-900">${securityData.activeSessions}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center">
                            <div class="p-2 bg-red-100 rounded-lg">
                                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Security Alerts</p>
                                <p class="text-2xl font-semibold text-gray-900">${securityData.securityAlerts.length}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center">
                            <div class="p-2 bg-yellow-100 rounded-lg">
                                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Failed Logins</p>
                                <p class="text-2xl font-semibold text-gray-900">${securityData.failedLogins.totalFailedAttempts}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center">
                            <div class="p-2 bg-green-100 rounded-lg">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">System Health</p>
                                <p class="text-2xl font-semibold text-gray-900">Good</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Security Alerts -->
                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium">Security Alerts</h3>
                    </div>
                    <div class="p-6">
                        ${securityData.securityAlerts.length > 0 ? `
                            <div class="space-y-4">
                                ${securityData.securityAlerts.slice(0, 10).map(alert => `
                                    <div class="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
                                        <div class="flex-shrink-0">
                                            <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                                            </svg>
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <p class="text-sm font-medium text-red-800">${alert.userName} (${alert.email})</p>
                                            <p class="text-sm text-red-600">${alert.event.description}</p>
                                            <p class="text-xs text-red-500 mt-1">${new Date(alert.event.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-gray-500 text-center py-8">No security alerts at this time</p>
                        `}
                    </div>
                </div>
                
                <!-- Suspicious Activity -->
                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium">Suspicious Activity Detection</h3>
                    </div>
                    <div class="p-6">
                        ${securityData.suspiciousActivity.length > 0 ? `
                            <div class="space-y-4">
                                ${securityData.suspiciousActivity.map(activity => `
                                    <div class="flex items-start justify-between p-4 border rounded-lg ${activity.riskLevel === 'critical' ? 'border-red-300 bg-red-50' : 
                                          activity.riskLevel === 'high' ? 'border-orange-300 bg-orange-50' : 
                                          activity.riskLevel === 'medium' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300 bg-gray-50'}">
                                        <div>
                                            <h4 class="font-medium">${activity.name}</h4>
                                            <p class="text-sm text-gray-600">${activity.email}</p>
                                            <div class="mt-2">
                                                ${activity.issues.map(issue => `
                                                    <span class="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs text-gray-700 mr-2 mb-1">
                                                        ${issue}
                                                    </span>
                                                `).join('')}
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <span class="px-2 py-1 text-xs font-semibold rounded-full 
                                                ${activity.riskLevel === 'critical' ? 'bg-red-100 text-red-800' : 
                                                  activity.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' : 
                                                  activity.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">
                                                ${activity.riskLevel.toUpperCase()}
                                            </span>
                                            <div class="mt-2">
                                                <button onclick="superAdmin.investigateUser('${activity.userId}')" 
                                                    class="text-sm text-blue-600 hover:text-blue-900">
                                                    Investigate
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-gray-500 text-center py-8">No suspicious activity detected</p>
                        `}
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading security monitor:', error);
        ui.showError('Failed to load security monitor');
    } finally {
        ui.hideLoading();
    }
}
async function loadRealTimeMonitoring(container) {
    try {
        ui.showLoading();
        const response = await api.get('/api/admin/super/monitoring/admin-performance');
        if (!response.success) throw new Error(response.message);

        const performanceData = response.data;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Real-time Status -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-medium">Real-time Admin Monitoring</h3>
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <span class="text-sm text-gray-600">Live</span>
                        </div>
                    </div>
                    
                    <!-- Admin Performance Metrics -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${performanceData.map(admin => `
                            <div class="border rounded-lg p-4 ${admin.activeSessions > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'}">
                                <div class="flex items-center justify-between mb-2">
                                    <h4 class="font-medium text-gray-900">${admin.name}</h4>
                                    <div class="flex items-center space-x-1">
                                        <div class="w-2 h-2 rounded-full ${admin.activeSessions > 0 ? 'bg-green-400' : 'bg-gray-300'}"></div>
                                        <span class="text-xs text-gray-600">${admin.activeSessions > 0 ? 'Online' : 'Offline'}</span>
                                    </div>
                                </div>
                                <div class="text-sm text-gray-600 mb-3">${admin.email}</div>
                                
                                <div class="space-y-2">
                                    <div class="flex justify-between text-sm">
                                        <span>Total Actions:</span>
                                        <span class="font-medium">${admin.metrics.totalActions}</span>
                                    </div>
                                    <div class="flex justify-between text-sm">
                                        <span>Articles Created:</span>
                                        <span class="font-medium">${admin.metrics.articlesCreated}</span>
                                    </div>
                                    <div class="flex justify-between text-sm">
                                        <span>Performance Score:</span>
                                        <span class="font-medium">${admin.metrics.performanceScore}</span>
                                    </div>
                                    <div class="flex justify-between text-sm">
                                        <span>Last Activity:</span>
                                        <span class="font-medium">${admin.lastActivity ? new Date(admin.lastActivity).toLocaleDateString() : 'Never'}</span>
                                    </div>
                                </div>
                                
                                <div class="mt-3 pt-3 border-t border-gray-200">
                                    <button onclick="superAdmin.viewAdminDetails('${admin.adminId}')" 
                                        class="text-sm text-blue-600 hover:text-blue-900">
                                        View Details →
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Live Activity Feed -->
                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium">Live Activity Feed</h3>
                    </div>
                    <div class="p-6">
                        <div id="liveActivityFeed" class="space-y-3 max-h-96 overflow-y-auto">
                            <!-- Live activity will be populated here -->
                            <div class="text-center text-gray-500 py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                Loading live activity feed...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Start live activity feed
        startLiveActivityFeed();
        
    } catch (error) {
        console.error('Error loading real-time monitoring:', error);
        ui.showError('Failed to load real-time monitoring');
    } finally {
        ui.hideLoading();
    }
}

// Helper Functions
async function loadActivityLog() {
    try {
        const response = await api.get('/api/admin/super/logs');
        const adminActivity = document.getElementById('activityLogContainer');
        if (!adminActivity) return;

        if (response.success && response.data.length > 0) {
            adminActivity.innerHTML = `
                <div class="space-y-4 max-h-[600px] overflow-y-auto">
                    ${response.data.map(log => {
                        const admin = log.adminId || {};
                        return `
                            <div class="bg-gray-50 p-3 rounded-lg">
                                <div class="flex justify-between items-start">
                                    <div class="space-y-1">
                                        <p class="text-sm font-medium text-gray-900">${log.action}</p>
                                        <p class="text-xs text-gray-600">
                                            By ${admin.firstName} ${admin.lastName} (${admin.email})
                                        </p>
                                        ${log.details ? `
                                            <div class="text-xs text-gray-500">
                                                ${Object.entries(log.details)
                                                    .filter(([key]) => !['articleId', 'originalArticleId'].includes(key))
                                                    .map(([key, value]) => 
                                                        `<p><span class="font-medium">${key}:</span> ${
                                                            typeof value === 'object' ? JSON.stringify(value) : value
                                                        }</p>`
                                                    ).join('')}
                                            </div>
                                        ` : ''}
                                        ${log.formattedArticleId ? `
                                            <p class="text-xs text-green-600">Article ID: ${log.formattedArticleId}</p>
                                        ` : ''}
                                    </div>
                                    <span class="text-xs text-gray-500">
                                        ${new Date(log.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            adminActivity.innerHTML = '<p class="text-gray-500 text-center py-4">No activity logs found</p>';
        }
    } catch (error) {
        console.error('Error loading activity log:', error);
        const adminActivity = document.getElementById('activityLogContainer');
        if (adminActivity) {
            adminActivity.innerHTML = '<p class="text-red-500 text-center py-4">Error loading activity logs</p>';
        }
    }
}

function setupUserManagementEventListeners() {
    // Select all checkbox functionality
    const selectAllCheckbox = document.getElementById('selectAll');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            userCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });
    }
    
    // Individual checkbox listeners
    userCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = checkedBoxes.length === userCheckboxes.length;
            }
        });
    });
    
    // Search functionality
    const userSearch = document.getElementById('userSearch');
    const statusFilter = document.getElementById('statusFilter');
    const roleFilter = document.getElementById('roleFilter');
    
    if (userSearch) {
        userSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                superAdmin.searchUsers();
            }
        });
    }
    
    // Auto-search on filter change
    [statusFilter, roleFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                superAdmin.searchUsers();
            });
        }
    });
}

function startLiveActivityFeed() {
    const feedContainer = document.getElementById('liveActivityFeed');
    if (!feedContainer) return;
    
    // Initial load
    updateLiveActivityFeed();
    
    // Update every 30 seconds
    const interval = setInterval(updateLiveActivityFeed, 30000);
    
    // Store interval for cleanup
    window.liveActivityInterval = interval;
}

async function updateLiveActivityFeed() {
    try {
        const response = await api.get('/api/admin/super/logs?limit=10');
        const feedContainer = document.getElementById('liveActivityFeed');
        
        if (!feedContainer || !response.success) return;
        
        const activities = response.data;
        
        feedContainer.innerHTML = activities.length > 0 ? `
            <div class="space-y-3">
                ${activities.map(activity => {
                    const admin = activity.adminId || {};
                    const timeAgo = getTimeAgo(new Date(activity.timestamp));
                    
                    return `
                        <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span class="text-xs font-medium text-blue-600">
                                        ${admin.firstName ? admin.firstName.charAt(0) : 'S'}${admin.lastName ? admin.lastName.charAt(0) : ''}
                                    </span>
                                </div>
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm text-gray-900">
                                    <span class="font-medium">${admin.firstName || 'System'} ${admin.lastName || ''}</span>
                                    ${formatActionDescription(activity.action)}
                                </p>
                                <div class="flex items-center space-x-2 mt-1">
                                    <span class="text-xs text-gray-500">${timeAgo}</span>
                                    ${activity.formattedArticleId ? `
                                        <span class="text-xs text-blue-600">Article: ${activity.formattedArticleId}</span>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="flex-shrink-0">
                                <span class="w-2 h-2 bg-green-400 rounded-full block"></span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : `
            <div class="text-center text-gray-500 py-8">
                No recent activity
            </div>
        `;
        
    } catch (error) {
        console.error('Error updating live activity feed:', error);
    }
}

function formatActionDescription(action) {
    const actionMap = {
        'USER_CREATED': 'created a new user',
        'USER_UPDATED': 'updated user information',
        'USER_STATUS_CHANGED': 'changed user status',
        'USER_ROLE_CHANGED': 'changed user role',
        'ARTICLE_CREATED': 'created an article',
        'ARTICLE_UPDATED': 'updated an article',
        'ARTICLE_DELETED': 'deleted an article',
        'ADMIN_CREATED': 'created an admin account',
        'ADMIN_UPDATED': 'updated admin information',
        'ADMIN_PASSWORD_RESET': 'reset admin password',
        'SETTINGS_UPDATED': 'updated system settings',
        'USER_LOGIN': 'logged in',
        'USER_LOGOUT': 'logged out'
    };
    
    return actionMap[action] || action.toLowerCase().replace(/_/g, ' ');
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function attachEventListeners() {
    // Filter logs button
    document.getElementById('filterLogs')?.addEventListener('click', () => {
        const startDate = document.getElementById('logStartDate').value;
        const endDate = document.getElementById('logEndDate').value;
        if (startDate && endDate) {
            superAdmin.handleFilterLogs(startDate, endDate);
        }
    });
    
    // Export logs button
    document.getElementById('exportLogs')?.addEventListener('click', () => {
        superAdmin.handleExportLogs();
    });
    
    // Cleanup interval when leaving the page
    window.addEventListener('beforeunload', () => {
        if (window.liveActivityInterval) {
            clearInterval(window.liveActivityInterval);
        }
    });
}

// Make loadActivityLog globally available for the superAdmin module
window.loadActivityLog = loadActivityLog;