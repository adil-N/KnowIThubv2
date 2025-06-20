// frontend/src/js/phonedirectory/phoneDirectoryList.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';

export const phoneDirectoryList = {
    currentPage: 1,
    entriesPerPage: 50,
    initialized: false,
    entries: [],
    selectedEntryId: null,
    allDepartments: [], // New property to store all departments
    allCategories: [], // New property to store all categories

    // Add resetState function to fix the error
    resetState() {
        console.log('Resetting phone directory state');
        this.currentPage = 1;
        this.initialized = false;
        this.entries = [];
        this.selectedEntryId = null;
        // Keep allDepartments and allCategories to preserve dropdown options
    },

    async initialize() {
        console.log('=== Initializing Phone Directory List ===');
        
        try {
            // If already initialized and container exists, just reload entries
            if (this.initialized && document.getElementById('directoryList')) {
                console.log('Directory already initialized, reloading entries');
                await this.loadEntries();
                return true;
            }
    
            // Reset initialization state
            this.initialized = false;
    
            // Find the main container
            const container = document.getElementById('phoneDirectorySection');
            if (!container) {
                console.error('Phone directory section not found');
                return false;
            }
    
            console.log('Setting up initial HTML structure');
            container.innerHTML = `
                <div class="container mx-auto py-8">
                    <!-- Header -->
                    <div class="flex justify-between items-center mb-6">
                        <div class="flex items-center">
                            <span class="material-icons-outlined text-yellow-500 text-3xl mr-2">phone_book</span>
                            <h1 class="text-2xl font-bold">Phone Directory</h1>
                        </div>
                        <div class="flex gap-2">
                            
                            <button id="addEntryBtn" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition duration-300 flex items-center">
                                <span class="material-icons-outlined mr-2">add</span>
                                Add Entry
                            </button>
                        </div>
                    </div>
    
                    <!-- Search and Filter Section -->
                    <div class="bg-yellow-50 p-4 rounded-lg mb-6 shadow-sm">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <input type="text" 
                                    id="directorySearch" 
                                    placeholder="Search name, department, or phone..." 
                                    class="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400">
                            </div>
                            <div>
                                <select id="departmentFilter" 
                                        class="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400">
                                    <option value="">All Departments</option>
                                </select>
                            </div>
                            <div>
                                <select id="categoryFilter" 
                                        class="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400">
                                    <option value="">All Categories</option>
                                </select>
                            </div>
                        </div>
                    </div>
    
                    <!-- Directory List -->
                    <div class="bg-white rounded-lg shadow-md">
                        <div id="directoryList" class="divide-y divide-yellow-100">
                            <div class="p-8 text-center text-gray-500">
                                Loading entries...
                            </div>
                        </div>
                    </div>
                </div>
            `;
    
            // Verify the list container was created
            const listContainer = document.getElementById('directoryList');
            if (!listContainer) {
                console.error('Directory list container not created');
                return false;
            }
    
            // Setup event listeners
            console.log('Setting up event listeners');
            this.setupEventListeners();
            
            // Load initial data
            console.log('Loading initial data');
            await this.loadEntries();
            
            // Mark as initialized
            this.initialized = true;
            console.log('Phone directory initialization complete');
            
            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            ui.showError('Failed to initialize phone directory');
            return false;
        }
    },

    setupEventListeners() {
        // Search input handler
        const searchInput = document.getElementById('directorySearch');
        if (searchInput) {
            searchInput.addEventListener('input', _.debounce(() => {
                this.loadEntries();
            }, 300));
        }

        // Filter handlers
        ['departmentFilter', 'categoryFilter'].forEach(id => {
            const filter = document.getElementById(id);
            if (filter) {
                filter.addEventListener('change', () => {
                    console.log(`Filter changed: ${id} ->`, filter.value); // Debugging
                    this.loadEntries();
                });
            }
        });

        // Add entry button
        const addEntryBtn = document.getElementById('addEntryBtn');
        if (addEntryBtn) {
            addEntryBtn.addEventListener('click', () => {
                window.location.hash = '#create-directory-entry';
            });
        }
    },

    async loadEntries() {
        try {
            ui.showLoading();
            const searchQuery = document.getElementById('directorySearch')?.value || '';
            const department = document.getElementById('departmentFilter')?.value || '';
            const category = document.getElementById('categoryFilter')?.value || '';
            console.log("Filtering by department:", department); // Debugging

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.entriesPerPage,
                search: searchQuery,
                department,
                category
            });
    
            const response = await api.get(`/api/phone-directory?${params}`);
    
            if (response.success) {
                this.entries = response.data;
                this.renderEntries(response.data);
                
                // On first load, store all departments and categories
                if (this.allDepartments.length === 0 && !department && !category && !searchQuery) {
                    this.allDepartments = [...new Set(this.entries.map(entry => entry.department).filter(Boolean))];
                    this.allCategories = [...new Set(this.entries.map(entry => entry.category).filter(Boolean))];
                }
                
                // Update filters with all available options
                await this.loadFilters();
            } else {
                ui.showError('Failed to load directory entries');
            }
        } catch (error) {
            console.error('Error loading entries:', error);
            ui.showError('Error loading directory entries');
        } finally {
            ui.hideLoading();
        }
    },

    async loadFilters() {
        try {
            // Get current filter values
            const departmentSelect = document.getElementById('departmentFilter');
            const categorySelect = document.getElementById('categoryFilter');
            
            // Store current selections
            const currentDepartment = departmentSelect?.value || '';
            const currentCategory = categorySelect?.value || '';
            
            // Populate department filter
            if (departmentSelect) {
                // Clear existing options except the first "All Departments"
                while (departmentSelect.options.length > 1) {
                    departmentSelect.remove(1);
                }
    
                // Add all departments (not just from filtered entries)
                this.allDepartments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = this.escapeHtml(dept);
                    option.textContent = this.escapeHtml(dept);
                    // Set selected if it matches current department
                    if (currentDepartment === dept) {
                        option.selected = true;
                    }
                    departmentSelect.appendChild(option);
                });
                
                // Ensure the correct option is selected
                if (currentDepartment) {
                    departmentSelect.value = currentDepartment;
                }
            }
    
            // Populate category filter
            if (categorySelect) {
                // Clear existing options except the first "All Categories"
                while (categorySelect.options.length > 1) {
                    categorySelect.remove(1);
                }
    
                // Add all categories (not just from filtered entries)
                this.allCategories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = this.escapeHtml(cat);
                    option.textContent = this.escapeHtml(cat);
                    // Set selected if it matches current category
                    if (currentCategory === cat) {
                        option.selected = true;
                    }
                    categorySelect.appendChild(option);
                });
                
                // Ensure the correct option is selected
                if (currentCategory) {
                    categorySelect.value = currentCategory;
                }
            }
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    },

    renderEntries(entries) {
        const container = document.getElementById('directoryList');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    No directory entries found
                </div>
            `;
            return;
        }

        container.innerHTML = entries.map(entry => `
            <div class="contact-entry border-b border-gray-200 hover:bg-yellow-50/50 transition-all duration-200">
                <!-- Main Contact Info -->
                <div class="main-content p-4 cursor-pointer">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center">
                                <span class="material-icons-outlined text-yellow-500 mr-2">person</span>
                                <h3 class="font-medium text-gray-900">${this.escapeHtml(entry.name)}</h3>
                                ${entry.department ? `
                                    <span class="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                        ${this.escapeHtml(entry.department)}
                                    </span>
                                ` : ''}
                                <span class="material-icons-outlined text-gray-400 ml-2 text-sm transform transition-transform duration-200 details-indicator">
                                    expand_more
                                </span>
                            </div>
                            <div class="mt-1 text-sm text-gray-600">
                                ${entry.phoneNumbers[0] ? `
                                    <div class="flex items-center">
                                        <span class="material-icons-outlined text-gray-400 text-sm mr-1">
                                            ${entry.phoneNumbers[0].type === 'mobile' ? 'smartphone' : 'phone'}
                                        </span>
                                        ${this.escapeHtml(entry.phoneNumbers[0].number)}
                                        ${entry.phoneNumbers[0].extension ? ` ext. ${this.escapeHtml(entry.phoneNumbers[0].extension)}` : ''}
                                    </div>
                                ` : ''}
                                ${entry.email ? `
                                    <div class="flex items-center">
                                        <span class="material-icons-outlined text-gray-400 text-sm mr-1">email</span>
                                        ${this.escapeHtml(entry.email)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button class="edit-entry-btn p-2 text-gray-600 hover:bg-yellow-100 rounded-full"
                                    data-id="${entry.directoryId}">
                                <span class="material-icons-outlined">edit</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners to the newly created elements
        this.addEntryEventListeners();
    },

    // Rest of the code remains the same...
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    addEntryEventListeners() {
        // Add click handlers for edit buttons
        document.querySelectorAll('.edit-entry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (id) {
                    window.location.hash = `#edit-directory-entry/${id}`;
                }
            });
        });

        // Add click handlers for expanding/collapsing entries
        document.querySelectorAll('.main-content').forEach(header => {
            header.addEventListener('click', () => {
                const entry = header.closest('.contact-entry');
                const indicator = header.querySelector('.details-indicator');
                
                if (entry.classList.contains('expanded')) {
                    // Collapse
                    entry.classList.remove('expanded');
                    const details = entry.querySelector('.details-content');
                    if (details) {
                        details.style.maxHeight = '0';
                        setTimeout(() => {
                            details.remove();
                        }, 300);
                    }
                    if (indicator) {
                        indicator.style.transform = 'rotate(0deg)';
                    }
                } else {
                    // Expand
                    entry.classList.add('expanded');
                    if (indicator) {
                        indicator.style.transform = 'rotate(180deg)';
                    }
                    
                    // Find the entry data
                    const id = entry.querySelector('.edit-entry-btn')?.getAttribute('data-id');
                    const entryData = this.entries.find(e => e.directoryId === id);
                    
                    if (entryData) {
                        this.renderEntryDetails(entry, entryData);
                    }
                }
            });
        });
    },

    renderEntryDetails(entryElement, entryData) {
        // Create details container if it doesn't exist
        let detailsContent = entryElement.querySelector('.details-content');
        if (!detailsContent) {
            detailsContent = document.createElement('div');
            detailsContent.className = 'details-content overflow-hidden max-h-0 transition-all duration-300';
            entryElement.appendChild(detailsContent);
        }

        // Build details HTML
        let detailsHtml = `
            <div class="p-4 bg-gray-50">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Position -->
                    ${entryData.position ? `
                        <div>
                            <h4 class="text-xs font-medium text-gray-500 uppercase">Position</h4>
                            <p class="text-sm text-gray-700">${this.escapeHtml(entryData.position)}</p>
                        </div>
                    ` : ''}
                    
                    <!-- Category -->
                    ${entryData.category ? `
                        <div>
                            <h4 class="text-xs font-medium text-gray-500 uppercase">Category</h4>
                            <p class="text-sm text-gray-700">${this.escapeHtml(entryData.category)}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Additional Phone Numbers -->
                ${entryData.phoneNumbers.length > 1 ? `
                    <div class="mt-4">
                        <h4 class="text-xs font-medium text-gray-500 uppercase">Additional Phone Numbers</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                            ${entryData.phoneNumbers.slice(1).map(phone => `
                                <div class="flex items-center text-sm text-gray-700">
                                    <span class="material-icons-outlined text-gray-400 text-sm mr-1">
                                        ${phone.type === 'mobile' ? 'smartphone' : 'phone'}
                                    </span>
                                    <span class="font-medium mr-1">${this.escapeHtml(phone.type)}:</span>
                                    ${this.escapeHtml(phone.number)}
                                    ${phone.extension ? ` ext. ${this.escapeHtml(phone.extension)}` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Notes -->
                ${entryData.notes ? `
                    <div class="mt-4">
                        <h4 class="text-xs font-medium text-gray-500 uppercase">Notes</h4>
                        <p class="text-sm text-gray-700 whitespace-pre-line">${this.escapeHtml(entryData.notes)}</p>
                    </div>
                ` : ''}
            </div>
        `;

        detailsContent.innerHTML = detailsHtml;
        
        // Animate opening
        setTimeout(() => {
            detailsContent.style.maxHeight = detailsContent.scrollHeight + 'px';
        }, 10);
    }
};
