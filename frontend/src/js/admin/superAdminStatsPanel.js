// frontend/src/js/admin/superAdminStatsPanel.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';
import { chartHelpers, chartConfig } from '../utils/charts.js';



// This will track and destroy existing charts

let existingCharts = {};
// Add this function to destroy all existing charts
function destroyAllCharts() {
    Object.keys(existingCharts).forEach(chartId => {
        if (existingCharts[chartId]) {
            try {
                existingCharts[chartId].destroy();
                delete existingCharts[chartId];
            } catch (error) {
                console.log('Chart already destroyed:', chartId);
            }
        }
    });
    existingCharts = {};
}

export const superAdminStatsPanel = {
    async initialize(container) {
        if (!container) return;
        
        try {
            ui.showLoading();
            
            // Verify user is super admin
            const user = auth.user.get();
            if (!user?.user?.role || user.user.role !== 'super') {
                throw new Error('Not authorized to access super admin statistics');
            }
            
            // Render the initial dashboard structure
            this.renderDashboardStructure(container);
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Set up event listeners
            this.attachEventListeners();
            
            // Start auto-refresh for real-time data
            this.startAutoRefresh();
        } catch (error) {
            console.error('Error initializing super admin stats panel:', error);
            container.innerHTML = `
                <div class="p-4 bg-red-100 text-red-800 rounded-md">
                    <p class="font-semibold">Error loading statistics dashboard</p>
                    <p>${error.message || 'Unknown error occurred'}</p>
                </div>
            `;
            ui.showError('Failed to load statistics dashboard');
        } finally {
            ui.hideLoading();
        }
    },
    
    renderDashboardStructure(container) {
        container.innerHTML = `
            <div class="p-4 space-y-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-gray-800">Super Admin Statistics Dashboard</h1>
                    <div class="flex space-x-2">
                        <select id="statsTimeRange" class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            <option value="day">Last 24 Hours</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month" selected>Last 30 Days</option>
                            <option value="year">Last Year</option>
                        </select>
                        <button id="refreshStats" class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Overview Stats Cards -->
                <div id="overviewStats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200 animate-pulse">
                        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div class="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200 animate-pulse">
                        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div class="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200 animate-pulse">
                        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div class="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200 animate-pulse">
                        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div class="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200 animate-pulse">
                        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div class="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                </div>
                
                <!-- Dashboard Tabs -->
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8">
                        <button id="tab-content" class="tab-button border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            Content Statistics
                        </button>
                        <button id="tab-users" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            User Statistics
                        </button>
                        <button id="tab-views" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            Article Views
                        </button>
                        <button id="tab-engagement" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            User Engagement
                        </button>
                        <button id="tab-admin" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                            Admin Activity
                        </button>
                    </nav>
                </div>
                
                <!-- Tab Content -->
                <div id="tabContent" class="min-h-[500px]">
                    <div class="flex items-center justify-center h-64">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                </div>
            </div>
        `;
    },
    
    async loadDashboardData() {
        try {
            const timeRange = document.getElementById('statsTimeRange').value;
            const response = await api.get(`/api/admin/super/stats/dashboard?timeRange=${timeRange}`);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to load dashboard data');
            }
            
            // Store the data for use in different tabs
            this.dashboardData = response.data;
            
            // Render overview stats
            this.renderOverviewStats(this.dashboardData.overview);
            
            // Render the active tab
            const activeTab = document.querySelector('.tab-button.border-blue-500').id.replace('tab-', '');
            this.renderTabContent(activeTab);
            
            return true;
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            ui.showError('Failed to load statistics data');
            return false;
        }
    },
    
    renderOverviewStats(overviewData) {
        const container = document.getElementById('overviewStats');
        if (!container) return;
        
        container.innerHTML = `
            <!-- Users Card -->
            <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h3 class="text-sm font-medium text-gray-500">Total Users</h3>
                <p class="mt-1 text-2xl font-semibold text-blue-600">${overviewData.users.total}</p>
                <div class="mt-2 flex justify-between text-xs">
                    <span class="text-green-600">${overviewData.users.active} Active</span>
                    <span class="text-red-600">${overviewData.users.inactive} Inactive</span>
                </div>
            </div>
            
            <!-- Articles Card -->
            <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h3 class="text-sm font-medium text-gray-500">Total Articles</h3>
                <p class="mt-1 text-2xl font-semibold text-green-600">${overviewData.articles.total}</p>
                <div class="mt-2 flex justify-between text-xs">
                    <span class="text-green-600">${overviewData.articles.visible} Visible</span>
                    <span class="text-yellow-600">${overviewData.articles.hidden} Hidden</span>
                </div>
            </div>
            
            <!-- Views Card -->
            <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h3 class="text-sm font-medium text-gray-500">Total Views</h3>
                <p class="mt-1 text-2xl font-semibold text-purple-600">${overviewData.totalViews}</p>
                <div class="mt-2 text-xs text-gray-500">
                    Across all articles
                </div>
            </div>
            
            <!-- Admins Card -->
            <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h3 class="text-sm font-medium text-gray-500">Active Admins</h3>
                <p class="mt-1 text-2xl font-semibold text-indigo-600">${overviewData.activeAdmins}</p>
                <div class="mt-2 text-xs text-gray-500">
                    Managing the system
                </div>
            </div>
            
            <!-- System Status Card -->
            <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h3 class="text-sm font-medium text-gray-500">System Status</h3>
                <p class="mt-1 text-2xl font-semibold text-green-600">Active</p>
                <div class="mt-2 text-xs text-gray-500">
                    All systems operational
                </div>
            </div>
        `;
    },
    
    renderTabContent(tabName) {
        const container = document.getElementById('tabContent');
        if (!container || !this.dashboardData) return;
        
        // Update active tab styling
        document.querySelectorAll('.tab-button').forEach(tab => {
            if (tab.id === `tab-${tabName}`) {
                tab.classList.add('border-blue-500', 'text-blue-600');
                tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            } else {
                tab.classList.remove('border-blue-500', 'text-blue-600');
                tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            }
        });
        
        // Render the appropriate tab content
        switch (tabName) {
            case 'content':
                this.renderContentTab(container);
                break;
            case 'users':
                this.renderUsersTab(container);
                break;
            case 'views':
                this.renderViewsTab(container);
                break;
            case 'engagement':
                this.renderEngagementTab(container);
                break;
            case 'admin':
                this.renderAdminTab(container);
                break;
            default:
                this.renderContentTab(container);
        }
    },
    
    renderContentTab(container) {
        const contentData = this.dashboardData.content;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Content Overview -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Total Articles</h3>
                        <p class="mt-1 text-2xl font-semibold text-blue-600">${this.dashboardData.overview.articles.total}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Visible Articles</h3>
                        <p class="mt-1 text-2xl font-semibold text-green-600">${this.dashboardData.overview.articles.visible}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Hidden Articles</h3>
                        <p class="mt-1 text-2xl font-semibold text-yellow-600">${this.dashboardData.overview.articles.hidden}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Temporary vs Permanent</h3>
                        <div class="flex items-center justify-center h-16">
                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${Math.round((contentData.temporaryVsPermanent.temporary / (contentData.temporaryVsPermanent.temporary + contentData.temporaryVsPermanent.permanent)) * 100)}%"></div>
                            </div>
                        </div>
                        <div class="mt-2 flex justify-between text-xs">
                            <span class="text-blue-600">${contentData.temporaryVsPermanent.temporary} Temporary</span>
                            <span class="text-gray-600">${contentData.temporaryVsPermanent.permanent} Permanent</span>
                        </div>
                    </div>
                </div>
                
                <!-- Content Creation Trend -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Content Creation Trend</h3>
                    <div class="h-64">
                        <canvas id="contentCreationChart"></canvas>
                    </div>
                </div>
                
                
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-700 mb-4">Popular Tags</h3>
                        <div class="flex flex-wrap gap-2">
                            ${contentData.tagDistribution.map(tag => `
                                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full" style="font-size: ${Math.max(0.7, Math.min(1.5, tag.count / 5))}rem">
                                    ${tag.tag} (${tag.count})
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Most Viewed Articles -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Most Viewed Articles</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article ID</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Viewers</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${contentData.mostViewedArticles.map(article => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${article.articleId}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${article.title}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${article.author}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${article.views}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${article.uniqueViewers}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Content by Admin -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Content Creation by Admin</h3>
                    <div class="h-64">
                        <canvas id="contentByAdminChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize charts after DOM is ready
        setTimeout(() => {
            this.initializeContentCharts();
        }, 0);
    },
    
    renderUsersTab(container) {
        const userData = this.dashboardData.users;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- User Overview -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-700 mb-4">Role Distribution</h3>
                        <div class="h-64">
                            <canvas id="roleDistributionChart"></canvas>
                        </div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-700 mb-4">Status Distribution</h3>
                        <div class="h-64">
                            <canvas id="statusDistributionChart"></canvas>
                        </div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-700 mb-4">User Management</h3>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Locked Accounts</span>
                                <span class="text-sm font-semibold text-red-600">${userData.lockedAccounts.length}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Password Reset Required</span>
                                <span class="text-sm font-semibold text-yellow-600">${userData.passwordResetRequired.length}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">New Users (30 days)</span>
                                <span class="text-sm font-semibold text-green-600">${userData.registrationTrend.reduce((sum, item) => sum + item.count, 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Registration Trend -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">User Registration Trend</h3>
                    <div class="h-64">
                        <canvas id="registrationTrendChart"></canvas>
                    </div>
                </div>
                
                <!-- Most Active Users -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Most Active Users</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity Score</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Articles</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${userData.mostActiveUsers.map(user => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.firstName} ${user.lastName}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.activityScore.toFixed(1)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.articleCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.commentCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatDate(user.lastLogin)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Locked Accounts -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Locked Accounts</h3>
                    ${userData.lockedAccounts.length > 0 ? `
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Attempts</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locked Until</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${userData.lockedAccounts.map(user => `
                                        <tr>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.firstName} ${user.lastName}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.loginAttempts}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatDate(user.lockUntil)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <p class="text-gray-500 text-center py-4">No locked accounts found</p>
                    `}
                </div>
            </div>
        `;
        
        // Initialize charts after DOM is ready
        setTimeout(() => {
            this.initializeUserCharts();
        }, 0);
    },
    
    renderViewsTab(container) {
        const viewData = this.dashboardData.views;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- View Overview -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Total Views</h3>
                        <p class="mt-1 text-2xl font-semibold text-purple-600">${viewData.totalViews}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Unique Viewers</h3>
                        <p class="mt-1 text-2xl font-semibold text-blue-600">${viewData.uniqueViewers}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Views Per Article</h3>
                        <p class="mt-1 text-2xl font-semibold text-green-600">${(viewData.totalViews / this.dashboardData.overview.articles.total).toFixed(1)}</p>
                    </div>
                </div>
                
                <!-- View Trend -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">View Trend</h3>
                    <div class="h-64">
                        <canvas id="viewTrendChart"></canvas>
                    </div>
                </div>
                
                <!-- View Patterns -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-700 mb-4">Views by Time of Day</h3>
                        <div class="h-64">
                            <canvas id="viewsByTimeChart"></canvas>
                        </div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-700 mb-4">Views by Day of Week</h3>
                        <div class="h-64">
                            <canvas id="viewsByDayChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Top Viewers -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Top Viewers</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View Count</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Articles</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${viewData.topViewers.map(viewer => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${viewer.user}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${viewer.email}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${viewer.viewCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${viewer.uniqueArticles}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Who Viewed What -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-700">Who Viewed What</h3>
                        <input type="text" id="viewSearchInput" placeholder="Search..." class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div class="overflow-x-auto">
                        <table id="whoViewedWhatTable" class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article ID</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article Title</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${viewData.whoViewedWhat.map(view => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${view.user}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${view.email}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${view.articleId}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${view.title}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatDate(view.timestamp)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Most Viewed Sections -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Most Viewed Sections</h3>
                    <div class="h-64">
                        <canvas id="viewsBySectionChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize charts after DOM is ready
        setTimeout(() => {
            this.initializeViewCharts();
            
            // Set up search functionality for the who viewed what table
            const searchInput = document.getElementById('viewSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const table = document.getElementById('whoViewedWhatTable');
                    const rows = table.querySelectorAll('tbody tr');
                    
                    rows.forEach(row => {
                        const text = row.textContent.toLowerCase();
                        row.style.display = text.includes(searchTerm) ? '' : 'none';
                    });
                });
            }
        }, 0);
    },
    
    renderEngagementTab(container) {
        const engagementData = this.dashboardData.engagement;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Engagement Overview -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Total Comments</h3>
                        <p class="mt-1 text-2xl font-semibold text-blue-600">${engagementData.engagementMetrics.totalComments}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Comments Per Article</h3>
                        <p class="mt-1 text-2xl font-semibold text-green-600">${engagementData.engagementMetrics.commentsPerArticle}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">View-to-Comment Rate</h3>
                        <p class="mt-1 text-2xl font-semibold text-purple-600">${engagementData.engagementMetrics.viewToCommentRate}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Total Bookmarks</h3>
                        <p class="mt-1 text-2xl font-semibold text-yellow-600">${engagementData.engagementMetrics.totalBookmarks}</p>
                    </div>
                </div>
                
                <!-- Comment Activity -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Comment Activity</h3>
                    <div class="h-64">
                        <canvas id="commentActivityChart"></canvas>
                    </div>
                </div>
                
                <!-- Most Engaged Users -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Most Engaged Users</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement Score</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reads</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookmarks</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${engagementData.mostEngagedUsers.map(user => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.firstName} ${user.lastName}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.engagementScore.toFixed(1)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.viewCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.readCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.commentCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.bookmarkCount}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Bookmark Stats -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Bookmark Statistics</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookmark Count</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${engagementData.bookmarkStats.map(user => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.firstName} ${user.lastName}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.bookmarkCount}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Reading Patterns -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Reading Patterns</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Articles Read</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Read</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${engagementData.readingPatterns.map(user => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.user}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.readCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatDate(user.lastRead)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize charts after DOM is ready
        setTimeout(() => {
            this.initializeEngagementCharts();
        }, 0);
    },
    
    renderAdminTab(container) {
        const adminData = this.dashboardData.admin;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Admin Overview -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Total Admins</h3>
                        <p class="mt-1 text-2xl font-semibold text-blue-600">${adminData.totalAdmins}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Total Admin Actions</h3>
                        <p class="mt-1 text-2xl font-semibold text-purple-600">${adminData.totalActions}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-sm font-medium text-gray-500">Actions Per Admin</h3>
                        <p class="mt-1 text-2xl font-semibold text-green-600">${(adminData.totalActions / adminData.totalAdmins).toFixed(1)}</p>
                    </div>
                </div>
                
                <!-- Admin Activity Trend -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Admin Activity Trend</h3>
                    <div class="h-64">
                        <canvas id="adminActivityTrendChart"></canvas>
                    </div>
                </div>
                
                <!-- Admin Action Distribution -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-700 mb-4">Admin Action Distribution</h3>
                        <div class="h-64">
                            <canvas id="adminActionDistributionChart"></canvas>
                        </div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-700 mb-4">Content Creation by Admin</h3>
                        <div class="h-64">
                            <canvas id="adminContentCreationChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Most Active Admins -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Most Active Admins</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Count</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Action</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${adminData.mostActiveAdmins.map(admin => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${admin.admin}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${admin.email}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${admin.role === 'super' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                                                ${admin.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${admin.actionCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatDate(admin.lastAction)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Critical Actions -->
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <h3 class="text-lg font-medium text-gray-700 mb-4">Critical Admin Actions</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${adminData.criticalActions.map(action => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                ${action.action}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${action.admin}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${action.email || 'N/A'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatActionDetails(action.details)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatDate(action.timestamp)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize charts after DOM is ready
        setTimeout(() => {
            this.initializeAdminCharts();
        }, 0);
    },
    
    initializeContentCharts() {
        const contentData = this.dashboardData.content;
        
        // Content Creation Trend Chart
        const creationCtx = document.getElementById('contentCreationChart')?.getContext('2d');
        if (creationCtx && contentData.contentCreationTrend) {
            new Chart(creationCtx, {
                type: 'line',
                data: {
                    labels: contentData.contentCreationTrend.map(item => item.date),
                    datasets: [{
                        label: 'Articles Created',
                        data: contentData.contentCreationTrend.map(item => item.count),
                        borderColor: chartConfig.colors.primary,
                        backgroundColor: chartConfig.colors.background.primary,
                        tension: chartConfig.lineChart.tension,
                        fill: true
                    }]
                },
                options: chartHelpers.getLineChartOptions('Content Creation Trend')
            });
        }
        
        // Section Distribution Chart
        const sectionCtx = document.getElementById('sectionDistributionChart')?.getContext('2d');
        if (sectionCtx && contentData.sectionDistribution) {
            new Chart(sectionCtx, {
                type: 'pie',
                data: {
                    labels: contentData.sectionDistribution.map(item => item.section),
                    datasets: [{
                        data: contentData.sectionDistribution.map(item => item.count),
                        backgroundColor: [
                            chartConfig.colors.primary,
                            chartConfig.colors.secondary,
                            chartConfig.colors.warning,
                            chartConfig.colors.danger,
                            chartConfig.colors.purple,
                            '#e11d48',
                            '#0891b2',
                            '#4f46e5',
                            '#7c3aed',
                            '#c026d3'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        // Content by Admin Chart
        const adminContentCtx = document.getElementById('contentByAdminChart')?.getContext('2d');
        if (adminContentCtx && contentData.contentByAdmin) {
            new Chart(adminContentCtx, {
                type: 'bar',
                data: {
                    labels: contentData.contentByAdmin.map(item => item.author),
                    datasets: [{
                        label: 'Articles Created',
                        data: contentData.contentByAdmin.map(item => item.count),
                        backgroundColor: chartConfig.colors.primary
                    }]
                },
                options: chartHelpers.getBarChartOptions('Content Creation by Admin')
            });
        }
    },
    
    initializeUserCharts() {
        const userData = this.dashboardData.users;
        
        // Role Distribution Chart
        const roleCtx = document.getElementById('roleDistributionChart')?.getContext('2d');
        if (roleCtx && userData.roleDistribution) {
            new Chart(roleCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Regular Users', 'Admins', 'Super Admins'],
                    datasets: [{
                        data: [
                            userData.roleDistribution.user,
                            userData.roleDistribution.admin,
                            userData.roleDistribution.super
                        ],
                        backgroundColor: [
                            chartConfig.colors.primary,
                            chartConfig.colors.secondary,
                            chartConfig.colors.purple
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // Status Distribution Chart
        const statusCtx = document.getElementById('statusDistributionChart')?.getContext('2d');
        if (statusCtx && userData.statusDistribution) {
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Inactive', 'Suspended'],
                    datasets: [{
                        data: [
                            userData.statusDistribution.active,
                            userData.statusDistribution.inactive,
                            userData.statusDistribution.suspended
                        ],
                        backgroundColor: [
                            chartConfig.colors.secondary,
                            chartConfig.colors.warning,
                            chartConfig.colors.danger
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // Registration Trend Chart
        const registrationCtx = document.getElementById('registrationTrendChart')?.getContext('2d');
        if (registrationCtx && userData.registrationTrend) {
            new Chart(registrationCtx, {
                type: 'line',
                data: {
                    labels: userData.registrationTrend.map(item => item.date),
                    datasets: [{
                        label: 'New Users',
                        data: userData.registrationTrend.map(item => item.count),
                        borderColor: chartConfig.colors.primary,
                        backgroundColor: chartConfig.colors.background.primary,
                        tension: chartConfig.lineChart.tension,
                        fill: true
                    }]
                },
                options: chartHelpers.getLineChartOptions('User Registration Trend')
            });
        }
    },
    
    initializeViewCharts() {
        const viewData = this.dashboardData.views;
        
        // View Trend Chart
        const viewTrendCtx = document.getElementById('viewTrendChart')?.getContext('2d');
        if (viewTrendCtx && viewData.viewTrend) {
            new Chart(viewTrendCtx, {
                type: 'line',
                data: {
                    labels: viewData.viewTrend.map(item => item.date),
                    datasets: [{
                        label: 'Article Views',
                        data: viewData.viewTrend.map(item => item.count),
                        borderColor: chartConfig.colors.purple,
                        backgroundColor: chartConfig.colors.background.purple,
                        tension: chartConfig.lineChart.tension,
                        fill: true
                    }]
                },
                options: chartHelpers.getLineChartOptions('View Trend')
            });
        }
        
        // Views by Time of Day Chart
        const timeCtx = document.getElementById('viewsByTimeChart')?.getContext('2d');
        if (timeCtx && viewData.viewsByTimeOfDay) {
            new Chart(timeCtx, {
                type: 'bar',
                data: {
                    labels: viewData.viewsByTimeOfDay.map(item => `${item.hour}:00`),
                    datasets: [{
                        label: 'Views',
                        data: viewData.viewsByTimeOfDay.map(item => item.count),
                        backgroundColor: chartConfig.colors.primary
                    }]
                },
                options: chartHelpers.getBarChartOptions('Views by Time of Day')
            });
        }
        
        // Views by Day of Week Chart
        const dayCtx = document.getElementById('viewsByDayChart')?.getContext('2d');
        if (dayCtx && viewData.viewsByDayOfWeek) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            new Chart(dayCtx, {
                type: 'bar',
                data: {
                    labels: viewData.viewsByDayOfWeek.map(item => dayNames[item.day - 1]),
                    datasets: [{
                        label: 'Views',
                        data: viewData.viewsByDayOfWeek.map(item => item.count),
                        backgroundColor: chartConfig.colors.secondary
                    }]
                },
                options: chartHelpers.getBarChartOptions('Views by Day of Week')
            });
        }
        
        // Views by Section Chart
        const sectionCtx = document.getElementById('viewsBySectionChart')?.getContext('2d');
        if (sectionCtx && viewData.mostViewedSections) {
            new Chart(sectionCtx, {
                type: 'bar',
                data: {
                    labels: viewData.mostViewedSections.map(item => item.section),
                    datasets: [{
                        label: 'Total Views',
                        data: viewData.mostViewedSections.map(item => item.totalViews),
                        backgroundColor: chartConfig.colors.primary
                    }, {
                        label: 'Average Views',
                        data: viewData.mostViewedSections.map(item => item.averageViews),
                        backgroundColor: chartConfig.colors.secondary
                    }]
                },
                options: chartHelpers.getBarChartOptions('Most Viewed Sections')
            });
        }
    },
    
    initializeEngagementCharts() {
        const engagementData = this.dashboardData.engagement;
        
        // Comment Activity Chart
        const commentCtx = document.getElementById('commentActivityChart')?.getContext('2d');
        if (commentCtx && engagementData.commentActivity) {
            new Chart(commentCtx, {
                type: 'line',
                data: {
                    labels: engagementData.commentActivity.map(item => item.date),
                    datasets: [{
                        label: 'Comments',
                        data: engagementData.commentActivity.map(item => item.count),
                        borderColor: chartConfig.colors.secondary,
                        backgroundColor: chartConfig.colors.background.secondary,
                        tension: chartConfig.lineChart.tension,
                        fill: true
                    }]
                },
                options: chartHelpers.getLineChartOptions('Comment Activity')
            });
        }
    },
    
    initializeAdminCharts() {
        const adminData = this.dashboardData.admin;
        
        // Admin Activity Trend Chart
        const activityCtx = document.getElementById('adminActivityTrendChart')?.getContext('2d');
        if (activityCtx && adminData.adminActivityTrend) {
            new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: adminData.adminActivityTrend.map(item => item.date),
                    datasets: [{
                        label: 'Admin Actions',
                        data: adminData.adminActivityTrend.map(item => item.count),
                        borderColor: chartConfig.colors.purple,
                        backgroundColor: chartConfig.colors.background.purple,
                        tension: chartConfig.lineChart.tension,
                        fill: true
                    }]
                },
                options: chartHelpers.getLineChartOptions('Admin Activity Trend')
            });
        }
        
        // Admin Action Distribution Chart
        const actionCtx = document.getElementById('adminActionDistributionChart')?.getContext('2d');
        if (actionCtx && adminData.adminActionDistribution) {
            // Get top 8 actions for better visualization
            const topActions = adminData.adminActionDistribution
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);
                
            new Chart(actionCtx, {
                type: 'pie',
                data: {
                    labels: topActions.map(item => this.formatActionName(item._id)),
                    datasets: [{
                        data: topActions.map(item => item.count),
                        backgroundColor: [
                            chartConfig.colors.primary,
                            chartConfig.colors.secondary,
                            chartConfig.colors.warning,
                            chartConfig.colors.danger,
                            chartConfig.colors.purple,
                            '#e11d48',
                            '#0891b2',
                            '#4f46e5'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        // Admin Content Creation Chart
        const contentCtx = document.getElementById('adminContentCreationChart')?.getContext('2d');
        if (contentCtx && adminData.contentByAdmin) {
            new Chart(contentCtx, {
                type: 'bar',
                data: {
                    labels: adminData.contentByAdmin.map(item => item.admin),
                    datasets: [{
                        label: 'Articles Created',
                        data: adminData.contentByAdmin.map(item => item.articleCount),
                        backgroundColor: chartConfig.colors.secondary
                    }]
                },
                options: chartHelpers.getBarChartOptions('Content Creation by Admin')
            });
        }
    },
    
    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.id.replace('tab-', '');
                this.renderTabContent(tabName);
            });
        });
        
        // Refresh button
        document.getElementById('refreshStats')?.addEventListener('click', async () => {
            ui.showLoading();
            await this.loadDashboardData();
            ui.hideLoading();
            ui.showError('Statistics refreshed successfully', 'success');
        });
        
        // Time range selector
        document.getElementById('statsTimeRange')?.addEventListener('change', async () => {
            ui.showLoading();
            await this.loadDashboardData();
            ui.hideLoading();
        });
    },
    
    startAutoRefresh() {
        // Auto-refresh every 5 minutes
        this.refreshInterval = setInterval(async () => {
            await this.loadDashboardData();
        }, 5 * 60 * 1000);
    },
    
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    },
    
    // Helper methods
    formatDate(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            if (diffInHours < 1) {
                const minutes = Math.floor((now - date) / (1000 * 60));
                return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            }
            return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
        }
        
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatActionName(action) {
        return action.split('_').map(word => 
            word.charAt(0) + word.slice(1).toLowerCase()
        ).join(' ');
    },
    
    formatActionDetails(details) {
        if (!details) return 'No details';
        if (typeof details === 'string') return details;
        
        return Object.entries(details)
            .map(([key, value]) => {
                if (typeof value === 'object') {
                    return `${key}: ${JSON.stringify(value)}`;
                }
                return `${key}: ${value}`;
            })
            .join(', ');
    }
};
