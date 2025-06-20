// frontend/src/js/phonedirectory/phoneDirectoryCreate.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const phoneDirectoryCreate = {
    initialized: false,

    async initialize() {
        if (this.initialized) return;

        const container = document.getElementById('phoneDirectoryCreateForm');
        if (!container) {
            console.error('Phone directory create form container not found');
            return;
        }

        container.innerHTML = `
            <div class="max-w-3xl mx-auto px-4 py-8">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex items-center mb-6">
                        <span class="material-icons-outlined text-yellow-500 text-3xl mr-2">add_call</span>
                        <h2 class="text-2xl font-bold">Add Directory Entry</h2>
                    </div>

                    <form id="createDirectoryForm" class="space-y-6">
                        <!-- Basic Information -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Name *</label>
                                <input type="text" 
                                       id="entryName" 
                                       required
                                       class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                              focus:ring-yellow-500 focus:border-yellow-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700">Department</label>
                                <input type="text" 
                                       id="entryDepartment"
                                       class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                              focus:ring-yellow-500 focus:border-yellow-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700">Position</label>
                                <input type="text" 
                                       id="entryPosition"
                                       class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                              focus:ring-yellow-500 focus:border-yellow-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700">Category *</label>
                                <select id="entryCategory" 
                                        required
                                        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                               focus:ring-yellow-500 focus:border-yellow-500">
                                    <option value="">Select Category</option>
                                    <option value="Internal">Internal</option>
                                    <option value="External">External</option>
                                    <option value="Vendor">Vendor</option>
                                    <option value="Emergency">Emergency</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <!-- Phone Numbers Section -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Phone Numbers *</label>
                            <div id="phoneNumbersContainer" class="space-y-3">
                                <!-- Initial phone number entry -->
                                <div class="phone-entry flex items-center gap-2">
                                    <select class="phone-type w-32 border border-gray-300 rounded-md shadow-sm p-2
                                                 focus:ring-yellow-500 focus:border-yellow-500">
                                        <option value="office">Office</option>
                                        <option value="mobile">Mobile</option>
                                        <option value="home">Home</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <input type="tel" 
                                           class="phone-number flex-1 border border-gray-300 rounded-md shadow-sm p-2
                                                  focus:ring-yellow-500 focus:border-yellow-500"
                                           placeholder="Phone number">
                                    <input type="text" 
                                           class="phone-ext w-24 border border-gray-300 rounded-md shadow-sm p-2
                                                  focus:ring-yellow-500 focus:border-yellow-500"
                                           placeholder="Ext.">
                                    <button type="button" 
                                            class="remove-phone p-2 text-red-600 hover:bg-red-50 rounded-full"
                                            title="Remove number">
                                        <span class="material-icons-outlined">remove_circle_outline</span>
                                    </button>
                                </div>
                            </div>
                            <button type="button" 
                                    id="addPhoneBtn"
                                    class="mt-2 flex items-center text-sm text-yellow-600 hover:text-yellow-700">
                                <span class="material-icons-outlined mr-1">add_circle_outline</span>
                                Add another phone number
                            </button>
                        </div>

                        <!-- Email -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" 
                                   id="entryEmail"
                                   class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                          focus:ring-yellow-500 focus:border-yellow-500">
                        </div>

                        <!-- Notes -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea id="entryNotes"
                                    rows="3"
                                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                           focus:ring-yellow-500 focus:border-yellow-500"></textarea>
                        </div>

                        <div id="createEntryError" class="text-red-600 hidden"></div>

                        <!-- Form Buttons -->
                        <div class="flex justify-end gap-2">
                            <button type="button" 
                                    id="cancelCreateEntry"
                                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                Cancel
                            </button>
                            <button type="submit"
                                    class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                                Create Entry
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.initialized = true;
    },

    // Continuing phoneDirectoryCreate.js...

    setupEventListeners() {
        const form = document.getElementById('createDirectoryForm');
        const addPhoneBtn = document.getElementById('addPhoneBtn');
        const cancelBtn = document.getElementById('cancelCreateEntry');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubmit();
            });
        }

        if (addPhoneBtn) {
            addPhoneBtn.addEventListener('click', () => this.addPhoneNumberEntry());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                    window.location.hash = '#phone-directory';
                }
            });
        }

        // Setup initial remove phone button handler
        this.setupRemovePhoneHandlers();
    },

    setupRemovePhoneHandlers() {
        document.querySelectorAll('.remove-phone').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.phone-entry').remove();
            });
        });
    },

    addPhoneNumberEntry() {
        const container = document.getElementById('phoneNumbersContainer');
        if (!container) return;

        const newEntry = document.createElement('div');
        newEntry.className = 'phone-entry flex items-center gap-2';
        newEntry.innerHTML = `
            <select class="phone-type w-32 border border-gray-300 rounded-md shadow-sm p-2
                         focus:ring-yellow-500 focus:border-yellow-500">
                <option value="office">Office</option>
                <option value="mobile">Mobile</option>
                <option value="home">Home</option>
                <option value="other">Other</option>
            </select>
            <input type="tel" 
                   class="phone-number flex-1 border border-gray-300 rounded-md shadow-sm p-2
                          focus:ring-yellow-500 focus:border-yellow-500"
                   placeholder="Phone number">
            <input type="text" 
                   class="phone-ext w-24 border border-gray-300 rounded-md shadow-sm p-2
                          focus:ring-yellow-500 focus:border-yellow-500"
                   placeholder="Ext.">
            <button type="button" 
                    class="remove-phone p-2 text-red-600 hover:bg-red-50 rounded-full"
                    title="Remove number">
                <span class="material-icons-outlined">remove_circle_outline</span>
            </button>
        `;

        container.appendChild(newEntry);
        this.setupRemovePhoneHandlers();
    },

    validateForm() {
        const name = document.getElementById('entryName').value.trim();
        const category = document.getElementById('entryCategory').value;
        const phoneEntries = document.querySelectorAll('.phone-entry');
        const email = document.getElementById('entryEmail').value.trim();
    
        if (!name) {
            ui.showError('Name is required');
            return false;
        }
    
        if (!category) {
            ui.showError('Category is required');
            return false;
        }
    
        const phoneNumbers = [];
        phoneEntries.forEach(entry => {
            const number = entry.querySelector('.phone-number').value.trim();
            const extension = entry.querySelector('.phone-ext').value.trim();
            // Include phone entry if either number or extension exists
            if (number || extension) {
                phoneNumbers.push({
                    type: entry.querySelector('.phone-type').value,
                    number: number,
                    extension: extension
                });
            }
        });
    
        if (email && !this.validateEmail(email)) {
            ui.showError('Invalid email format');
            return false;
        }
    
        return {
            name,
            department: document.getElementById('entryDepartment').value.trim(),
            position: document.getElementById('entryPosition').value.trim(),
            category,
            phoneNumbers,
            email,
            notes: document.getElementById('entryNotes').value.trim()
        };
    },

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    async handleSubmit() {
        try {
            const formData = this.validateForm();
            if (!formData) return;

            ui.showLoading();
            const response = await api.post('/api/phone-directory', formData);

            if (response.success) {
                ui.showSuccess('Directory entry created successfully');
                window.location.hash = '#phone-directory';
            } else {
                ui.showError(response.message || 'Failed to create directory entry');
            }
        } catch (error) {
            console.error('Error creating directory entry:', error);
            ui.showError('Error creating directory entry');
        } finally {
            ui.hideLoading();
        }
    },

    cleanup() {
        this.initialized = false;
        // Clear any form data or state if needed
        const container = document.getElementById('phoneDirectoryCreateForm');
        if (container) {
            container.innerHTML = '';
        }
    }
};