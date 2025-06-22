// frontend/src/js/articles/articleList.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';
import { navigation } from '../utils/navigation.js';

export const articleList = {
    currentSection: null,
    articles: [],
    currentPage: 1,
    articlesPerPage: 15,
    totalPages: 0,
    totalItems: 0,
    showAll: false,
    searchTerm: '',
    currentFilter: 'all',     
    currentSort: 'recent',    
    currentDateRange: 'all',  
    authors: [],
    currentAuthor: 'all',
    sections: [],
    currentSection: 'all',

 // Use _.debounce instead of imported debounce
 debouncedSetSection: _.debounce(async function(sectionId) {
    await this.setSection(sectionId);
}, 300),

    hasActiveFilters() {
        return this.currentFilter !== 'all' ||
               this.currentSort !== 'recent' ||
               this.currentDateRange !== 'all';
    },


     // Add it here alongside other UI-related methods
     updateFilterUI() {
        const filterIndicator = document.getElementById('filterInfo');
        
        // If the element doesn't exist, create it
        if (!filterIndicator) {
            const articleList = document.querySelector('#articleList');
            if (articleList) {
                articleList.insertAdjacentHTML('afterbegin', this.createFilterInfoHTML());
            }
            return;
        }
    
        // Update existing filter info
        if (this.hasActiveFilters()) {
            // Replace the entire content to ensure proper structure
            filterIndicator.innerHTML = this.createFilterInfoHTML(true);
            filterIndicator.classList.remove('hidden');
        } else {
            filterIndicator.classList.add('hidden');
        }
    },
    
    // Add this new helper method
    createFilterInfoHTML(skipContainer = false) {
        const filterContent = `
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <span class="text-blue-400">
                                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"></path>
                                </svg>
                            </span>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-blue-700">
                                ${this.getActiveFiltersSummary()}
                            </p>
                        </div>
                    </div>
                    <button onclick="articleList.resetFilters()" class="text-blue-400 hover:text-blue-600">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    
        if (skipContainer) {
            return filterContent;
        }
    
        return `
            <div id="filterInfo" class="mb-4 ${this.hasActiveFilters() ? '' : 'hidden'}">
                ${filterContent}
            </div>
        `;
    },

    // Add these methods here after the properties and before other methods
    saveFilterPreferences() {
        const preferences = {
            currentFilter: this.currentFilter,
            currentSort: this.currentSort,
            currentDateRange: this.currentDateRange,
            currentSection: this.currentSection,
            currentAuthor: this.currentAuthor
        };
        localStorage.setItem('articleFilterPreferences', JSON.stringify(preferences));
    },

    loadFilterPreferences() {
        const saved = localStorage.getItem('articleFilterPreferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            this.currentFilter = preferences.currentFilter || 'all';
            this.currentSort = preferences.currentSort || 'recent';
            this.currentDateRange = preferences.currentDateRange || 'all';
            this.currentSection = preferences.currentSection || 'all';
            this.currentAuthor = preferences.currentAuthor || 'all';
        }
    },
    
    async resetFilters() {
        this.currentFilter = 'all';
        this.currentSort = 'recent';
        this.currentDateRange = 'all';
        this.currentPage = 1;
        
        // Reset all select elements to default
        ['sortFilter', 'dateFilter'].forEach(id => {
            const select = document.getElementById(id);
            if (select) select.value = 'all';
        });
        
        try {
            await this.fetchArticles();
        } catch (error) {
            console.error('Error resetting filters:', error);
            ui.showError('Failed to reset filters');
        }
    },
    
    renderArticle(article) {
        const currentUser = auth.user.get();
        const status = this.getArticleStatus(article, currentUser);
        const isAuthor = currentUser && article.author && String(article.author._id) === String(currentUser._id);
        const isAdmin = currentUser && ['admin', 'super'].includes(currentUser.role);
        const canEdit = isAuthor || isAdmin;
    
        console.log('Rendering article:', {
            id: article._id,
            title: article.title,
            articleId: article.articleId
        });
    
        return `
        <div class="bg-white rounded-lg shadow-md overflow-hidden relative group w-full h-[28rem] flex flex-col
            ${status.borderColor ? status.borderColor + ' border-l-4' : ''} 
            ${article.hidden ? 'bg-opacity-75' : ''} 
            ${status.opacity}"
            data-article-id="${articleId}">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-xl font-semibold ${status.isRead && !status.isUpdated ? 'text-gray-600' : 'text-gray-900'}">
                            ${this.escapeHtml(article.title)}
                        </h3>
                        <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            ${article.articleId || 'N/A'}
                        </span>
                    </div>
    
                    <div class="text-sm text-gray-500 mb-3">
                        By ${article.author?.firstName || 'Unknown'} ${article.author?.lastName || ''} | 
                        ${new Date(article.createdAt).toLocaleDateString()}
                    </div>
    
                    <p class="text-gray-700 mb-4 line-clamp-3">
                        ${this.escapeHtml(article.content)}
                    </p>
    
                    <div class="px-6 py-3 bg-gray-50 border-t relative z-20">
                        <div class="flex justify-center items-center space-x-4 relative z-25">
                            <button 
                                type="button"
                                class="view-btn min-w-[80px] px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm relative z-30" 
                                data-action="view" 
                                data-article-id="${articleId}">
                                View
                            </button>
                            ${canEdit ? `
                                <button class="edit-btn px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                                    data-action="edit" data-article-id="${article._id}">
                                    Edit
                                </button>
                                <button class="delete-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                    data-action="delete" data-article-id="${article._id}">
                                    Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Inside fetchArticles
    async fetchArticles() {
        try {
            ui.showLoading();
            
            console.log('Fetching with state:', {
                page: this.currentPage,
                limit: this.articlesPerPage,
                filter: this.currentFilter,
                sort: this.currentSort,
                dateRange: this.currentDateRange,
                section: this.currentSection,
                totalPages: this.totalPages,
                totalItems: this.totalItems
            });
    
            const queryParams = new URLSearchParams();
    
            // Add pagination parameters first
            queryParams.append('page', this.currentPage.toString());
            queryParams.append('limit', this.articlesPerPage.toString());
    
            // Then add your existing filter parameters
            if (this.currentFilter && this.currentFilter !== 'all') {
                queryParams.append('filter', this.currentFilter);
            }
    
            if (this.currentSort && this.currentSort !== 'recent') {
                queryParams.append('sort', this.currentSort);
            }
    
            if (this.currentDateRange && this.currentDateRange !== 'all') {
                queryParams.append('dateRange', this.currentDateRange);
            }
    
            if (this.searchTerm) {
                queryParams.append('search', this.searchTerm);
            }
    
            // Add section filter if applicable
            if (this.currentSection && this.currentSection !== 'all') {
                queryParams.append('sectionId', this.currentSection);
            }
    
            const endpoint = `/api/articles?${queryParams.toString()}`;
            console.log('Fetching articles:', endpoint);
    
            // Make the API call
            const response = await api.get(endpoint);
            // Add this debug log
        console.log('API Response:', {
            success: response.success,
            data: response.data?.length,
            pagination: response.pagination,
            totalPages: response.pagination?.totalPages,
            currentPage: response.pagination?.currentPage,
            totalItems: response.pagination?.totalItems
        });
            if (!response.success) {
                throw new Error(response.message || 'Failed to fetch articles');
            }
    
            // Validate response data
            if (!Array.isArray(response.data)) {
                console.error('Invalid article data received:', response.data);
                throw new Error('Invalid article data received from server');
            }
    
            // Update articles array
            this.articles = response.data;
     // Add this debug log
     console.log('Before pagination update:', {
        totalPages: this.totalPages,
        currentPage: this.currentPage,
        totalItems: this.totalItems
    });
            // Update pagination state with better error handling
            if (response.pagination) {
                this.totalPages = parseInt(response.pagination.totalPages) || 0;
                this.totalItems = parseInt(response.pagination.totalItems) || 0;
                this.currentPage = parseInt(response.pagination.currentPage) || 1;
                this.articlesPerPage = parseInt(response.pagination.itemsPerPage) || 15;
    
                console.log('Updated pagination state:', {
                    currentPage: this.currentPage,
                    totalPages: this.totalPages,
                    totalItems: this.totalItems,
                    itemsPerPage: this.articlesPerPage
                });
            } else {
                console.warn('No pagination data received from server');
                // Set fallback values
                this.totalPages = Math.ceil(this.articles.length / this.articlesPerPage);
                this.totalItems = this.articles.length;
            }
    
            // Update UI components
            await this.renderArticles();
            this.updatePaginationUI();
            this.updateFilterUI();
    
        } catch (error) {
            console.error('Comprehensive error fetching articles:', {
                error: error.message,
                stack: error.stack,
                currentState: {
                    page: this.currentPage,
                    section: this.currentSection,
                    filter: this.currentFilter,
                    sort: this.currentSort,
                    dateRange: this.currentDateRange,
                    searchTerm: this.searchTerm
                }
            });
            
            ui.showError('Failed to fetch articles: ' + error.message);
            
            // Reset to empty state on error
            this.articles = [];
            this.totalPages = 0;
            this.totalItems = 0;
            this.currentPage = 1;
            
            // Render empty state
            await this.renderArticles();
        } finally {
            ui.hideLoading();
        }
    },

// Add these helper methods if you don't have them already
isValidObjectId(id) {
    return id && /^[0-9a-fA-F]{24}$/.test(id);
},

logFilterState() {
    console.log('Current filter state:', {
        filter: this.currentFilter,
        sort: this.currentSort,
        dateRange: this.currentDateRange,
        section: this.currentSection,
        author: this.currentAuthor,
        hasActiveFilters: this.hasActiveFilters()
    });
},
async fetchAuthors() {
    try {
        console.log('Fetching authors...');
        // Changed endpoint to get only active authors who have written articles
        const response = await api.get('/api/articles/authors');
        if (response.success) {
            this.authors = response.data;
            console.log('Authors fetched:', this.authors);
            
            // Update the authors dropdown
            const authorSelect = document.getElementById('authorFilter');
            if (authorSelect) {
                authorSelect.innerHTML = `
                    <option value="all">All Authors</option>
                    ${this.authors.map(author => `
                        <option value="${author._id}" ${this.currentAuthor === author._id ? 'selected' : ''}>
                            ${author.firstName} ${author.lastName}
                        </option>
                    `).join('')}
                `;
            }
        } else {
            throw new Error(response.message || 'Failed to fetch authors');
        }
    } catch (error) {
        console.error('Error fetching authors:', error);
        ui.showError('Failed to load authors');
    }
},

async fetchSections() {
    try {
        console.log('Fetching sections...');
        const response = await api.get('/api/sections/active'); // Updated endpoint
        if (response.success) {
            this.sections = response.data;
            console.log('Sections fetched:', this.sections);
            
            // Update the sections dropdown
            const sectionSelect = document.getElementById('sectionFilter');
            if (sectionSelect) {
                sectionSelect.innerHTML = `
                    <option value="all">All Sections</option>
                    ${this.sections.map(section => `
                        <option value="${section._id}" ${this.currentSection === section._id ? 'selected' : ''}>
                            ${section.name}
                        </option>
                    `).join('')}
                `;
            }
        } else {
            throw new Error(response.message || 'Failed to fetch sections');
        }
    } catch (error) {
        console.error('Error fetching sections:', error);
        ui.showError('Failed to load sections');
    }
},


// Update the initialize method to fetch authors:
async initialize() {
    try {
        console.log('Initializing article list...');
        
        // Reset pagination state
        this.resetPagination();
        
        // Load saved filter preferences
        this.loadFilterPreferences();
        
        // Fetch articles for the current page
        await this.fetchArticles();
        
        // Set up event handlers
        this.setupPagination();
        this.attachEventListeners();
        this.setupFilterHandlers();
        
        console.log('Article list initialized successfully');
        
    } catch (error) {
        console.error('Error initializing article list:', error);
        ui.showError('Failed to load articles');
    }
},



// Add these new methods to the articleList object
renderFilterBar() {
    return `
        <div class="bg-white shadow-sm border-b mb-6">
            <div class="max-w-7xl mx-auto px-4 py-3">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <!-- Left side: Quick Filter Buttons -->
                    <div class="flex items-center gap-2">
                        <button
                            data-filter="all"
                            class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium 
                            ${this.currentFilter === 'all' 
                                ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } transition-all duration-200">
                            <span class="material-icons-outlined text-sm mr-1.5">article</span>
                            All
                        </button>
                        <button
                            data-filter="unread"
                            class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium 
                            ${this.currentFilter === 'unread' 
                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } transition-all duration-200">
                            <span class="material-icons-outlined text-sm mr-1.5">mark_email_unread</span>
                            Unread
                        </button>
                        <button
                            data-filter="updated"
                            class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium 
                            ${this.currentFilter === 'updated' 
                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } transition-all duration-200">
                            <span class="material-icons-outlined text-sm mr-1.5">update</span>
                            Updated
                        </button>
                    </div>

                    <!-- Center: Sort and Date Controls -->
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2">
                            <span class="material-icons-outlined text-gray-400 text-sm">sort</span>
                            <select
                                id="sortFilter"
                                class="text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 min-w-[130px]">
                                <option value="recent" ${this.currentSort === 'recent' ? 'selected' : ''}>Most Recent</option>
                                <option value="oldest" ${this.currentSort === 'oldest' ? 'selected' : ''}>Oldest First</option>
                                <option value="updated" ${this.currentSort === 'updated' ? 'selected' : ''}>Last Updated</option>
                                <option value="title" ${this.currentSort === 'title' ? 'selected' : ''}>Title A-Z</option>
                                <option value="expiring" ${this.currentSort === 'expiring' ? 'selected' : ''}>Expiring Soon</option>
                            </select>
                        </div>

                        <div class="flex items-center gap-2">
                            <span class="material-icons-outlined text-gray-400 text-sm">date_range</span>
                            <select
                                id="dateFilter"
                                class="text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 min-w-[130px]">
                                <option value="all" ${this.currentDateRange === 'all' ? 'selected' : ''}>All Time</option>
                                <option value="today" ${this.currentDateRange === 'today' ? 'selected' : ''}>Today</option>
                                <option value="week" ${this.currentDateRange === 'week' ? 'selected' : ''}>This Week</option>
                                <option value="month" ${this.currentDateRange === 'month' ? 'selected' : ''}>This Month</option>
                                <option value="quarter" ${this.currentDateRange === 'quarter' ? 'selected' : ''}>Last 3 Months</option>
                            </select>
                        </div>
                    </div>

                    <!-- Right side: Clear Filters button -->
                    ${(this.currentFilter !== 'all' || this.currentSort !== 'recent' || this.currentDateRange !== 'all') ? `
                        <button
                            data-action="clear-filters"
                            class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium 
                                bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200">
                            <span class="material-icons-outlined text-sm mr-1.5">clear</span>
                            Clear Filters
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
},

getActiveFiltersSummary() {
    const activeFilters = [];
    
    if (this.currentFilter !== 'all') {
        activeFilters.push(`Filter: ${this.currentFilter.charAt(0).toUpperCase() + this.currentFilter.slice(1)}`);
    }
    if (this.currentSort !== 'recent') {
        activeFilters.push(`Sort: ${this.currentSort.charAt(0).toUpperCase() + this.currentSort.slice(1)}`);
    }
    if (this.currentDateRange !== 'all') {
        activeFilters.push(`Date: ${this.currentDateRange.charAt(0).toUpperCase() + this.currentDateRange.slice(1)}`);
    }

    return activeFilters.join(' | ');
},

// Add filter state to your articleList object
activeFilter: 'all',
activeSort: 'recent',
activeDateRange: 'all',
currentFilter: 'all',
currentSort: 'recent',
currentDateRange: 'all',

// Add this method to handle filter changes
setupFilterHandlers() {
    const container = document.getElementById('articleList');
    if (!container) return;

    // Add event listeners for filter buttons
    const filterButtons = container.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const filter = e.currentTarget.getAttribute('data-filter');
            console.log('Filter button clicked:', filter);

            // Update UI to show active filter
            filterButtons.forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-600', 'ring-offset-2');
                btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            });

            e.currentTarget.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            e.currentTarget.classList.add('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-600', 'ring-offset-2');

            // Set filter and reset page
            this.currentFilter = filter;
            this.currentPage = 1;

            try {
                await this.fetchArticles();
            } catch (error) {
                console.error('Error applying filter:', error);
                ui.showError('Failed to apply filter');
            }
        });
    });

    // Handle section filter changes
    const sectionFilter = container.querySelector('#sectionFilter');
    if (sectionFilter) {
        sectionFilter.addEventListener('change', async () => {
            const sectionId = sectionFilter.value;
            console.log('Section changed to:', sectionId);
            await this.setSection(sectionId);
        });
    }

    // Handle sort and date filters
    ['sortFilter', 'dateFilter', 'authorFilter'].forEach(filterId => {
        const select = container.querySelector(`#${filterId}`);
        if (select) {
            select.addEventListener('change', async () => {
                this.currentPage = 1;
                switch (filterId) {
                    case 'sortFilter':
                        this.currentSort = select.value;
                        break;
                    case 'dateFilter':
                        this.currentDateRange = select.value;
                        break;
                    case 'authorFilter':
                        this.currentAuthor = select.value;
                        break;
                }
                
                try {
                    await this.fetchArticles();
                } catch (error) {
                    console.error(`Error updating ${filterId}:`, error);
                    ui.showError(`Failed to update ${filterId}`);
                }
            });
        }
    });

    // Clear filter handler
    const clearFilterBtn = container.querySelector('[data-action="clear-filters"]');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', async () => {
            // Reset all filters to default
            this.currentFilter = 'all';
            this.currentSort = 'recent';
            this.currentDateRange = 'all';
            this.currentAuthor = 'all';
            this.currentPage = 1;

            // Reset UI elements
            const filterButtons = container.querySelectorAll('[data-filter]');
            filterButtons.forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-600', 'ring-offset-2');
                btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                
                // Find the 'all' filter button and activate it
                if (btn.getAttribute('data-filter') === 'all') {
                    btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                    btn.classList.add('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-600', 'ring-offset-2');
                }
            });

            // Reset select elements
            ['sortFilter', 'dateFilter', 'authorFilter'].forEach(filterId => {
                const select = document.getElementById(filterId);
                if (select) select.value = 'all';
            });

            try {
                await this.fetchArticles();
            } catch (error) {
                console.error('Error clearing filters:', error);
                ui.showError('Failed to clear filters');
            }
        });
    }
},

async initializeFlashBanner() {
    console.log('🚀 Initializing flash banner - START');
    
    try {
        const flashBanner = document.getElementById('flashInfoBanner');
        if (!flashBanner) {
            console.error('❌ FATAL: Flash banner element not found');
            return;
        }

        // Authentication check
        const isAuthenticated = auth.isAuthenticated();
        if (!isAuthenticated) {
            console.warn('❗ Not authenticated, banner will remain hidden');
            return;
        }

        const currentHash = window.location.hash;
        const allowedPages = ['', '#home', '#articles'];
        
        if (!allowedPages.includes(currentHash)) {
            console.warn('❗ Current page not allowed for banner');
            return;
        }

        // Section fetching
        const sectionsResponse = await api.get('/api/sections');
        if (!sectionsResponse.success) {
            console.error('❌ Failed to fetch sections:', sectionsResponse);
            return;
        }

        // Find sections with more robust logging
        const sections = sectionsResponse.data;
        const flashSection = sections.find(s => s.name.toLowerCase() === 'flash information');
        const updatesSection = sections.find(s => s.name.toLowerCase() === 'updates');
        
        console.log('🔎 Section Detection:', {
            flashSectionFound: !!flashSection,
            updatesSectionFound: !!updatesSection,
            flashSectionName: flashSection?.name,
            updatesSectionName: updatesSection?.name
        });

        if (!flashSection && !updatesSection) {
            console.warn('❗ No required sections found');
            return;
        }

        // Prepare section IDs
        const sectionIds = [];
        if (flashSection) sectionIds.push(flashSection._id);
        if (updatesSection) sectionIds.push(updatesSection._id);

        console.log('🆔 Section IDs to query:', sectionIds);

        // Fetch articles directly for each section
        let allArticles = [];
        for (const sectionId of sectionIds) {
            const queryParams = new URLSearchParams({
                sectionId: sectionId,
                limit: '5',
                sort: '-createdAt',
                excludeViewed: 'true'
            });

            const articlesEndpoint = `/api/articles?${queryParams.toString()}`;
            console.log('🌐 Articles Endpoint:', articlesEndpoint);

            // Fetch articles for each section
            const articlesResponse = await api.get(articlesEndpoint);
            
            console.log(`📄 Articles Response for section ${sectionId}:`, {
                success: articlesResponse.success,
                articlesCount: articlesResponse.data?.length || 0
            });

            if (articlesResponse.success && articlesResponse.data) {
                allArticles = [...allArticles, ...articlesResponse.data];
            }
        }

        // Sort and limit total articles
        allArticles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        allArticles = allArticles.slice(0, 10);

        console.log('🏆 Total Articles:', allArticles.length);

        if (allArticles.length === 0) {
            console.warn('❗ No unviewed articles found for banner');
            // Hide banner if no articles
            flashBanner.classList.add('hidden');
            flashBanner.style.display = 'none';
            return;
        }

        const scrollContainer = flashBanner.querySelector('.flash-scroll-container');
        if (!scrollContainer) {
            console.error('❌ Scroll container not found');
            return;
        }

        // FIXED: Create vertical slides HTML structure instead of horizontal scroll
        const slidesHtml = allArticles.map((article, index) => {
            const baseUrl = window.location.origin + window.location.pathname;
            return `
                <div class="flash-article-slide" style="animation-delay: ${index * 6}s;">
                    <a href="${baseUrl}#article/${article._id}" 
                       class="flash-article" 
                       data-article-id="${article._id}"
                       title="${this.escapeHtml(article.title)}">
                        ${this.escapeHtml(article.title)}
                    </a>
                </div>`;
        }).join('');
        
        console.log('🖼️ Vertical slides HTML generated');
        
        // Add class for single article if needed
        const containerClass = allArticles.length === 1 ? 'single-article' : '';
        scrollContainer.className = `flash-scroll-container ${containerClass}`;
        scrollContainer.innerHTML = slidesHtml;
        
        // Calculate total animation duration for infinite loop
        const totalDuration = allArticles.length * 6; // 6 seconds per slide
        scrollContainer.style.setProperty('--total-duration', `${totalDuration}s`);
        
        console.log('📊 Animation setup:', {
            articlesCount: allArticles.length,
            totalDuration: totalDuration,
            containerClass: containerClass
        });
        
        this.updateBannerPosition();
        
        // Show banner
        console.log('🌟 Banner initialization complete with vertical slides');
        flashBanner.classList.remove('hidden');
        flashBanner.style.display = 'flex';

    } catch (error) {
        console.error('❌ Complete Flash Banner Error:', error);
        const flashBanner = document.getElementById('flashInfoBanner');
        if (flashBanner) {
            flashBanner.classList.add('hidden');
            flashBanner.style.display = 'none';
        }
    }
},

// Add this helper method
updateBannerPosition() {
    const flashBanner = document.getElementById('flashInfoBanner');
    const sidebar = document.getElementById('sidebarNav');
    
    if (!flashBanner) return;
    
    if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
        document.body.classList.add('sidebar-expanded');
        document.body.classList.remove('sidebar-collapsed');
    } else {
        document.body.classList.add('sidebar-collapsed');
        document.body.classList.remove('sidebar-expanded');
    }
},


getArticleStatus(article, currentUser) {
    // Basic validation
    if (!article) {
        console.warn('No article provided to getArticleStatus');
        return {
            isRead: false,
            isUpdated: false,
            borderColor: '',
            opacity: 'opacity-100',
            tag: ''
        };
    }

    // Properly access user ID from currentUser object
    const userId = currentUser?._id || currentUser?.user?._id;
    if (!userId) {
        console.warn('No valid user ID for status check');
        return {
            isRead: false,
            isUpdated: false,
            borderColor: '',
            opacity: 'opacity-100',
            tag: ''
        };
    }

    // Debug logging
    console.log('Checking article status:', {
        articleId: article.articleId,
        title: article.title,
        userId: userId,
        lastContentUpdate: article.lastContentUpdate,
        viewedBy: article.viewedBy,
        reads: article.reads
    });

    // Check both reads and viewedBy arrays
    const hasRead = (article.reads?.some(read => 
        read.user?.toString() === userId.toString()
    ) || article.viewedBy?.some(view => 
        view.user?.toString() === userId.toString()
    ));

    // If never read, it's NEW
    if (!hasRead) {
        return {
            isRead: false,
            isUpdated: false,
            borderColor: 'border-blue-500',
            opacity: 'opacity-100',
            tag: 'New'
        };
    }

    // Get the latest read/view timestamp
    let lastReadTimestamp = new Date(0); // Initialize to oldest possible date

    // Check reads array
    const readRecord = article.reads?.find(read => 
        read.user?.toString() === userId.toString()
    );
    if (readRecord?.readAt) {
        lastReadTimestamp = new Date(readRecord.readAt);
    }

    // Check viewedBy array
    const viewRecord = article.viewedBy?.find(view => 
        view.user?.toString() === userId.toString()
    );
    if (viewRecord?.timestamp) {
        const viewTimestamp = new Date(viewRecord.timestamp);
        if (viewTimestamp > lastReadTimestamp) {
            lastReadTimestamp = viewTimestamp;
        }
    }

    // Check for updates after last read
    if (article.lastContentUpdate) {
        const updateTimestamp = new Date(article.lastContentUpdate);
        if (updateTimestamp > lastReadTimestamp) {
            return {
                isRead: true,
                isUpdated: true,
                borderColor: 'border-yellow-500',
                opacity: 'opacity-100',
                tag: 'Updated'
            };
        }
    }

    // Article has been read and not updated
    return {
        isRead: true,
        isUpdated: false,
        borderColor: 'border-gray-200',
        opacity: 'opacity-75',
        tag: 'Read'
    };
},


     // Update the setupPagination method to handle page number clicks
     setupPagination() {
        const container = document.getElementById('articleList');
        if (!container) return;
    
        // Remove old event listener if exists
        if (this.paginationHandler) {
            container.removeEventListener('click', this.paginationHandler);
        }
    
        this.paginationHandler = async (e) => {
            const target = e.target.closest('[data-action="prev-page"], [data-action="next-page"], [data-page]');
            if (!target) return;
    
            e.preventDefault();
            e.stopPropagation();
    
            let newPage = this.currentPage;
    
            if (target.hasAttribute('data-page')) {
                newPage = parseInt(target.dataset.page);
            } else if (target.getAttribute('data-action') === 'prev-page' && !this.isPrevDisabled()) {
                newPage = this.currentPage - 1;
            } else if (target.getAttribute('data-action') === 'next-page' && !this.isNextDisabled()) {
                newPage = this.currentPage + 1;
            }
    
            if (newPage !== this.currentPage && newPage > 0 && newPage <= this.totalPages) {
                this.currentPage = newPage;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                await this.fetchArticles();
            }
        };
    
        container.addEventListener('click', this.paginationHandler);
    },
    isPrevDisabled() {
        return this.currentPage <= 1;
    },
    
    isNextDisabled() {
        return this.currentPage >= this.totalPages;
    },
    
    resetPagination() {
        this.currentPage = 1;
        this.totalPages = 0;
        this.totalItems = 0;
    },
    
    updatePaginationUI() {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) {
            console.warn('Pagination container not found');
            return;
        }
    
        console.log('Updating pagination UI:', {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            totalItems: this.totalItems
        });
    
        paginationContainer.innerHTML = this.renderPagination();
    
        if (this.totalPages > 1) {
            // Show pagination controls
            paginationContainer.classList.remove('hidden');
        } else {
            // Hide pagination controls
            paginationContainer.classList.add('hidden');
        }
    },



    // paginnation
    renderPagination() {
        // Don't show pagination if there's only one page or no items
        if (this.totalPages <= 1 || this.totalItems === 0) {
            return '';
        }
    
        const current = this.currentPage;
        const pages = this.totalPages;
        
        console.log('Rendering pagination:', {
            currentPage: current,
            totalPages: pages,
            totalItems: this.totalItems
        });
        if (this.totalPages <= 1) {
            console.log('No pagination needed - only one page or less');
            return '';
        }
        
        // Create page numbers array
        let pageNumbers = [];
        if (pages <= 5) {
            pageNumbers = Array.from({length: pages}, (_, i) => i + 1);
        } else {
            if (current <= 3) {
                pageNumbers = [1, 2, 3, 4, '...', pages];
            } else if (current >= pages - 2) {
                pageNumbers = [1, '...', pages - 3, pages - 2, pages - 1, pages];
            } else {
                pageNumbers = [1, '...', current - 1, current, current + 1, '...', pages];
            }
        }
    
        return `
            <div class="mt-8 flex flex-col items-center space-y-4">
                <div class="flex items-center space-x-2">
                    <button 
                        class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors
                            ${this.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}"
                        ${this.currentPage === 1 ? 'disabled' : ''}
                        data-action="prev-page">
                        Previous
                    </button>
                    
                    <div class="flex space-x-1">
                        ${pageNumbers.map(num => {
                            if (num === '...') {
                                return `<span class="px-3 py-2">...</span>`;
                            }
                            return `
                                <button
                                    class="px-3 py-2 rounded-md ${
                                        num === current 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-gray-200 hover:bg-gray-300'
                                    }"
                                    data-page="${num}">
                                    ${num}
                                </button>
                            `;
                        }).join('')}
                    </div>
    
                    <button 
                        class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors
                            ${this.currentPage === this.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}"
                        ${this.currentPage === this.totalPages ? 'disabled' : ''}
                        data-action="next-page">
                        Next
                    </button>
                </div>
                
                <div class="text-sm text-gray-600">
                    Showing page ${this.currentPage} of ${this.totalPages} 
                    (${this.totalItems} total items)
                </div>
            </div>
        `;
    },
    
   
    // Helper method to limit text by characters with ellipsis
truncateByCharacters(text, limit) {
    if (!text) return '';
    return text.length > limit ? text.slice(0, limit) + '...' : text;
},

// Helper method to limit text by words with ellipsis
truncateByWords(text, wordLimit) {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= wordLimit) {
        return text;
    }
    return words.slice(0, wordLimit).join(' ') + '...';
},

truncateContent(text, charLimit = 320) { // Increased character limit for content preview
    if (!text) return '';
    if (text.length <= charLimit) return text;
    
    // Find the last space before the limit
    const truncated = text.substr(0, charLimit);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace === -1 
        ? truncated + '...'
        : text.substr(0, lastSpace) + '...';
},
// Helper method to get truncated title
getTruncatedTitle(title) {
    if (!title) return 'Untitled';
    // Increased character limit for better title display
    // 80-85 characters typically fit well in 3 lines with standard font size
    return this.truncateContent(title, 85);
},
// to adjust button in preview and card 
renderArticleCard(article) {
    if (!article) {
        console.error('Article is null or undefined');
        return '';
    }

    const articleId = article._id?.toString() || article.id?.toString();
    if (!articleId) {
        console.error('Article ID resolution failed:', article);
        return '';
    }

    const currentUser = auth.user.get();
    const status = this.getArticleStatus(article, currentUser);
    const isAuthor = currentUser?.user && article.author && 
        String(article.author._id || article.author) === String(currentUser.user._id);
    const isAdmin = currentUser?.user && ['admin', 'super'].includes(currentUser.user.role);
    const canEdit = isAuthor || isAdmin;

    const truncatedTitle = this.getTruncatedTitle(article.title || 'Untitled');
    const truncatedContent = this.truncateContent(article.content || 'No content available');

// Status tag with conditional classes based on status
const statusTag = status.tag ? `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${status.tag === 'New' ? 'bg-blue-100 text-blue-800' : ''}
        ${status.tag === 'Updated' ? 'bg-yellow-100 text-yellow-800' : ''}
        ${status.tag === 'Read' ? 'bg-gray-100 text-gray-800' : ''}
        mr-2">
        ${status.tag}
    </span>
` : '';
    
    const hiddenTag = article.hidden ? `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">
            Hidden
        </span>
    ` : '';

    return `
        <div class="bg-white rounded-lg shadow-md overflow-hidden relative group w-full h-[28rem] flex flex-col
            ${status.borderColor ? status.borderColor + ' border-l-4' : ''} 
            ${article.hidden ? 'bg-opacity-75' : ''} 
            ${status.opacity}"
            data-article-id="${articleId}">
            
            <!-- Header Section -->
            <div class="p-6 pb-2">
                <!-- Status, Hidden and ID Tags -->
                    <div class="flex items-center gap-2 mb-2">
                        ${statusTag}
                        ${hiddenTag}
                        <span class="inline-block text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            ${article.articleId || 'N/A'}
                        </span>
                    </div>
                
                <!-- Title -->
                <h3 class="text-xl font-semibold mb-3 group/title relative
                    ${status.isRead && !status.isUpdated ? 'text-gray-600' : 'text-gray-900'}">
                    <span title="${this.escapeHtml(article.title || 'Untitled')}" 
                          class="cursor-help line-clamp-3 block">
                        ${this.escapeHtml(truncatedTitle)}
                    </span>
                </h3>
            </div>

           <!-- Content Section -->
            <div class="px-6 flex-1 overflow-hidden">
                <div class="prose prose-sm max-w-none h-full relative
                    ${status.isRead && !status.isUpdated ? 'text-gray-500' : 'text-gray-700'}
                    ${article.hidden ? 'text-opacity-75' : ''}">
                    <p class="line-clamp-6">
                        ${this.escapeHtml(this.truncateContent(article.content))}
                    </p>
                </div>
            </div>

            <!-- Author Info Section -->
<div class="px-6 py-2 text-sm text-gray-500 bg-gradient-to-b from-white to-[#f0f4fc]">
    <p class="mb-1">By <a href="mailto:${article.author?.email || ''}" class="text-blue-600 hover:text-blue-800 hover:underline">
        ${article.author?.firstName || article.author?.name || 'Unknown'} 
        ${article.author?.lastName || ''}</a></p>
    <p>${this.formatDate(article.createdAt || new Date())}</p>
    ${article.lastContentUpdate && article.lastContentUpdate !== article.createdAt ? `
        <p class="text-sm text-blue-600">Updated: ${this.formatDate(article.lastContentUpdate)}</p>
    ` : ''}
    ${article.isTemporary && article.expiresAt ? `
        <p class="text-sm text-red-600">Expires: ${this.formatDate(article.expiresAt)} (${this.getTimeUntilExpiry(article.expiresAt)})</p>
    ` : ''}
</div>

            <!-- Button Section -->
            <div class="px-6 py-3 bg-gray-50 border-t">
                <div class="flex justify-center items-center space-x-4">
                    <button 
                        type="button"
                        class="view-btn min-w-[80px] px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm" 
                        data-action="view" 
                        data-article-id="${articleId}">
                        View
                    </button>
                    ${canEdit ? `
                        <button 
                            type="button"
                            class="edit-btn min-w-[80px] px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm" 
                            data-action="edit" 
                            data-article-id="${articleId}">
                            Edit
                        </button>
                        <button 
                            type="button"
                            class="delete-btn min-w-[80px] px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm" 
                            data-action="delete" 
                            data-article-id="${articleId}">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
                    },
formatContent(content) {
    const div = document.createElement('div');
    div.textContent = content;
    return div.innerHTML;
},

// Helper methods section - usually near formatDate and escapeHtml methods
formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
},

// Add the new method here, after formatDate
getTimeUntilExpiry(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry - now;
    
    if (diffMs < 0) return 'Expired';
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} left`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} left`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} left`;
    return `${seconds} second${seconds === 1 ? '' : 's'} left`;
},

escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
},
        

    bindSearchForm() {
        const searchForm = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (searchForm && searchButton) {
            // Handle search button click
            searchButton.addEventListener('click', async (e) => {
                e.preventDefault();
                this.searchTerm = searchForm.value.trim();
                this.currentPage = 1; // Reset to first page when searching
                await this.fetchArticles();
            });
    
            // Handle enter key press
            searchForm.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.searchTerm = searchForm.value.trim();
                    this.currentPage = 1; // Reset to first page when searching
                    await this.fetchArticles();
                }
            });
        }
    },


    // Replace the renderArticles method with this corrected version:
    async renderArticles() {
        const container = document.getElementById('articleList');
        if (!container) return;
    
        // Clear container
        container.innerHTML = '';
    
        // Add filter bar
        const filterBar = document.createElement('div');
        filterBar.innerHTML = this.renderFilterBar();
        container.appendChild(filterBar);
    
        // Create articles grid
        const articlesContainer = document.createElement('div');
        articlesContainer.className = 'w-full space-y-6 mt-6';
    
        const articlesGrid = this.articles.length > 0
            ? `<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                ${this.articles.map(article => this.renderArticleCard(article)).join('')}
               </div>`
            : `<div class="text-center py-8">
                <p class="text-gray-500 text-lg">No articles found</p>
               </div>`;
    
        // Create pagination container and add it after grid
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationContainer';
        paginationContainer.className = 'w-full mt-6';
    
        // Add articles and pagination to container
        articlesContainer.innerHTML = `
            ${articlesGrid}
        `;
        articlesContainer.appendChild(paginationContainer);
    
        // Add container to main container
        container.appendChild(articlesContainer);
    
        // Update pagination UI
        this.updatePaginationUI();
    
        // Setup all event handlers
        this.setupFilterHandlers();
        this.attachEventListeners();
        this.setupPagination();
    },
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },



    attachEventListeners() {
        const container = document.getElementById('articleList');
        if (!container) {
            console.error('Article list container not found');
            return;
        }
    
        // Cleanup old event listeners
        container.removeEventListener('click', this._handleClick);
        
        // Main article actions handler (view, edit, delete)
        this._handleClick = async (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) {
                // Handle tag clicks if no action button was clicked
                const tagLink = e.target.closest('.tag-link');
                if (tagLink) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const tag = tagLink.getAttribute('data-tag');
                    if (tag) {
                        console.log('Tag clicked:', tag);
                        // Use search functionality instead of URL-based filtering
                        const searchInput = document.getElementById('searchInput');
                        const searchForm = document.getElementById('searchForm');
                        if (searchInput && searchForm) {
                            searchInput.value = `#${tag}`;
                            searchForm.dispatchEvent(new Event('submit'));
                            this.currentPage = 1;
                            this.searchTerm = `#${tag}`; // Set search term for tag filtering
                        }
                    }
                }
                return;
            }
    
            e.preventDefault();
            e.stopPropagation();
    
            const articleId = button.getAttribute('data-article-id');
            const action = button.getAttribute('data-action');
    
            if (!articleId) {
                console.error('No article ID found');
                return;
            }
    
            try {
                switch (action) {
                    case 'view':
                        console.log('View clicked:', articleId);
                        window.location.hash = `#article/${articleId}`;
                        break;
    
                    case 'edit':
                        console.log('Edit clicked:', articleId);
                        window.location.hash = `#edit-article/${articleId}`;
                        break;
    
                    case 'delete':
                        if (confirm('Are you sure you want to delete this article?')) {
                            await this.deleteArticle(articleId);
                        }
                        break;
    
                    case 'toggle-visibility':
                        await this.toggleArticleVisibility(articleId);
                        break;
    
                    case 'share':
                        // Copy article URL to clipboard
                        const articleUrl = `${window.location.origin}/#article/${articleId}`;
                        await navigator.clipboard.writeText(articleUrl);
                        ui.showError('Article URL copied to clipboard', 'success');
                        break;
                }
            } catch (error) {
                console.error('Button action error:', error);
                ui.showError(error.message || 'Error processing action');
            }
        };
    
        // Add main click handler
        container.addEventListener('click', this._handleClick);
    
        // Setup tag filter clearing
        const filterInfo = document.getElementById('filterInfo');
        if (filterInfo) {
            filterInfo.addEventListener('click', (e) => {
                const clearButton = e.target.closest('[data-action="clear-filter"]');
                if (clearButton) {
                    e.preventDefault();
                    this.searchTerm = '';
                    this.currentPage = 1;
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    window.location.hash = '#articles';
                }
            });
        }
    
        // Handle manual tag clicks from the article content
        container.addEventListener('click', (e) => {
            const manualTagLink = e.target.closest('[data-tag]');
            if (manualTagLink && !manualTagLink.classList.contains('tag-link')) {
                e.preventDefault();
                const tag = manualTagLink.getAttribute('data-tag');
                if (tag) {
                    const searchInput = document.getElementById('searchInput');
                    const searchForm = document.getElementById('searchForm');
                    if (searchInput && searchForm) {
                        searchInput.value = `#${tag}`;
                        searchForm.dispatchEvent(new Event('submit'));
                        this.currentPage = 1;
                        this.searchTerm = `#${tag}`;
                    }
                }
            }
        });
    
        // Handle section navigation
        container.addEventListener('click', (e) => {
            const sectionLink = e.target.closest('[data-section-id]');
            if (sectionLink) {
                e.preventDefault();
                const sectionId = sectionLink.getAttribute('data-section-id');
                if (sectionId) {
                    this.currentSection = sectionId;
                    this.currentPage = 1;
                    this.searchTerm = '';
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    window.location.hash = `#section/${sectionId}`;
                    this.fetchArticles();
                }
            }
        });
    
        // Re-initialize other listeners
        this.setupPagination();
        this.bindSearchForm();
    
        // Initialize tooltips if any
        const tooltips = container.querySelectorAll('[data-tooltip]');
        tooltips.forEach(tooltip => {
            tooltip.addEventListener('mouseenter', (e) => {
                const tooltipText = e.target.getAttribute('data-tooltip');
                if (tooltipText) {
                    // Show tooltip logic here
                    console.log('Show tooltip:', tooltipText);
                }
            });
        });
    
        // Initialize any additional event handlers for article interactions
        container.querySelectorAll('.article-interaction').forEach(element => {
            element.addEventListener('click', async (e) => {
                const interactionType = element.getAttribute('data-interaction-type');
                const articleId = element.closest('[data-article-id]')?.getAttribute('data-article-id');
                
                if (articleId && interactionType) {
                    try {
                        console.log(`Handling ${interactionType} interaction for article:`, articleId);
                        // Handle different types of article interactions
                        switch (interactionType) {
                            case 'bookmark':
                                // Bookmark handling logic
                                break;
                            case 'like':
                                // Like handling logic
                                break;
                            // Add other interaction types as needed
                        }
                    } catch (error) {
                        console.error('Error handling article interaction:', error);
                        ui.showError('Failed to process interaction');
                    }
                }
            });
        });
    },


    
    // Update deleteArticle method
async deleteArticle(articleId) {
    if (!articleId || articleId === 'undefined') {
        console.error('Invalid article ID:', articleId);
        ui.showError('Cannot delete article: Invalid ID');
        return;
    }

    try {
        ui.showLoading();
        console.log('Deleting article:', articleId);
        
        const response = await api.delete(`/api/articles/${articleId}`);
        
        if (response.success) {
            ui.showError('Article deleted successfully', 'success');
            await this.fetchArticles();
        } else {
            throw new Error(response.message || 'Failed to delete article');
        }
    } catch (error) {
        console.error('Error deleting article:', error);
        ui.showError(error.message || 'Error deleting article');
    } finally {
        ui.hideLoading();
    }
},
    // Helper method to escape HTML
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    

    // Add this after the escapeHtml method
stripHtml(html) {
    if (!html) return '';
    
    // Create a temporary div
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Replace <br>, <p>, </p>, <div>, </div> with spaces
    const text = tempDiv.innerText
        .replace(/(\r\n|\n|\r)/gm, ' ')  // Replace line breaks with space
        .replace(/\s+/g, ' ')            // Replace multiple spaces with single space
        .trim();                         // Trim extra spaces
    
    return text;
},

// Replace your existing truncateContent method with this one
truncateContent(html, charLimit = 320) {
    // First strip HTML and get plain text
    const plainText = this.stripHtml(html);
    
    if (!plainText) return '';
    if (plainText.length <= charLimit) return plainText;
    
    // Find the last space before the limit
    const truncated = plainText.substr(0, charLimit);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace === -1 
        ? truncated + '...'
        : plainText.substr(0, lastSpace) + '...';
},


async setSection(sectionId) {
    console.log('Setting section:', sectionId);
    try {
        ui.showLoading();
        
        // Normalize section ID
        sectionId = sectionId === 'all' ? 'all' : sectionId;
        
        // Reset state
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.currentSort = 'recent';
        this.currentDateRange = 'all';
        this.searchTerm = '';
        
        // Update current section
        this.currentSection = sectionId;

        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('page', '1');
        queryParams.append('limit', this.articlesPerPage.toString());

        // Add section filter if not 'all'
        if (sectionId && sectionId !== 'all') {
            queryParams.append('sectionId', sectionId);
        }

        // Fetch articles
        const endpoint = `/api/articles?${queryParams.toString()}`;
        console.log('Fetching articles with params:', queryParams.toString());

        const response = await api.get(endpoint);
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch articles');
        }

        // Update state
        this.articles = response.data || [];
        
        // Update pagination
        if (response.pagination) {
            this.totalPages = response.pagination.totalPages || 0;
            this.totalItems = response.pagination.totalItems || 0;
            this.currentPage = parseInt(response.pagination.currentPage) || 1;
            this.articlesPerPage = parseInt(response.pagination.itemsPerPage) || 15;
        } else {
            // Fallback if pagination is not provided
            this.totalPages = 0;
            this.totalItems = 0;
            this.currentPage = 1;
        }

        console.log('Section change complete:', {
            sectionId,
            articlesCount: this.articles.length,
            totalItems: this.totalItems,
            totalPages: this.totalPages,
            currentPage: this.currentPage
        });

        // Update UI
        await this.renderArticles();
        this.updatePaginationUI();
        this.updateFilterUI();

        // Update navigation active section
        if (navigation.updateActiveSection) {
            navigation.updateActiveSection(sectionId);
        }

        // Optional: Save current section preference
        this.saveFilterPreferences();

    } catch (error) {
        console.error('Error setting section:', error);
        ui.showError('Failed to load section articles');
        
        // Reset to empty state on error
        this.articles = [];
        this.totalPages = 0;
        this.totalItems = 0;
        this.currentPage = 1;
        this.currentSection = 'all';
        
        // Render empty state
        await this.renderArticles();
    } finally {
        ui.hideLoading();
    }
},

    async toggleArticleVisibility(articleId) {
        try {
            ui.showLoading();
            const response = await api.put(`/api/admin/articles/${articleId}`, {
                hidden: true
            });
    
            if (response.success) {
                await this.fetchArticles();
                ui.showError('Article visibility updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error toggling article visibility:', error);
            ui.showError('Failed to update article visibility');
        } finally {
            ui.hideLoading();
        }
    },
    
};
window.articleList = articleList;
