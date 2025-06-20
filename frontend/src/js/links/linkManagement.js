// Complete Fixed linkManagement.js - Replace your entire file with this
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';

export const linkManagement = {
    isSubmitting: false,
    initialized: false,
    categories: new Set(['General']),
    currentCategory: 'All',
    searchTerm: '',
    allLinks: [],

   // Replace the beginning of your initialize method with this:

async initialize() {
    if (!auth.isAuthenticated()) {
        console.log('User not authenticated, skipping link management initialization');
        const linksSection = document.getElementById('linksSection');
        if (linksSection) {
            linksSection.classList.add('hidden');
        }
        return false;
    }
    
    // Force cleanup if switching users or reinitializing
    if (this.initialized) {
        this.cleanup();
    }
    
    try {
        // Only proceed if we're on the links page
        if (window.location.hash !== '#links') {
            const linksSection = document.getElementById('linksSection');
            if (linksSection) {
                linksSection.classList.add('hidden', 'absolute');
                linksSection.classList.remove('relative');
            }
            return false;
        }
        
        const linksSection = document.getElementById('linksSection');
        if (linksSection) {
            linksSection.classList.remove('hidden', 'absolute');
            linksSection.classList.add('relative');
        }
        
        // Reset state before initializing
        this.searchTerm = '';
        this.currentCategory = 'All';
        this.allLinks = [];
        
        this.createLinksPageStructure();
        await this.fetchCategories();
        await this.loadLinks();
        this.attachEventListeners();
        this.initialized = true;
        return true;
    } catch (error) {
        console.error('Error initializing link management:', error);
        return false;
    }
},


cleanup() {
    // Reset all state
    this.searchTerm = '';
    this.currentCategory = 'All';
    this.allLinks = [];
    this.initialized = false;
    
    // Clear search input
    const searchInput = document.getElementById('linkSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Reset category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.value = 'All';
    }
    
    // Hide clear search button
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
        clearSearch.classList.add('hidden');
    }
    
    // Clear links container
    const linksContainer = document.getElementById('linksContainer');
    if (linksContainer) {
        linksContainer.innerHTML = '';
    }
    
    // Disconnect observer
    if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
    }
    
    console.log('Link management cleaned up');
},
    createLinksPageStructure() {
        const linksSection = document.getElementById('linksSection');
        if (!linksSection) return;
    
        linksSection.innerHTML = `
        <div class="links-main-container">
            <div class="links-content-wrapper">
                
                <!-- Header Section -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                    <div class="flex justify-between items-center mb-8">
                        <div class="flex items-center space-x-3">
                            <div class="p-2 bg-blue-100 rounded-lg">
                                <span class="material-icons-outlined text-blue-600 text-2xl">link</span>
                            </div>
                            <div>
                                <h1 class="text-3xl font-bold text-gray-900">Quick Links</h1>
                                <p class="text-gray-600 mt-1">Manage and organize DDF  important links</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <div id="linkStats" class="text-right mr-4">
                                <div class="text-2xl font-bold text-blue-600" id="linkCount">0</div>
                                <div class="text-sm text-gray-500">Total links</div>
                            </div>
                            <button id="addLinkBtn" 
                                    class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm">
                                <span class="material-icons-outlined text-sm mr-2">add</span>
                                Add Link
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Search and Filter Section -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div class="flex flex-col lg:flex-row gap-4">
                        <!-- Search Bar -->
                        <div class="flex-1">
                            <div class="relative">
                                <span class="material-icons-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">search</span>
                                <input type="text" 
                                       id="linkSearchInput" 
                                       placeholder="Search links by name, URL, or description..."
                                       class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <button id="clearSearch" 
                                        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden">
                                    <span class="material-icons-outlined text-lg">clear</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Category Filter -->
                        <div class="lg:w-64">
                            <select id="categoryFilter" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="All">All Categories</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div id="noLinksMessage" class="hidden">
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <div class="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <span class="material-icons-outlined text-gray-400 text-4xl">link_off</span>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">No links found</h3>
                        <p class="text-gray-600 mb-6 max-w-sm mx-auto">
                            <span id="emptyStateMessage">Start by adding your first quick link to get organized.</span>
                        </p>
                        <button id="addFirstLinkBtn" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <span class="material-icons-outlined text-sm mr-2">add_link</span>
                            Add Your First Link
                        </button>
                    </div>
                </div>

                <!-- Links Grid -->
                <div id="linksContainer" class="links-grid">
                    <!-- Links will be inserted here -->
                </div>
            </div>
        </div>

       
                <!-- Enhanced Modal -->
                <div id="linkModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                    <div class="flex items-start justify-center min-h-screen px-4 py-4">
                        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mt-4">  
                                
                <!-- Modal Header -->
                    <div class="flex justify-between items-center p-6 border-b border-gray-200">
                        <div class="flex items-center space-x-3">
                            <div class="p-2 bg-blue-100 rounded-lg">
                                <span class="material-icons-outlined text-blue-600">link</span>
                            </div>
                            <h3 class="text-xl font-semibold text-gray-900" id="modalTitle">Add New Link</h3>
                        </div>
                        <button id="closeLinkModal" class="text-gray-400 hover:text-gray-500 p-2">
                            <span class="material-icons-outlined">close</span>
                        </button>
                    </div>
                    
                    <!-- Modal Body -->
                    <div class="p-6 overflow-y-auto flex-1">
                        <form id="addLinkForm" class="space-y-6">
                            <!-- Link Name -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <span class="material-icons-outlined text-sm mr-1 align-middle">title</span>
                                    Link Name *
                                </label>
                                <input type="text" 
                                       id="linkName" 
                                       required
                                       placeholder="Enter a descriptive name for your link"
                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                            </div>

                            <!-- URL/Path -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <span class="material-icons-outlined text-sm mr-1 align-middle">link</span>
                                    URL or Path *
                                </label>
                                <input type="text" 
                                       id="linkUrl" 
                                       required
                                       placeholder="https://example.com or \\\\server\\share\\folder"
                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                                <div class="mt-2 text-sm text-gray-500">
                                    <div class="flex items-start space-x-2">
                                        <span class="material-icons-outlined text-xs mt-0.5">info</span>
                                        <div>
                                            <p class="font-medium">Supported formats:</p>
                                            <ul class="mt-1 space-y-1 text-xs">
                                                <li>• Web URLs: https://example.com</li>
                                                <li>• Network paths: \\\\server\\folder</li>
                                                <li>• Local paths: C:\\Documents\\file.pdf</li>
                                                <li>• Email: mailto:someone@company.com</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Description -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <span class="material-icons-outlined text-sm mr-1 align-middle">description</span>
                                    Description
                                </label>
                                <textarea id="linkDescription" 
                                          rows="4"
                                          placeholder="Add a description to help others understand what this link is for..."
                                          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"></textarea>
                            </div>

                            <!-- Category Selection -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <span class="material-icons-outlined text-sm mr-1 align-middle">folder</span>
                                    Category
                                </label>
                                <div class="flex gap-3">
                                    <select id="linkCategory" 
                                            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                                        <option value="General">General</option>
                                    </select>
                                    <button type="button" 
                                            id="newCategoryBtn"
                                            class="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">
                                        <span class="material-icons-outlined text-sm mr-1">add</span>
                                        New Category
                                    </button>
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="bg-gray-50 rounded-lg p-4">
                                <h4 class="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                                <div class="grid grid-cols-2 gap-3">
                                    <button type="button" 
                                            id="testLinkBtn"
                                            class="inline-flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                        <span class="material-icons-outlined text-sm mr-1">open_in_new</span>
                                        Test Link
                                    </button>
                                    <button type="button" 
                                            id="copyUrlBtn"
                                            class="inline-flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                        <span class="material-icons-outlined text-sm mr-1">content_copy</span>
                                        Copy URL
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <!-- Modal Footer -->
                    <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
                        <button type="button" 
                                id="cancelBtn"
                                class="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" 
                                form="addLinkForm"
                                id="saveBtn"
                                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <span class="material-icons-outlined text-sm mr-1">save</span>
                            Save Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;

        // Add comprehensive CSS
        this.addLinkManagementStyles();

        // Add sidebar state observer
        this.setupSidebarObserver();
    },

    addLinkManagementStyles() {
        if (document.getElementById('link-management-styles')) {
            document.getElementById('link-management-styles').remove();
        }
        
        const style = document.createElement('style');
        style.id = 'link-management-styles';
        style.textContent = `
            
/* Main Layout */
.links-main-container {
    margin-left: ${document.body.classList.contains('sidebar-collapsed') ? '2rem' : '13rem'};
    transition: margin-left 0.3s ease;
    background-color: #f9fafb;
    min-height: 100vh;
}

.links-content-wrapper {
    padding: 1rem 1.5rem 2rem 1.5rem;
    max-width: none;
    width: 100%;
}
            
            /* Grid Layout */
            .links-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 1.5rem;
                width: 100%;
                margin: 0;
                padding: 0;
            }
            
            /* Responsive Grid */
            @media (max-width: 640px) {
                .links-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }
                
                .links-content-wrapper {
                    padding: 1rem;
                }
                
                .links-main-container {
                    margin-left: 0 !important;
                }
            }
            
            @media (min-width: 641px) and (max-width: 1024px) {
                .links-grid {
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                }
            }
            
            @media (min-width: 1025px) and (max-width: 1440px) {
                .links-grid {
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                }
            }
            
            @media (min-width: 1441px) {
                .links-grid {
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 2rem;
                }
            }
            
            /* Card Styling */
            .link-card {
                background: white;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
                overflow: hidden;
                width: 100%;
                min-width: 0;
            }
            
            .link-card:hover {
                box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
                border-color: #d1d5db;
                transform: translateY(-2px);
            }
            
            /* URL Highlighting */
            .link-url-container {
                background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
                border: 1px solid #bfdbfe;
                border-radius: 8px;
                padding: 12px;
                margin: 16px 0;
                transition: all 0.2s ease;
            }
            
            .link-url-container:hover {
                background: linear-gradient(135deg, #bfdbfe 0%, #c7d2fe 100%);
                border-color: #93c5fd;
            }
            
            .link-url-label {
                font-weight: 600;
                color: #1e40af;
                font-size: 0.875rem;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .link-url-text {
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                font-size: 0.75rem;
                color: #1d4ed8;
                background: rgba(255, 255, 255, 0.7);
                padding: 6px 8px;
                border-radius: 4px;
                border: 1px solid rgba(59, 130, 246, 0.2);
                word-break: break-all;
                line-height: 1.4;
                font-weight: 500;
            }
            
            /* Button Alignment */
            .link-card-footer {
                background-color: #f9fafb;
                padding: 16px 24px;
                border-top: 1px solid #f3f4f6;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 60px;
            }
            
            .link-primary-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 8px 16px;
                background-color: #2563eb;
                color: white;
                border-radius: 8px;
                font-weight: 500;
                font-size: 0.875rem;
                min-width: 120px;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
            }
            
            .link-primary-button:hover {
                background-color: #1d4ed8;
                transform: translateY(-1px);
            }
            
            .link-primary-button:active {
                background-color: #1e40af;
                transform: translateY(0);
            }

/* Modal Fixes */
#linkModal .bg-white {
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}

#linkModal .overflow-y-auto {
    max-height: calc(90vh - 140px); /* Subtract header and footer height */
}

/* Ensure modal is properly positioned */
#linkModal .flex.items-start {
    padding-top: 2rem;
    padding-bottom: 2rem;
}
            /* Utility Classes */
            .line-clamp-3 {
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            /* Sidebar Collapsed State */
            body.sidebar-collapsed .links-main-container {
                margin-left: 2rem;
            }
            
            /* Override any conflicting Tailwind classes */
            #linksContainer.links-grid {
                display: grid !important;
            }
        `;
        document.head.appendChild(style);
    },

    setupSidebarObserver() {
        const mainContainer = document.querySelector('.links-main-container');
        if (!mainContainer) return;

        const updateLayout = () => {
            const isCollapsed = document.body.classList.contains('sidebar-collapsed');
            mainContainer.style.marginLeft = isCollapsed ? '1rem' : '1rem';
        };

        const observer = new MutationObserver(updateLayout);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Initial update
        updateLayout();
        this.observer = observer;
    },

    async fetchCategories() {
        try {
            console.log('Fetching categories...');
            const response = await api.get('/api/links/categories');
            console.log('Categories response:', response);
            
            if (response.success && Array.isArray(response.data)) {
                this.categories = new Set([
                    'General', 
                    ...response.data.filter(category => category && category.trim())
                ]);
                console.log('Updated categories:', Array.from(this.categories));
            } else {
                console.warn('Invalid categories response:', response);
                this.categories = new Set(['General']);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            this.categories = new Set(['General']);
        } finally {
            this.updateCategorySelect();
        }
    },

    updateCategorySelect() {
        const selects = ['linkCategory', 'categoryFilter'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) {
                console.warn(`${selectId} element not found`);
                return;
            }
        
            const currentValue = select.value;
            const isFilter = selectId === 'categoryFilter';
            
            select.innerHTML = '';
            
            // Add "All Categories" option for filter
            if (isFilter) {
                const allOption = document.createElement('option');
                allOption.value = 'All';
                allOption.textContent = 'All Categories';
                select.appendChild(allOption);
            }
        
            // Sort categories with 'General' first, then alphabetically
            const sortedCategories = Array.from(this.categories)
                .filter(Boolean)
                .sort((a, b) => {
                    if (a === 'General') return -1;
                    if (b === 'General') return 1;
                    return a.localeCompare(b);
                });
        
            sortedCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });
        
            // Restore selection if valid
            if (currentValue && (isFilter ? (currentValue === 'All' || this.categories.has(currentValue)) : this.categories.has(currentValue))) {
                select.value = currentValue;
            }
        });
    },

    attachEventListeners() {
        // Add Link buttons
        const addLinkBtn = document.getElementById('addLinkBtn');
        const addFirstLinkBtn = document.getElementById('addFirstLinkBtn');
        
        [addLinkBtn, addFirstLinkBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.openAddModal());
            }
        });

        // Search functionality
        const searchInput = document.getElementById('linkSearchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                if (clearSearch) {
                    clearSearch.classList.toggle('hidden', this.searchTerm.trim() === '');
                }
                this.filterAndRenderLinks();
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.searchTerm = '';
                clearSearch.classList.add('hidden');
                this.filterAndRenderLinks();
            });
        }

        // Category filter
       const categoryFilter = document.getElementById('categoryFilter');
if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
        this.currentCategory = e.target.value;
        // Clear search when changing category to avoid confusion
        this.searchTerm = '';
        const searchInput = document.getElementById('linkSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        const clearSearch = document.getElementById('clearSearch');
        if (clearSearch) {
            clearSearch.classList.add('hidden');
        }
        this.filterAndRenderLinks();
    });
}

        // Form submission
        const linkForm = document.getElementById('addLinkForm');
        if (linkForm) {
            linkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit(e);
            });
        }

        // Modal controls
        const closeModalBtn = document.getElementById('closeLinkModal');
        const cancelBtn = document.getElementById('cancelBtn');
        
        [closeModalBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideModal());
            }
        });

        // New category button
        const newCategoryBtn = document.getElementById('newCategoryBtn');
        if (newCategoryBtn) {
            newCategoryBtn.addEventListener('click', () => this.handleNewCategory());
        }

        // Quick action buttons
        const testLinkBtn = document.getElementById('testLinkBtn');
        const copyUrlBtn = document.getElementById('copyUrlBtn');

        if (testLinkBtn) {
            testLinkBtn.addEventListener('click', () => this.testLink());
        }

        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', () => this.copyUrl());
        }

        // Links container event delegation
        const linksContainer = document.getElementById('linksContainer');
        if (linksContainer) {
            linksContainer.addEventListener('click', async (e) => {
                const target = e.target.closest('button, a');
                if (!target) return;

                e.preventDefault();
                e.stopPropagation();

                const linkId = target.getAttribute('data-link-id');
                const url = target.getAttribute('data-url');
                
                if (target.classList.contains('edit-button') && linkId) {
                    await this.editLink(linkId);
                } else if (target.classList.contains('delete-button') && linkId) {
                    await this.deleteLink(linkId);
                } else if (target.classList.contains('copy-link') && url) {
                    await this.copyToClipboard(url);
                } else if (target.classList.contains('open-link') && url) {
                    await this.openLink(url);
                }
            });
        }
    },

    openAddModal() {
        const form = document.getElementById('addLinkForm');
        const modal = document.getElementById('linkModal');
        const modalTitle = document.getElementById('modalTitle');
        
        if (form) {
            form.reset();
            form.removeAttribute('data-edit-id');
        }
        
        if (modalTitle) {
            modalTitle.textContent = 'Add New Link';
        }
        
        this.showModal();
    },

    async showModal() {
        const modal = document.getElementById('linkModal');
        if (modal) {
            await this.fetchCategories();
            modal.classList.remove('hidden');
            
            // Focus on first input
            const firstInput = document.getElementById('linkName');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    },

    hideModal() {
        const modal = document.getElementById('linkModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    async testLink() {
        const urlInput = document.getElementById('linkUrl');
        if (!urlInput || !urlInput.value.trim()) {
            ui.showError('Please enter a URL first');
            return;
        }
        
        try {
            await this.openLink(urlInput.value.trim());
        } catch (error) {
            ui.showError('Failed to test link');
        }
    },

    async copyUrl() {
        const urlInput = document.getElementById('linkUrl');
        if (!urlInput || !urlInput.value.trim()) {
            ui.showError('Please enter a URL first');
            return;
        }
        
        await this.copyToClipboard(urlInput.value.trim());
    },

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            ui.showSuccess('Copied to clipboard');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            ui.showError('Failed to copy to clipboard');
        }
    },

    async openLink(url) {
        try {
            url = decodeURIComponent(url);
            console.log('Opening URL:', url);
    
            // Handle different URL types
            if (url.startsWith('\\\\') || url.startsWith('//') || /^[a-zA-Z]:[\\\/]/i.test(url)) {
                // Local/network path
                try {
                    const cleanPath = url.replace(/\\/g, '/');
                    if (url.startsWith('\\\\')) {
                        window.location.href = `file:${cleanPath}`;
                    } else {
                        window.location.href = `file:///${cleanPath}`;
                    }
                    
                    setTimeout(() => {
                        ui.showSuccess('If the file didn\'t open, the path has been copied to clipboard');
                        this.copyToClipboard(url);
                    }, 1000);
                } catch (error) {
                    await this.copyToClipboard(url);
                    ui.showSuccess('Path copied to clipboard');
                }
                return;
            }
    
            // Web URLs
            if (/^[a-z]+:\/\//i.test(url)) {
                window.open(url, '_blank');
                return;
            }
    
            // Add http:// if no protocol
            window.open(`http://${url}`, '_blank');
            
        } catch (error) {
            console.error('Error opening link:', error);
            ui.showError('Failed to open link');
        }
    },

    async handleNewCategory() {
        try {
            const categoryName = prompt('Enter new category name:');
            if (!categoryName?.trim()) return false;

            const newCategory = categoryName.trim();
            
            if (this.categories.has(newCategory)) {
                ui.showSuccess('Category already exists');
                const select = document.getElementById('linkCategory');
                if (select) select.value = newCategory;
                return true;
            }
            
            ui.showLoading();
            const response = await api.post('/api/links/categories', { 
                category: newCategory 
            });
            
            if (response.success) {
                this.categories.add(newCategory);
                this.updateCategorySelect();
                
                const select = document.getElementById('linkCategory');
                if (select) select.value = newCategory;
                
                ui.showSuccess('Category added successfully');
                return true;
            } else {
                ui.showError('Failed to add category');
                return false;
            }
        } catch (error) {
            console.error('Error handling new category:', error);
            ui.showError('Failed to add category');
            return false;
        } finally {
            ui.hideLoading();
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isSubmitting) return;
        this.isSubmitting = true;
    
        try {
            ui.showLoading();
            const form = e.target;
            const linkId = form.getAttribute('data-edit-id');
            
            const linkData = {
                name: form.querySelector('#linkName').value.trim(),
                url: form.querySelector('#linkUrl').value.trim(),
                description: form.querySelector('#linkDescription').value.trim(),
                category: form.querySelector('#linkCategory').value.trim() || 'General'
            };
    
            let response;
            if (linkId) {
                response = await api.put(`/api/links/${linkId}`, linkData);
            } else {
                response = await api.post('/api/links', linkData);
            }
    
            if (response.success) {
                ui.showSuccess(linkId ? 'Link updated successfully' : 'Link added successfully');
                this.hideModal();
                await this.loadLinks();
                form.removeAttribute('data-edit-id');
            } else {
                throw new Error(response.message || 'Failed to save link');
            }
        } catch (error) {
            console.error('Error saving link:', error);
            ui.showError(error.message || 'Error saving link');
        } finally {
            this.isSubmitting = false;
            ui.hideLoading();
        }
    },

    async editLink(linkId) {
        try {
            ui.showLoading();
            const response = await api.get(`/api/links/${linkId}`);
            
            if (!response.success || !response.data) {
                throw new Error('Failed to load link details');
            }
    
            const link = response.data;
            const form = document.getElementById('addLinkForm');
            const modal = document.getElementById('linkModal');
            const modalTitle = document.getElementById('modalTitle');
            
            // Update form fields
            document.getElementById('linkName').value = link.name || '';
            document.getElementById('linkUrl').value = link.url || '';
            document.getElementById('linkDescription').value = link.description || '';
            
            // Ensure category exists and set it
            const category = link.category || 'General';
            if (!this.categories.has(category)) {
                this.categories.add(category);
                this.updateCategorySelect();
            }
            document.getElementById('linkCategory').value = category;
    
            // Set form to edit mode
            form.setAttribute('data-edit-id', linkId);
            
            if (modalTitle) {
                modalTitle.textContent = 'Edit Link';
            }
    
            modal.classList.remove('hidden');
    
        } catch (error) {
            console.error('Error editing link:', error);
            ui.showError('Error loading link details');
        } finally {
            ui.hideLoading();
        }
    },

    async deleteLink(linkId) {
        if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) return;
        
        try {
            ui.showLoading();
            const response = await api.delete(`/api/links/${linkId}`);
            
            if (response.success) {
                ui.showSuccess('Link deleted successfully');
                await this.loadLinks();
            } else {
                ui.showError(response.message || 'Failed to delete link');
            }
        } catch (error) {
            console.error('Error deleting link:', error);
            ui.showError('Error deleting link');
        } finally {
            ui.hideLoading();
        }
    },

    async loadLinks() {
        try {
            ui.showLoading();
            const response = await api.get('/api/links');
            
            if (response.success) {
                this.allLinks = response.data || [];
                this.updateLinkCount();
                this.filterAndRenderLinks();
            } else {
                ui.showError('Failed to load links');
            }
        } catch (error) {
            console.error('Error loading links:', error);
            ui.showError('Error loading links');
        } finally {
            ui.hideLoading();
        }
    },

    updateLinkCount() {
        const linkCount = document.getElementById('linkCount');
        if (linkCount) {
            linkCount.textContent = this.allLinks.length;
        }
    },

    filterAndRenderLinks() {
        let filteredLinks = this.allLinks;

        // Apply category filter
        if (this.currentCategory && this.currentCategory !== 'All') {
            filteredLinks = filteredLinks.filter(link => 
                (link.category || 'General') === this.currentCategory
            );
        }

        // Apply search filter
        if (this.searchTerm.trim()) {
            const searchLower = this.searchTerm.toLowerCase();
            filteredLinks = filteredLinks.filter(link => 
                link.name.toLowerCase().includes(searchLower) ||
                link.url.toLowerCase().includes(searchLower) ||
                (link.description && link.description.toLowerCase().includes(searchLower))
            );
        }

        this.renderLinks(filteredLinks);
    },

    renderLinks(links) {
        const linksContainer = document.getElementById('linksContainer');
        const noLinksMessage = document.getElementById('noLinksMessage');
        const emptyStateMessage = document.getElementById('emptyStateMessage');

        if (!linksContainer || !noLinksMessage) return;

        if (links.length === 0) {
            linksContainer.innerHTML = '';
            noLinksMessage.classList.remove('hidden');
            
            // Update empty state message based on filters
            if (emptyStateMessage) {
                if (this.searchTerm.trim()) {
                    emptyStateMessage.textContent = `No links found matching "${this.searchTerm}".`;
                } else if (this.currentCategory && this.currentCategory !== 'All') {
                    emptyStateMessage.textContent = `No links found in "${this.currentCategory}" category.`;
                } else {
                    emptyStateMessage.textContent = 'Start by adding your first quick link to get organized.';
                }
            }
            return;
        }

        noLinksMessage.classList.add('hidden');
        linksContainer.innerHTML = links.map(link => this.renderLinkCard(link)).join('');
    },

    renderLinkCard(link) {
        const userData = auth.user.get();
        const canEdit = userData?.user?.role === 'admin' || 
                       userData?.user?.role === 'super' || 
                       link.author === userData?.user?._id;

        const isLocalPath = link.url.startsWith('\\\\') || 
                           link.url.startsWith('//') || 
                           /^[a-zA-Z]:[\\\/]/i.test(link.url);
        
        const isEmail = link.url.startsWith('mailto:');
        const iconName = this.getLinkIcon(link.url);
        const categoryColor = this.getCategoryColor(link.category || 'General');

        return `
            <div class="link-card group" data-link-id="${link._id}">
                
                <!-- Card Header -->
                <div class="p-6">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                            <div class="p-2 ${categoryColor.bg} rounded-lg flex-shrink-0">
                                <span class="material-icons-outlined ${categoryColor.text} text-lg">${iconName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                    ${this.escapeHtml(link.name)}
                                </h3>
                                <div class="flex items-center mt-1">
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categoryColor.bg} ${categoryColor.text}">
                                        ${this.escapeHtml(link.category || 'General')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Quick Actions -->
                        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            ${isLocalPath ? `
                                <button class="copy-link p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        data-url="${this.escapeHtml(link.url)}"
                                        title="Copy path">
                                    <span class="material-icons-outlined text-sm">content_copy</span>
                                </button>
                            ` : `
                                <button class="open-link p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"
                                        data-url="${this.escapeHtml(link.url)}"
                                        title="Open link">
                                    <span class="material-icons-outlined text-sm">open_in_new</span>
                                </button>
                            `}
                            
                            ${canEdit ? `
                                <button class="edit-button p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        data-link-id="${link._id}"
                                        title="Edit link">
                                    <span class="material-icons-outlined text-sm">edit</span>
                                </button>
                                <button class="delete-button p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        data-link-id="${link._id}"
                                        title="Delete link">
                                    <span class="material-icons-outlined text-sm">delete</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Enhanced URL Display -->
                    <div class="link-url-container">
                        <div class="flex items-center justify-between">
                            <div class="flex-1 min-w-0">
                                <div class="link-url-label">
                                    <span class="material-icons-outlined text-xs">${isEmail ? 'email' : 'link'}</span>
                                    ${isEmail ? 'Email Address' : isLocalPath ? 'File Path' : 'Web URL'}
                                </div>
                                <div class="link-url-text">
                                    ${this.escapeHtml(this.truncateUrl(link.url, 60))}
                                </div>
                            </div>
                            <button class="copy-link flex-shrink-0 ml-3 p-2 text-blue-600 hover:text-blue-800 hover:bg-white/70 rounded-lg transition-all duration-200"
                                    data-url="${this.escapeHtml(link.url)}"
                                    title="Copy URL">
                                <span class="material-icons-outlined text-sm">content_copy</span>
                            </button>
                        </div>
                    </div>

                    <!-- Description -->
                    ${link.description ? `
                        <div class="mb-4">
                            <p class="text-gray-600 text-sm leading-relaxed line-clamp-3">
                                ${this.escapeHtml(link.description)}
                            </p>
                        </div>
                    ` : ''}
                </div>

                <!-- Card Footer -->
                <div class="link-card-footer">
                    <div class="flex items-center text-xs text-gray-500">
                        <span class="material-icons-outlined text-sm mr-1">schedule</span>
                        <span class="font-medium">
                            ${new Date(link.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                            })}
                        </span>
                    </div>
                    
                    <!-- Primary Action Button -->
                    <div class="flex-shrink-0">
                        ${isLocalPath ? `
                            <button class="copy-link link-primary-button"
                                    data-url="${this.escapeHtml(link.url)}">
                                <span class="material-icons-outlined text-sm mr-2">content_copy</span>
                                Copy Path
                            </button>
                        ` : `
                            <button class="open-link link-primary-button"
                                    data-url="${this.escapeHtml(link.url)}">
                                <span class="material-icons-outlined text-sm mr-2">open_in_new</span>
                                ${isEmail ? 'Send Email' : 'Open Link'}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    },

    getLinkIcon(url) {
        const urlLower = url.toLowerCase();
        
        if (urlLower.startsWith('mailto:')) return 'email';
        if (urlLower.includes('github.com')) return 'code';
        if (urlLower.includes('drive.google.com') || urlLower.includes('dropbox.com')) return 'cloud';
        if (urlLower.includes('youtube.com') || urlLower.includes('video')) return 'play_circle';
        if (urlLower.includes('docs.google.com') || urlLower.includes('office.com')) return 'description';
        if (urlLower.startsWith('\\\\') || urlLower.match(/^[a-z]:[\\\/]/i)) return 'folder';
        if (urlLower.includes('calendar') || urlLower.includes('meet')) return 'event';
        if (urlLower.includes('slack.com') || urlLower.includes('teams.microsoft.com')) return 'chat';
        
        return 'link';
    },

    getCategoryColor(category) {
        const colors = {
            'General': { bg: 'bg-gray-100', text: 'text-gray-600' },
            'Development': { bg: 'bg-blue-100', text: 'text-blue-600' },
            'Documentation': { bg: 'bg-green-100', text: 'text-green-600' },
            'Tools': { bg: 'bg-purple-100', text: 'text-purple-600' },
            'Resources': { bg: 'bg-yellow-100', text: 'text-yellow-600' },
            'Communication': { bg: 'bg-pink-100', text: 'text-pink-600' },
            'Files': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
            'Admin': { bg: 'bg-red-100', text: 'text-red-600' }
        };
        
        return colors[category] || colors['General'];
    },

    truncateUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        
        const start = url.substring(0, Math.floor(maxLength / 2));
        const end = url.substring(url.length - Math.floor(maxLength / 2));
        return `${start}...${end}`;
    },

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Make linkManagement available globally
window.linkManagement = linkManagement;