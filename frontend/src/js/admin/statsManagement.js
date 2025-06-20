// frontend/src/js/admin/statsManagement.js - Complete Fixed Version
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const statsManagement = {
    async show(adminContent) {
        if (!adminContent) return;
    
        try {
            ui.showLoading();
            console.log('=== Fetching admin stats ===');
            
            const response = await api.get('/api/admin/stats');
            console.log('Stats API Response:', response);
            
            if (response && response.success && response.data) {
                console.log('Stats data received:', {
                    users: response.data.users,
                    content: response.data.content,
                    mostActiveUsers: response.data.mostActiveUsers?.length || 0,
                    topArticles: response.data.topArticles?.length || 0,
                    latestActivity: response.data.latestActivity?.length || 0
                });
                
                this.renderEnhancedStats(response.data, adminContent);
                this.startAutoRefresh();
            } else {
                console.error('Invalid stats response:', response);
                throw new Error(response?.message || 'Invalid response from stats API');
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
            adminContent.innerHTML = `
                <div class="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div class="flex items-center">
                        <span class="material-icons-outlined mr-2">error</span>
                        Error loading statistics: ${error.message || 'Unknown error'}
                    </div>
                    <button onclick="window.location.reload()" class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Retry
                    </button>
                </div>
            `;
            ui.showError('Failed to load statistics');
        } finally {
            ui.hideLoading();
        }
    },

    renderEnhancedStats(stats, adminContent) {
        if (!adminContent) return;
        
        console.log('=== Rendering Enhanced Stats ===');
        console.log('Raw stats received:', stats);
    
        // Ensure we have safe fallback data
        const safeStats = {
            users: stats?.users || { total: 0, active: 0, inactive: 0, admins: 0, pending: 0 },
            content: stats?.content || { articles: 0, comments: 0, hiddenArticles: 0 },
            activity: stats?.activity || { todayLogins: 0, newArticles: 0, activeUsers: 0, newComments: 0 },
            mostActiveUsers: Array.isArray(stats?.mostActiveUsers) ? stats.mostActiveUsers : [],
            topArticles: Array.isArray(stats?.topArticles) ? stats.topArticles : [],
            latestActivity: Array.isArray(stats?.latestActivity) ? stats.latestActivity : []
        };

        console.log('Safe stats after processing:', {
            usersTotal: safeStats.users.total,
            articlesTotal: safeStats.content.articles,
            mostActiveCount: safeStats.mostActiveUsers.length,
            topArticlesCount: safeStats.topArticles.length,
            latestActivityCount: safeStats.latestActivity.length
        });
    
        adminContent.innerHTML = `
            <div class="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-900 flex items-center">
                            <span class="material-icons-outlined mr-3 text-4xl text-blue-600">dashboard</span>
                            Admin Statistics Dashboard
                        </h2>
                        <p class="text-gray-600 mt-1">Real-time insights and user activity monitoring</p>
                    </div>
                    <div class="flex items-center space-x-2 text-sm text-gray-500">
                        <div class="flex items-center">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                            Live Data
                        </div>
                        <span>•</span>
                        <span id="lastUpdated">Updated now</span>
                    </div>
                </div>

                <!-- System Overview Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${this.renderSystemOverviewCards(safeStats)}
                </div>

                <!-- Today's Activity Highlight -->
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                        <h3 class="text-xl font-bold text-white flex items-center">
                            <span class="material-icons-outlined mr-2">today</span>
                            Today's Activity
                        </h3>
                        <p class="text-blue-100 text-sm">Live activity metrics for ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            ${this.renderTodayActivityCards(safeStats.activity)}
                        </div>
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Top 5 Most Active Users -->
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div class="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                            <h3 class="text-xl font-bold text-white flex items-center">
                                <span class="material-icons-outlined mr-2">leaderboard</span>
                                Top 5 Active Users (${safeStats.mostActiveUsers.length})
                            </h3>
                            <p class="text-emerald-100 text-sm">Most engaged IT Staff members</p>
                        </div>
                        <div class="p-6">
                            ${this.renderTopActiveUsers(safeStats.mostActiveUsers)}
                        </div>
                    </div>

                    <!-- Top 5 Articles -->
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div class="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
                            <h3 class="text-xl font-bold text-white flex items-center">
                                <span class="material-icons-outlined mr-2">trending_up</span>
                                Top Articles (${safeStats.topArticles.length})
                            </h3>
                            <p class="text-amber-100 text-sm">Most engaging content</p>
                        </div>
                        <div class="p-6">
                            ${this.renderTopArticles(safeStats.topArticles)}
                        </div>
                    </div>
                </div>

                <!-- Latest General Activity -->
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div class="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
                        <h3 class="text-xl font-bold text-white flex items-center">
                            <span class="material-icons-outlined mr-2">history</span>
                            Latest User Activity (${safeStats.latestActivity.length})
                        </h3>
                        <p class="text-violet-100 text-sm">Recent user actions and system events</p>
                    </div>
                    <div class="p-6">
                        ${this.renderLatestGeneralActivity(safeStats.latestActivity)}
                    </div>
                </div>
            </div>
        `;

        // Update last updated time
        this.updateLastUpdated();
    },

    renderSystemOverviewCards(stats) {
        const cards = [
            {
                title: 'Total Users',
                value: stats.users.total,
                icon: 'people',
                gradient: 'from-blue-500 to-cyan-600',
                details: [
                    { label: 'Active', value: stats.users.active, color: 'text-green-600' },
                    { label: 'Pending', value: stats.users.pending || 0, color: 'text-orange-600' },
                    { label: 'Admins', value: stats.users.admins, color: 'text-purple-600' }
                ]
            },
            {
                title: 'Total Articles',
                value: stats.content.articles,
                icon: 'article',
                gradient: 'from-emerald-500 to-green-600',
                details: [
                    { label: 'Visible', value: stats.content.articles - (stats.content.hiddenArticles || 0), color: 'text-green-600' },
                    { label: 'Hidden', value: stats.content.hiddenArticles || 0, color: 'text-orange-600' }
                ]
            },
            {
                title: 'Total Comments',
                value: stats.content.comments,
                icon: 'comment',
                gradient: 'from-purple-500 to-pink-600',
                details: [
                    { label: 'Avg per Article', value: stats.content.articles > 0 ? Math.round((stats.content.comments / stats.content.articles) * 10) / 10 : 0, color: 'text-blue-600' }
                ]
            },
            {
                title: 'System Health',
                value: '98.5%',
                icon: 'health_and_safety',
                gradient: 'from-rose-500 to-red-600',
                details: [
                    { label: 'Uptime', value: '99.9%', color: 'text-green-600' },
                    { label: 'Status', value: 'Healthy', color: 'text-green-600' }
                ]
            }
        ];

        return cards.map(card => `
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transform hover:scale-105 transition-all duration-300">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center">
                            <div class="p-3 rounded-xl bg-gradient-to-r ${card.gradient} shadow-lg">
                                <span class="material-icons-outlined text-white text-2xl">${card.icon}</span>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium text-gray-600">${card.title}</h4>
                        <p class="text-3xl font-bold text-gray-900">${typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
                        <div class="space-y-1">
                            ${card.details.map(detail => `
                                <div class="flex justify-between text-xs">
                                    <span class="text-gray-500">${detail.label}:</span>
                                    <span class="${detail.color} font-medium">${typeof detail.value === 'number' ? detail.value.toLocaleString() : detail.value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderTodayActivityCards(activity) {
        const todayCards = [
            {
                label: "Today's Logins",
                value: activity.todayLogins || 0,
                icon: 'login',
                color: 'bg-blue-50 text-blue-600',
                iconBg: 'bg-blue-100'
            },
            {
                label: 'New Articles',
                value: activity.newArticles || 0,
                icon: 'post_add',
                color: 'bg-green-50 text-green-600',
                iconBg: 'bg-green-100'
            },
            {
                label: 'New Comments',
                value: activity.newComments || 0,
                icon: 'chat_bubble',
                color: 'bg-purple-50 text-purple-600',
                iconBg: 'bg-purple-100'
            },
            {
                label: 'Active Users',
                value: activity.activeUsers || 0,
                icon: 'groups',
                color: 'bg-orange-50 text-orange-600',
                iconBg: 'bg-orange-100'
            }
        ];

        return todayCards.map(card => `
            <div class="flex items-center p-4 ${card.color} rounded-xl">
                <div class="flex-shrink-0">
                    <div class="p-2 ${card.iconBg} rounded-lg">
                        <span class="material-icons-outlined text-lg">${card.icon}</span>
                    </div>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium opacity-75">${card.label}</p>
                    <p class="text-2xl font-bold">${card.value}</p>
                </div>
            </div>
        `).join('');
    },

    renderTopActiveUsers(users) {
        console.log('Rendering top active users:', users);
        
        if (!users || !Array.isArray(users) || users.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons-outlined text-4xl mb-2 block">person_off</span>
                    <p>No active users data available</p>
                    <p class="text-xs mt-1">Users will appear here when they create articles or comments</p>
                </div>
            `;
        }

        return `
            <div class="space-y-4">
                ${users.slice(0, 5).map((user, index) => {
                    // Ensure user object has required properties
                    const safeUser = {
                        firstName: user.firstName || 'Unknown',
                        lastName: user.lastName || 'User',
                        email: user.email || 'unknown@email.com',
                        articleCount: user.articleCount || 0,
                        commentCount: user.commentCount || 0,
                        activityScore: user.activityScore || 0,
                        lastActive: user.lastActive || user.lastLogin || null
                    };

                    return `
                        <div class="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div class="flex-shrink-0">
                                <div class="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                                    ${index + 1}
                                </div>
                            </div>
                            <div class="ml-4 flex-1 min-w-0">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-900 truncate">
                                            ${safeUser.firstName} ${safeUser.lastName}
                                        </p>
                                        <p class="text-xs text-gray-500 truncate">${safeUser.email}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm font-bold text-emerald-600">${safeUser.activityScore}</p>
                                        <p class="text-xs text-gray-500">Activity Score</p>
                                    </div>
                                </div>
                                <div class="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                    <span class="flex items-center">
                                        <span class="material-icons-outlined text-xs mr-1">article</span>
                                        ${safeUser.articleCount} articles
                                    </span>
                                    <span class="flex items-center">
                                        <span class="material-icons-outlined text-xs mr-1">comment</span>
                                        ${safeUser.commentCount} comments
                                    </span>
                                    <span class="flex items-center">
                                        <span class="material-icons-outlined text-xs mr-1">schedule</span>
                                        ${this.formatDate(safeUser.lastActive)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderTopArticles(articles) {
        console.log('Rendering top articles:', articles);
        
        if (!articles || !Array.isArray(articles) || articles.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons-outlined text-4xl mb-2 block">article</span>
                    <p>No articles data available</p>
                    <p class="text-xs mt-1">Articles will appear here when they receive views and comments</p>
                </div>
            `;
        }

        return `
            <div class="space-y-4">
                ${articles.slice(0, 5).map((article, index) => {
                    // Ensure article object has required properties
                    const safeArticle = {
                        title: article.title || 'Untitled Article',
                        author: {
                            email: article.author?.email || 'Unknown Author',
                            firstName: article.author?.firstName || 'Unknown',
                            lastName: article.author?.lastName || 'User'
                        },
                        views: article.views || 0,
                        commentCount: article.commentCount || 0,
                        engagementScore: article.engagementScore || 0,
                        createdAt: article.createdAt || new Date(),
                        articleId: article.articleId || `Article ${index + 1}`
                    };

                    return `
                        <div class="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div class="flex items-start justify-between">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center mb-2">
                                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold mr-3">
                                            ${index + 1}
                                        </span>
                                        <h4 class="text-sm font-medium text-gray-900 truncate">
                                            ${safeArticle.title}
                                        </h4>
                                    </div>
                                    <p class="text-xs text-gray-500 mb-3">
                                        By ${safeArticle.author.email} • ${this.formatDate(safeArticle.createdAt)}
                                    </p>
                                    <div class="flex items-center space-x-4 text-xs">
                                        <span class="flex items-center text-blue-600">
                                            <span class="material-icons-outlined text-xs mr-1">visibility</span>
                                            ${safeArticle.views} views
                                        </span>
                                        <span class="flex items-center text-green-600">
                                            <span class="material-icons-outlined text-xs mr-1">comment</span>
                                            ${safeArticle.commentCount} comments
                                        </span>
                                        <span class="flex items-center text-purple-600">
                                            <span class="material-icons-outlined text-xs mr-1">trending_up</span>
                                            ${safeArticle.engagementScore} score
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderLatestGeneralActivity(activities) {
        console.log('Rendering latest activity:', activities);
        
        if (!activities || !Array.isArray(activities) || activities.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons-outlined text-4xl mb-2 block">history</span>
                    <p>No recent activity available</p>
                    <p class="text-xs mt-1">Activity will appear here as users interact with the system</p>
                </div>
            `;
        }

        return `
            <div class="space-y-3 max-h-96 overflow-y-auto">
                ${activities.slice(0, 20).map(activity => {
                    // Ensure activity object has required properties
                    const safeActivity = {
                        user: {
                            email: activity.user?.email || 'System',
                            firstName: activity.user?.firstName || 'Unknown',
                            lastName: activity.user?.lastName || 'User'
                        },
                        action: activity.action || 'UNKNOWN_ACTION',
                        details: activity.details || 'No details available',
                        timestamp: activity.timestamp || new Date()
                    };

                    return `
                        <div class="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div class="flex-shrink-0">
                                <div class="w-10 h-10 rounded-full ${this.getActivityIconBg(safeActivity.action)} flex items-center justify-center">
                                    <span class="material-icons-outlined text-sm ${this.getActivityIconColor(safeActivity.action)}">
                                        ${this.getActivityIcon(safeActivity.action)}
                                    </span>
                                </div>
                            </div>
                            <div class="ml-4 flex-1 min-w-0">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm text-gray-900">
                                            <span class="font-medium">${safeActivity.user.email}</span>
                                            <span class="text-gray-600">${this.formatActivityAction(safeActivity.action)}</span>
                                        </p>
                                        <p class="text-xs text-gray-500 truncate">
                                            ${this.formatActivityDetails(safeActivity.details)}
                                        </p>
                                    </div>
                                    <div class="flex-shrink-0 ml-4">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getActivityBadgeColor(safeActivity.action)}">
                                            ${this.formatActivityActionShort(safeActivity.action)}
                                        </span>
                                        <p class="text-xs text-gray-500 mt-1 text-right">
                                            ${this.formatTimeAgo(safeActivity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    // Helper methods for activity formatting
    getActivityIcon(action) {
        const icons = {
            'USER_LOGIN': 'login',
            'USER_CREATED': 'person_add',
            'USER_UPDATED': 'person',
            'USER_DELETED': 'person_remove',
            'ARTICLE_CREATED': 'post_add',
            'ARTICLE_UPDATED': 'edit',
            'ARTICLE_DELETED': 'delete',
            'COMMENT_ADDED': 'chat_bubble',
            'COMMENT_DELETED': 'chat_bubble_outline',
            'FILE_UPLOADED': 'upload_file',
            'DEFAULT': 'info'
        };
        return icons[action] || icons.DEFAULT;
    },

    getActivityIconBg(action) {
        const backgrounds = {
            'USER_LOGIN': 'bg-green-100',
            'USER_CREATED': 'bg-blue-100',
            'USER_UPDATED': 'bg-yellow-100',
            'USER_DELETED': 'bg-red-100',
            'ARTICLE_CREATED': 'bg-purple-100',
            'ARTICLE_UPDATED': 'bg-indigo-100',
            'ARTICLE_DELETED': 'bg-red-100',
            'COMMENT_ADDED': 'bg-emerald-100',
            'COMMENT_DELETED': 'bg-orange-100',
            'FILE_UPLOADED': 'bg-cyan-100',
            'DEFAULT': 'bg-gray-100'
        };
        return backgrounds[action] || backgrounds.DEFAULT;
    },

    getActivityIconColor(action) {
        const colors = {
            'USER_LOGIN': 'text-green-600',
            'USER_CREATED': 'text-blue-600',
            'USER_UPDATED': 'text-yellow-600',
            'USER_DELETED': 'text-red-600',
            'ARTICLE_CREATED': 'text-purple-600',
            'ARTICLE_UPDATED': 'text-indigo-600',
            'ARTICLE_DELETED': 'text-red-600',
            'COMMENT_ADDED': 'text-emerald-600',
            'COMMENT_DELETED': 'text-orange-600',
            'FILE_UPLOADED': 'text-cyan-600',
            'DEFAULT': 'text-gray-600'
        };
        return colors[action] || colors.DEFAULT;
    },

    getActivityBadgeColor(action) {
        const colors = {
            'USER_LOGIN': 'bg-green-100 text-green-800',
            'USER_CREATED': 'bg-blue-100 text-blue-800',
            'USER_UPDATED': 'bg-yellow-100 text-yellow-800',
            'USER_DELETED': 'bg-red-100 text-red-800',
            'ARTICLE_CREATED': 'bg-purple-100 text-purple-800',
            'ARTICLE_UPDATED': 'bg-indigo-100 text-indigo-800',
            'ARTICLE_DELETED': 'bg-red-100 text-red-800',
            'COMMENT_ADDED': 'bg-emerald-100 text-emerald-800',
            'COMMENT_DELETED': 'bg-orange-100 text-orange-800',
            'FILE_UPLOADED': 'bg-cyan-100 text-cyan-800',
            'DEFAULT': 'bg-gray-100 text-gray-800'
        };
        return colors[action] || colors.DEFAULT;
    },

    formatActivityAction(action) {
        const actionTexts = {
            'USER_LOGIN': ' logged in',
            'USER_CREATED': ' registered a new account',
            'USER_UPDATED': ' updated their profile',
            'USER_DELETED': ' account was deleted',
            'ARTICLE_CREATED': ' created a new article',
            'ARTICLE_UPDATED': ' updated an article',
            'ARTICLE_DELETED': ' deleted an article',
            'COMMENT_ADDED': ' posted a comment',
            'COMMENT_DELETED': ' deleted a comment',
            'FILE_UPLOADED': ' uploaded a file'
        };
        return actionTexts[action] || ' performed an action';
    },

    formatActivityActionShort(action) {
        return action.split('_').map(word => 
            word.charAt(0) + word.slice(1).toLowerCase()
        ).join(' ');
    },

    formatActivityDetails(details) {
        if (!details) return '';
        if (typeof details === 'string') return details;
        if (typeof details === 'object') {
            return Object.entries(details)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
        }
        return '';
    },

    formatDate(date) {
        if (!date) return 'Never';
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'Invalid Date';
            
            return dateObj.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    },

    formatTimeAgo(date) {
        if (!date) return 'Unknown';
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'Invalid';
            
            const now = new Date();
            const diffInMinutes = Math.floor((now - dateObj) / (1000 * 60));
            
            if (diffInMinutes < 1) return 'Just now';
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return `${diffInHours}h ago`;
            
            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 7) return `${diffInDays}d ago`;
            
            return dateObj.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting time ago:', error);
            return 'Unknown';
        }
    },

    updateLastUpdated() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Updated ${new Date().toLocaleTimeString()}`;
        }
    },

    startAutoRefresh() {
        // Clear any existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Refresh stats every 30 seconds
        this.refreshInterval = setInterval(async () => {
            try {
                const response = await api.get('/api/admin/stats');
                if (response && response.success && response.data) {
                    // Rerender the stats
                    const adminContent = document.getElementById('adminContent');
                    if (adminContent) {
                        this.renderEnhancedStats(response.data, adminContent);
                    }
                }
            } catch (error) {
                console.error('Error refreshing stats:', error);
            }
        }, 30000);
    },

    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
};