// frontend/src/js/admin/adminPanel.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { articleManagement } from './articleManagement.js';
import { statsManagement } from './statsManagement.js';
import { inviteCodeManagement } from './inviteCodeManagement.js';
import { sectionManagement } from './sectionManagement.js';
import { systemBackup } from './systemBackup.js';

console.log('Imported systemBackup:', systemBackup);

let currentActiveView = null;

export async function showAdminPanel() {
    try {
        console.log('Initializing admin panel...');
        ui.showLoading();
        
        statsManagement.cleanup();
        
        ui.showSection('adminPanelContainer');
        
        await initializeAdminPanel();
        
        console.log('Admin panel initialized successfully');
    } catch (error) {
        console.error('Error showing admin panel:', error);
        ui.showError('Failed to initialize admin panel');
    } finally {
        ui.hideLoading();
    }
}

export const initializeAdminPanel = async () => {
    console.log('Setting up admin panel content...');
    const adminPanelContainer = document.getElementById('adminPanelContainer');
    if (!adminPanelContainer) {
        console.error('Admin panel container not found');
        throw new Error('Admin panel container not found');
    }

    adminPanelContainer.innerHTML = '';
    statsManagement.cleanup();

    const adminPanelTemplate = `
        <div class="bg-white rounded-lg shadow-md p-6 max-w-8xl mx-auto">
            <h2 class="text-2xl font-bold mb-6">Admin Dashboard</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="p-4 bg-blue-100 rounded-lg">
                    <h3 class="font-semibold mb-2">User Management</h3>
                    <button id="showUsers" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 flex items-center">
                        <span class="material-icons-outlined mr-2">people</span>
                        Manage Users
                    </button>
                </div>

                <div class="p-4 bg-green-100 rounded-lg">
                    <h3 class="font-semibold mb-2">Content Management</h3>
                    <button id="showContent" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-300 flex items-center">
                        <span class="material-icons-outlined mr-2">insert_drive_file</span>
                        Manage Content
                    </button>
                </div>

                <div class="p-4 bg-purple-100 rounded-lg">
                    <h3 class="font-semibold mb-2">Statistics</h3>
                    <button id="showStats" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-300 flex items-center">
                        <span class="material-icons-outlined mr-2">bar_chart</span>
                        View Stats
                    </button>
                </div>

                <div class="p-4 bg-indigo-100 rounded-lg">
                    <h3 class="font-semibold mb-2">Generate Invitation Code</h3>
                    <button id="generateNewCode" class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition duration-300 flex items-center">
                        <span class="material-icons-outlined mr-2">link</span>
                        Generate Code
                    </button>
                </div>

                <div class="p-4 bg-amber-100 rounded-lg">
                    <h3 class="font-semibold mb-2">Section Management</h3>
                    <button id="showSections" class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition duration-300 flex items-center">
                        <span class="material-icons-outlined mr-2">view_quilt</span>
                        Manage Sections
                    </button>
                </div>

                <div class="p-4 bg-blue-100 rounded-lg">
                    <h3 class="font-semibold mb-2">System Backup</h3>
                    <button id="showBackup" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 flex items-center">
                        <span class="material-icons-outlined mr-2">backup</span>
                        Backup System
                    </button>
                </div>
            </div>

            <div id="adminContent" class="mt-6">
                <div class="text-center text-gray-500 py-8">
                    <h3 class="text-lg font-medium mb-2">Welcome to Admin Dashboard</h3>
                    <p>Select an option above to get started.</p>
                </div>
            </div>
        </div>
    `;

    adminPanelContainer.innerHTML = adminPanelTemplate;

    cleanupEventListeners();

    setupEventListeners();

    currentActiveView = null;
};

function cleanupEventListeners() {
    const buttonIds = ['showUsers', 'showContent', 'showStats', 'generateNewCode', 'showSections', 'showBackup'];
    buttonIds.forEach(id => {
        const oldButton = document.getElementById(id);
        if (oldButton) {
            const newButton = oldButton.cloneNode(true);
            oldButton.parentNode.replaceChild(newButton, oldButton);
        }
    });
}

function setupEventListeners() {
    const showUsersBtn = document.getElementById('showUsers');
    if (showUsersBtn) {
        showUsersBtn.addEventListener('click', () => setActiveView('users', loadUserManagement));
    }

    const showContentBtn = document.getElementById('showContent');
    if (showContentBtn) {
        showContentBtn.addEventListener('click', () => setActiveView('content', loadContentManagement));
    }

    const showStatsBtn = document.getElementById('showStats');
    if (showStatsBtn) {
        showStatsBtn.addEventListener('click', () => setActiveView('stats', loadStatistics));
    }

    const generateCodeBtn = document.getElementById('generateNewCode');
    if (generateCodeBtn) {
        generateCodeBtn.addEventListener('click', () => setActiveView('generate', handleGenerateNewCode));
    }

    const showSectionsBtn = document.getElementById('showSections');
    if (showSectionsBtn) {
        showSectionsBtn.addEventListener('click', () => setActiveView('sections', loadSectionManagement));
    }

    const showBackupBtn = document.getElementById('showBackup');
    if (showBackupBtn) {
        showBackupBtn.addEventListener('click', () => setActiveView('backup', () => {
            try {
                const adminContent = document.getElementById('adminContent');
                if (adminContent) {
                    systemBackup.showBackupManager(adminContent);
                }
            } catch (error) {
                console.error('Error in backup manager:', error);
                ui.showError('Failed to load backup management');
            }
        }));
    }
}

async function setActiveView(viewName, loadFunction) {
    if (currentActiveView === viewName) {
        return;
    }

    statsManagement.cleanup();
    
    currentActiveView = viewName;
    
    await loadFunction();
}

async function handleGenerateNewCode() {
    try {
        ui.showLoading();
        const response = await api.post('/api/admin/invite-codes/generate', {
            expiresInDays: 30,
            maxUses: 1
        });

        if (response.success) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">New Invite Code</h3>
                        <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">✕</button>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600 mb-2">New invite code:</p>
                        <div class="flex items-center space-x-2">
                            <div class="relative flex-1">
                                <input 
                                    type="text" 
                                    value="${response.data.code}" 
                                    class="w-full p-2 border rounded bg-gray-50 pr-24" 
                                    id="newInviteCode"
                                    readonly
                                />
                                <button 
                                    id="copyCodeBtn"
                                    class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded hover:bg-indigo-600 text-sm"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm text-gray-500">Please save this code. For security reasons, it will not be shown again.</p>
                </div>
            `;
            document.body.appendChild(modal);

            const copyBtn = modal.querySelector('#copyCodeBtn');
            const codeField = modal.querySelector('#newInviteCode');

            copyBtn.addEventListener('click', () => {
                codeField.select();
                document.execCommand('copy');
                
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.remove('bg-indigo-500', 'hover:bg-indigo-600');
                copyBtn.classList.add('bg-green-500', 'hover:bg-green-600');
                
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                    copyBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                    copyBtn.classList.add('bg-indigo-500', 'hover:bg-indigo-600');
                }, 1500);

                ui.showError('Code copied to clipboard!', 'success');
            });

            codeField.focus();
            codeField.select();
        }
    } catch (error) {
        console.error('Error generating new code:', error);
        ui.showError('Failed to generate new invite code');
    } finally {
        ui.hideLoading();
    }
}

async function loadUserManagement() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;

    try {
        ui.showLoading();
        
        const response = await api.get('/api/admin/users');
        
        console.log('User Management Response:', response);
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to load users');
        }

        const allUsers = response.data || [];
        
        const activeUsers = allUsers.filter(user => user.status === 'active' && user.role !== 'super');
        const pendingUsers = allUsers.filter(user => user.status === 'pending');
        const inactiveUsers = allUsers.filter(user => ['inactive', 'suspended'].includes(user.status));
        
        adminContent.innerHTML = `
            <div class="w-full">
                <h2 class="text-2xl font-bold mb-6">User Management</h2>
                
                <div class="border-b border-gray-200 mb-4">
                    <nav class="-mb-px flex space-x-8">
                        <button id="activeUsersTab" class="tab-btn py-2 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600">
                            Active Users (${activeUsers.length})
                        </button>
                        <button id="pendingUsersTab" class="tab-btn py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
                            Pending Approval
                            <span id="pendingCount" class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pendingUsers.length > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">${pendingUsers.length}</span>
                        </button>
                        <button id="inactiveUsersTab" class="tab-btn py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
                            Inactive/Suspended (${inactiveUsers.length})
                        </button>
                    </nav>
                </div>
                
                <div id="tabContent" class="mt-4">
                </div>
            </div>
        `;

        setupUserManagementTabs(activeUsers, pendingUsers, inactiveUsers);
        
        showActiveUsersTab(activeUsers);

    } catch (error) {
        console.error('Error loading users:', error);
        adminContent.innerHTML = `
            <div class="text-red-500 p-4">
                Error loading users: ${error.message || 'Unknown error'}
            </div>
        `;
        ui.showError('Failed to load users');
    } finally {
        ui.hideLoading();
    }
}
function setupUserManagementTabs(activeUsers, pendingUsers, inactiveUsers) {
    const activeTab = document.getElementById('activeUsersTab');
    const pendingTab = document.getElementById('pendingUsersTab');
    const inactiveTab = document.getElementById('inactiveUsersTab');

    function setActiveTab(activeButton) {
        [activeTab, pendingTab, inactiveTab].forEach(tab => {
            tab.classList.remove('border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });
        
        activeButton.classList.remove('border-transparent', 'text-gray-500');
        activeButton.classList.add('border-blue-500', 'text-blue-600');
    }

    activeTab.addEventListener('click', () => {
        setActiveTab(activeTab);
        showActiveUsersTab(activeUsers);
    });

    pendingTab.addEventListener('click', () => {
        setActiveTab(pendingTab);
        showPendingUsersTab(pendingUsers);
    });

    inactiveTab.addEventListener('click', () => {
        setActiveTab(inactiveTab);
        showInactiveUsersTab(inactiveUsers);
    });
}

function showActiveUsersTab(users) {
    const tabContent = document.getElementById('tabContent');
    
    const usersList = users.map(user => `
        <tr>
            <td class="border px-4 py-2">${user.email}</td>
            <td class="border px-4 py-2">${user.firstName} ${user.lastName}</td>
            <td class="border px-4 py-2">
                <span class="px-2 py-1 text-xs font-semibold rounded-full 
                    ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                    ${user.role}
                </span>
            </td>
            <td class="border px-4 py-2">
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                </span>
            </td>
            <td class="border px-4 py-2">
                <button onclick="window.resetUserPassword('${user._id}')" 
                    class="bg-yellow-500 text-white px-2 py-1 rounded mr-2 hover:bg-yellow-600 text-sm">
                    Reset Password
                </button>
                <button onclick="window.deleteUser('${user._id}')" 
                    class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');

    tabContent.innerHTML = `
        <div class="overflow-x-auto bg-white rounded-lg shadow">
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="border px-4 py-2 text-left">Email</th>
                        <th class="border px-4 py-2 text-left">Name</th>
                        <th class="border px-4 py-2 text-left">Role</th>
                        <th class="border px-4 py-2 text-left">Status</th>
                        <th class="border px-4 py-2 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersList || '<tr><td colspan="5" class="text-center py-4 text-gray-500">No active users found</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function showPendingUsersTab(users) {
    const tabContent = document.getElementById('tabContent');
    
    const usersList = users.map(user => `
        <tr>
            <td class="border px-4 py-2">${user.email}</td>
            <td class="border px-4 py-2">${user.firstName} ${user.lastName}</td>
            <td class="border px-4 py-2">
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                </span>
            </td>
            <td class="border px-4 py-2">
                ${new Date(user.createdAt).toLocaleDateString()}
            </td>
            <td class="border px-4 py-2">
                <button onclick="window.approveUser('${user._id}')" 
                    class="bg-green-500 text-white px-3 py-1 rounded mr-2 hover:bg-green-600 text-sm">
                    Approve
                </button>
                <button onclick="window.rejectUser('${user._id}')" 
                    class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
                    Reject
                </button>
            </td>
        </tr>
    `).join('');

    tabContent.innerHTML = `
        <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-yellow-800">
                <strong>Note:</strong> Users listed here have registered but require admin approval before they can access the system.
            </p>
        </div>
        <div class="overflow-x-auto bg-white rounded-lg shadow">
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="border px-4 py-2 text-left">Email</th>
                        <th class="border px-4 py-2 text-left">Name</th>
                        <th class="border px-4 py-2 text-left">Status</th>
                        <th class="border px-4 py-2 text-left">Registration Date</th>
                        <th class="border px-4 py-2 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersList || '<tr><td colspan="5" class="text-center py-4 text-gray-500">No pending users found</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function showInactiveUsersTab(users) {
    const tabContent = document.getElementById('tabContent');
    
    const usersList = users.map(user => `
        <tr>
            <td class="border px-4 py-2">${user.email}</td>
            <td class="border px-4 py-2">${user.firstName} ${user.lastName}</td>
            <td class="border px-4 py-2">
                <span class="px-2 py-1 text-xs font-semibold rounded-full 
                    ${user.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
                    ${user.status}
                </span>
            </td>
            <td class="border px-4 py-2">
                ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
            </td>
            <td class="border px-4 py-2">
                <button onclick="window.activateUser('${user._id}')" 
                    class="bg-green-500 text-white px-2 py-1 rounded mr-2 hover:bg-green-600 text-sm">
                    Activate
                </button>
                <button onclick="window.deleteUser('${user._id}')" 
                    class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');

    tabContent.innerHTML = `
        <div class="overflow-x-auto bg-white rounded-lg shadow">
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="border px-4 py-2 text-left">Email</th>
                        <th class="border px-4 py-2 text-left">Name</th>
                        <th class="border px-4 py-2 text-left">Status</th>
                        <th class="border px-4 py-2 text-left">Last Login</th>
                        <th class="border px-4 py-2 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersList || '<tr><td colspan="5" class="text-center py-4 text-gray-500">No inactive/suspended users found</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

window.approveUser = async (userId) => {
    if (!confirm('Are you sure you want to approve this user?')) return;

    try {
        ui.showLoading();
        const response = await api.post(`/api/admin/users/${userId}/approve`);
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to approve user');
        }

        ui.showError('User approved successfully', 'success');
        await loadUserManagement();
    } catch (error) {
        console.error('Error approving user:', error);
        ui.showError(error.message || 'Failed to approve user');
    } finally {
        ui.hideLoading();
    }
};

window.rejectUser = async (userId) => {
    if (!confirm('Are you sure you want to reject this user? This will permanently delete their account.')) return;

    try {
        ui.showLoading();
        const response = await api.post(`/api/admin/users/${userId}/reject`);
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to reject user');
        }

        ui.showError('User rejected and removed successfully', 'success');
        await loadUserManagement();
    } catch (error) {
        console.error('Error rejecting user:', error);
        ui.showError(error.message || 'Failed to reject user');
    } finally {
        ui.hideLoading();
    }
};

window.activateUser = async (userId) => {
    if (!confirm('Are you sure you want to activate this user?')) return;

    try {
        ui.showLoading();
        const response = await api.patch(`/api/admin/users/${userId}/status`, { status: 'active' });
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to activate user');
        }

        ui.showError('User activated successfully', 'success');
        await loadUserManagement();
    } catch (error) {
        console.error('Error activating user:', error);
        ui.showError(error.message || 'Failed to activate user');
    } finally {
        ui.hideLoading();
    }
};

async function loadContentManagement() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;

    try {
        ui.showLoading();
        const response = await api.get('/api/admin/articles');
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to load articles');
        }

        await articleManagement.show(response.data);
    } catch (error) {
        console.error('Error loading content management:', error);
        adminContent.innerHTML = '<p class="text-red-500">Error loading content: ' + (error.message || 'Unknown error') + '</p>';
        ui.showError('Failed to load content management');
    } finally {
        ui.hideLoading();
    }
}

async function loadStatistics() {
    console.log('=== loadStatistics called ===');
    console.log('adminContent element:', document.getElementById('adminContent'));
    
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;

    try {
        ui.showLoading();
        
        if (!document.getElementById('chartjs-script')) {
            const script = document.createElement('script');
            script.id = 'chartjs-script';
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve) => {
                script.onload = resolve;
            });
        }

        await statsManagement.show(adminContent);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        if (adminContent) {
            adminContent.innerHTML = `
                <div class="text-red-500">
                    Error loading statistics: ${error.message || 'Unknown error'}
                </div>
            `;
        }
        ui.showError('Failed to load statistics');
    } finally {
        ui.hideLoading();
    }
}

async function loadSectionManagement() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;

    try {
        ui.showLoading();
        await sectionManagement.show(adminContent);
    } catch (error) {
        console.error('Error loading section management:', error);
        adminContent.innerHTML = `
            <div class="text-red-500 p-4">
                Error loading section management: ${error.message || 'Unknown error'}
            </div>
        `;
        ui.showError('Failed to load section management');
    } finally {
        ui.hideLoading();
    }
}

window.resetUserPassword = async (userId) => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) return;

    try {
        ui.showLoading();
        const response = await api.post(`/api/admin/users/${userId}/reset-password`);
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to reset password');
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Temporary Password</h3>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">✕</button>
                </div>
                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">New temporary password:</p>
                    <div class="flex items-center space-x-2">
                        <div class="relative flex-1">
                            <input 
                                type="text" 
                                value="${response.data.temporaryPassword}" 
                                class="w-full p-2 border rounded bg-gray-50 pr-24" 
                                id="tempPasswordField"
                                readonly
                            />
                            <button 
                                id="copyPasswordBtn"
                                class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 text-sm"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
                <p class="text-sm text-gray-500">Please share this password securely with the user.</p>
            </div>
        `;

        document.body.appendChild(modal);

        const copyBtn = modal.querySelector('#copyPasswordBtn');
        const tempPasswordField = modal.querySelector('#tempPasswordField');

        copyBtn.addEventListener('click', () => {
            tempPasswordField.select();
            document.execCommand('copy');
            
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            copyBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                copyBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
            }, 1500);

            ui.showError('Password copied to clipboard!', 'success');
        });

        tempPasswordField.focus();
        tempPasswordField.select();

    } catch (error) {
        console.error('Error resetting password:', error);
        ui.showError(error.message || 'Failed to reset password');
    } finally {
        ui.hideLoading();
    }
};

window.deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        ui.showLoading();
        const response = await api.delete(`/api/admin/users/${userId}`);
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to delete user');
        }

        await loadUserManagement();
        ui.showError('User deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting user:', error);
        ui.showError(error.message || 'Failed to delete user');
    } finally {
        ui.hideLoading();
    }
};
