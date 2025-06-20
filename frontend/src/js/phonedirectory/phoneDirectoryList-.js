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

        // Import/Export handlers
        // const importBtn = document.getElementById('importExcelBtn');
        // const exportBtn = document.getElementById('exportExcelBtn');
        // const importModal = document.getElementById('importModal');
        // const importForm = document.getElementById('importForm');
        // const cancelImport = document.getElementById('cancelImport');

        // if (importBtn) {
        //     importBtn.addEventListener('click', () => {
        //         importModal.classList.remove('hidden');
        //     });
        // }

        // if (exportBtn) {
        //     exportBtn.addEventListener('click', () => this.handleExport());
        // }

        // if (cancelImport) {
        //     cancelImport.addEventListener('click', () => {
        //         importModal.classList.add('hidden');
        //     });
        // }

        // if (importForm) {
        //     importForm.addEventListener('submit', (e) => this.handleImport(e));
        // }

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
                
                // Ensure filters are loaded AFTER entries are set
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
            // Get unique departments and categories from entries
            const departments = [...new Set(this.entries.map(entry => entry.department).filter(Boolean))];
            const categories = [...new Set(this.entries.map(entry => entry.category).filter(Boolean))];
    
            // Populate department filter
            const departmentSelect = document.getElementById('departmentFilter');
            if (departmentSelect) {
                // Clear existing options except the first "All Departments"
                while (departmentSelect.options.length > 1) {
                    departmentSelect.remove(1);
                }
    
                // Add new departments
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = this.escapeHtml(dept);
                    option.textContent = this.escapeHtml(dept);
                    departmentSelect.appendChild(option);
                });
            }
    
            // Populate category filter
            const categorySelect = document.getElementById('categoryFilter');
            if (categorySelect) {
                // Clear existing options except the first "All Categories"
                while (categorySelect.options.length > 1) {
                    categorySelect.remove(1);
                }
    
                // Add new categories
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = this.escapeHtml(cat);
                    option.textContent = this.escapeHtml(cat);
                    categorySelect.appendChild(option);
                });
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
                        ${auth.user.get()?.user?.role === 'admin' || auth.user.get()?.user?.role === 'super' ? `
                            <button class="delete-entry-btn p-2 text-red-600 hover:bg-red-50 rounded-full"
                                    data-id="${entry.directoryId}">
                                <span class="material-icons-outlined">delete</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Contact Details Section (Hidden by default) -->
            <div class="contact-details hidden transition-all duration-300 ease-in-out">
                <div class="bg-white p-6 border-t border-gray-100">
                    <div class="max-w-2xl space-y-4">
                        ${entry.position ? `
                            <div class="flex items-center space-x-2">
                                <span class="material-icons-outlined text-gray-400">work</span>
                                <span class="text-gray-700">${this.escapeHtml(entry.position)}</span>
                            </div>
                        ` : ''}

                        <!-- All Phone Numbers -->
                        ${entry.phoneNumbers.length > 0 ? `
                            <div class="space-y-3">
                                <h5 class="text-sm font-medium text-gray-700 flex items-center">
                                    <span class="material-icons-outlined mr-2">contacts</span>
                                    All Contact Numbers
                                </h5>
                                ${entry.phoneNumbers.map(phone => `
                                    <div class="flex items-center space-x-2 ml-6 p-2 rounded-lg hover:bg-gray-50">
                                        <span class="material-icons-outlined text-gray-400">
                                            ${phone.type === 'mobile' ? 'smartphone' : 'phone'}
                                        </span>
                                        <div class="text-gray-600">
                                            <span class="text-xs uppercase text-gray-500">${this.escapeHtml(phone.type)}</span>
                                            <p class="font-medium">${this.escapeHtml(phone.number)} ${phone.extension ? `ext. ${this.escapeHtml(phone.extension)}` : ''}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <!-- Category -->
                        ${entry.category ? `
                            <div class="flex items-center space-x-2">
                                <span class="material-icons-outlined text-gray-400">label</span>
                                <span class="text-gray-600">${this.escapeHtml(entry.category)}</span>
                            </div>
                        ` : ''}

                        <!-- Notes -->
                        ${entry.notes ? `
                            <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                                <h5 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <span class="material-icons-outlined mr-2">notes</span>
                                    Notes
                                </h5>
                                <p class="text-sm text-gray-600 ml-6">${this.escapeHtml(entry.notes)}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners to edit and delete buttons
    this.setupEntryButtons();
    this.setupHoverEffects();
},
setupHoverEffects() {
    const contactEntries = document.querySelectorAll('.contact-entry');
    
    contactEntries.forEach(entry => {
        const mainContent = entry.querySelector('.main-content');
        const details = entry.querySelector('.contact-details');
        const indicator = entry.querySelector('.details-indicator');
        
        // Add hover events to the main content area
        entry.addEventListener('mouseenter', () => {
            if (details && indicator) {
                details.classList.remove('hidden');
                indicator.style.transform = 'rotate(180deg)';
                setTimeout(() => {
                    details.classList.add('opacity-100');
                    details.classList.remove('opacity-0');
                }, 200); // Increased delay for smooth appearance
            }
        });
        
        entry.addEventListener('mouseleave', () => {
            if (details && indicator) {
                details.classList.add('opacity-0');
                details.classList.remove('opacity-100');
                indicator.style.transform = 'rotate(0deg)';
                setTimeout(() => {
                    details.classList.add('hidden');
                }, 400); // Increased delay for smoother disappearance
            }
        });
        
    });
},


setupEntryButtons() {
    // Edit buttons
    document.querySelectorAll('.edit-entry-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            window.location.hash = `#edit-directory-entry/${id}`;
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-entry-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (await this.confirmDelete()) {
                this.deleteEntry(id);
            }
        });
    });
},

// async handleImport(e) {
//     e.preventDefault();
//     const fileInput = document.getElementById('excelFile');
//     const file = fileInput?.files[0];

//     if (!file) {
//         ui.showError('Please select a file to import');
//         return;
//     }

//     try {
//         ui.showLoading();
//         const formData = new FormData();
//         formData.append('file', file);

//         const response = await api.post('/api/phone-directory/import', formData, true);

//         if (response.success) {
//             ui.showSuccess(`Successfully imported ${response.data.imported} entries`);
//             document.getElementById('importModal').classList.add('hidden');
//             await this.loadEntries();
//         } else {
//             ui.showError('Import failed: ' + response.message);
//         }
//     } catch (error) {
//         console.error('Import error:', error);
//         ui.showError('Failed to import file');
//     } finally {
//         ui.hideLoading();
//     }
// },

// async handleExport() {
//     try {
//         ui.showLoading();
//         window.location.href = '/api/phone-directory/export/excel';
//         ui.showSuccess('Export started');
//     } catch (error) {
//         console.error('Export error:', error);
//         ui.showError('Failed to export directory');
//     } finally {
//         ui.hideLoading();
//     }
// },

async confirmDelete() {
    return new Promise(resolve => {
        if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            resolve(true);
        } else {
            resolve(false);
        }
    });
},

async deleteEntry(id) {
    try {
        ui.showLoading();
        const response = await api.delete(`/api/phone-directory/${id}`);

        if (response.success) {
            ui.showSuccess('Entry deleted successfully');
            await this.loadEntries();
        } else {
            ui.showError('Failed to delete entry');
        }
    } catch (error) {
        console.error('Delete error:', error);
        ui.showError('Error deleting entry');
    } finally {
        ui.hideLoading();
    }
},
resetState() {
    this.currentPage = 1;
    this.entries = [];
    this.selectedEntryId = null;
    this.initialized = false;

    // Clear DOM elements
    const container = document.getElementById('phoneDirectorySection');
    if (container) {
        container.innerHTML = '';
    }

    // Reset filters
    const searchInput = document.getElementById('directorySearch');
    const departmentFilter = document.getElementById('departmentFilter');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchInput) searchInput.value = '';
    if (departmentFilter) departmentFilter.selectedIndex = 0;
    if (categoryFilter) categoryFilter.selectedIndex = 0;
},

escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
};