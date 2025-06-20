// frontend/src/js/phonedirectory/phoneDirectoryEdit.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';

export const phoneDirectoryEdit = {
    initialized: false,
    currentEntry: null,

    // In phoneDirectoryEdit.js, update the initialize method:
async initialize(directoryId) {
    if (!directoryId) {
        ui.showError('No directory entry specified');
        window.location.hash = '#phone-directory';
        return;
    }

    const container = document.getElementById('phoneDirectoryEditForm');
    if (!container) {
        console.error('Phone directory edit form container not found');
        return;
    }

    try {
        ui.showLoading();
        console.log('Fetching directory entry:', directoryId);
        const response = await api.get(`/api/phone-directory/${directoryId}`);

        if (!response.success) {
            throw new Error(response.message || 'Failed to load directory entry');
        }

        this.currentEntry = response.data;
        this.renderForm(container);
        this.setupEventListeners();
        this.initialized = true;
    } catch (error) {
        console.error('Error initializing edit form:', error);
        ui.showError(error.message || 'Error loading directory entry');
        window.location.hash = '#phone-directory';
    } finally {
        ui.hideLoading();
    }
},

    renderForm(container) {
        container.innerHTML = `
            <div class="max-w-3xl mx-auto px-4 py-8">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center">
                            <span class="material-icons-outlined text-yellow-500 text-3xl mr-2">edit_contacts</span>
                            <h2 class="text-2xl font-bold">Edit Directory Entry</h2>
                        </div>
                        ${this.canDelete() ? `
                            <button id="deleteEntryBtn" 
                                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 
                                           flex items-center gap-1">
                                <span class="material-icons-outlined">delete</span>
                                Delete Entry
                            </button>
                        ` : ''}
                    </div>

                    <form id="editDirectoryForm" class="space-y-6">
                        <!-- Basic Information -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Name *</label>
                                <input type="text" 
                                       id="entryName" 
                                       required
                                       value="${this.escapeHtml(this.currentEntry.name)}"
                                       class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                              focus:ring-yellow-500 focus:border-yellow-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700">Department</label>
                                <input type="text" 
                                       id="entryDepartment"
                                       value="${this.escapeHtml(this.currentEntry.department || '')}"
                                       class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                              focus:ring-yellow-500 focus:border-yellow-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700">Position</label>
                                <input type="text" 
                                       id="entryPosition"
                                       value="${this.escapeHtml(this.currentEntry.position || '')}"
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
                                    ${['Internal', 'External', 'Vendor', 'Emergency', 'Other']
                                        .map(cat => `
                                            <option value="${cat}" 
                                                    ${this.currentEntry.category === cat ? 'selected' : ''}>
                                                ${cat}
                                            </option>
                                        `).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- Phone Numbers Section -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Phone Numbers *</label>
                            <div id="phoneNumbersContainer" class="space-y-3">
                                ${this.currentEntry.phoneNumbers.map(phone => this.renderPhoneEntry(phone)).join('')}
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
                                   value="${this.escapeHtml(this.currentEntry.email || '')}"
                                   class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                          focus:ring-yellow-500 focus:border-yellow-500">
                        </div>

                        <!-- Notes -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea id="entryNotes"
                                    rows="3"
                                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                                           focus:ring-yellow-500 focus:border-yellow-500">${this.escapeHtml(this.currentEntry.notes || '')}</textarea>
                        </div>

                        <div id="editEntryError" class="text-red-600 hidden"></div>

                        <!-- Form Buttons -->
                        <div class="flex justify-end gap-2">
                            <button type="button" 
                                    id="cancelEditEntry"
                                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                Cancel
                            </button>
                            <button type="submit"
                                    class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

// Continuing phoneDirectoryEdit.js...

renderPhoneEntry(phone) {
    return `
        <div class="phone-entry flex items-center gap-2">
            <select class="phone-type w-32 border border-gray-300 rounded-md shadow-sm p-2
                         focus:ring-yellow-500 focus:border-yellow-500">
                ${['office', 'mobile', 'home', 'other'].map(type => `
                    <option value="${type}" ${phone.type === type ? 'selected' : ''}>
                        ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                `).join('')}
            </select>
            <input type="tel" 
                   class="phone-number flex-1 border border-gray-300 rounded-md shadow-sm p-2
                          focus:ring-yellow-500 focus:border-yellow-500"
                   placeholder="Phone number"
                   value="${this.escapeHtml(phone.number)}">
            <input type="text" 
                   class="phone-ext w-24 border border-gray-300 rounded-md shadow-sm p-2
                          focus:ring-yellow-500 focus:border-yellow-500"
                   placeholder="Ext."
                   value="${this.escapeHtml(phone.extension || '')}">
            <button type="button" 
                    class="remove-phone p-2 text-red-600 hover:bg-red-50 rounded-full"
                    title="Remove number">
                <span class="material-icons-outlined">remove_circle_outline</span>
            </button>
        </div>
    `;
},

addPhoneNumberEntry() {
    const container = document.getElementById('phoneNumbersContainer');
    if (!container) return;

    const emptyPhone = { type: 'office', number: '', extension: '' };
    const newEntryHtml = this.renderPhoneEntry(emptyPhone);
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newEntryHtml;
    const newEntry = tempDiv.firstElementChild;
    
    container.appendChild(newEntry);
    this.setupRemovePhoneHandlers();
},

setupEventListeners() {
    const form = document.getElementById('editDirectoryForm');
    const addPhoneBtn = document.getElementById('addPhoneBtn');
    const cancelBtn = document.getElementById('cancelEditEntry');
    const deleteBtn = document.getElementById('deleteEntryBtn');

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

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.handleDelete());
    }

    this.setupRemovePhoneHandlers();
},

setupRemovePhoneHandlers() {
    document.querySelectorAll('.remove-phone').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const phoneEntries = document.querySelectorAll('.phone-entry');
            if (phoneEntries.length > 1) {
                e.target.closest('.phone-entry').remove();
            } else {
                ui.showError('At least one phone number is required');
            }
        });
    });
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
    let hasValidContact = false;

    // Check phone entries
    phoneEntries.forEach(entry => {
        const number = entry.querySelector('.phone-number').value.trim();
        const extension = entry.querySelector('.phone-ext').value.trim();
        
        // If either number or extension is present, add to phoneNumbers
        if (number || extension) {
            phoneNumbers.push({
                type: entry.querySelector('.phone-type').value,
                number: number,
                extension: extension
            });
            hasValidContact = true;
        }
    });

    // Check if email is present as an alternative contact method
    if (!hasValidContact && !email) {
        ui.showError('Provide either a phone number, extension, or email');
        return false;
    }

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
        const response = await api.put(`/api/phone-directory/${this.currentEntry.directoryId}`, formData);

        if (response.success) {
            ui.showSuccess('Directory entry updated successfully');
            window.location.hash = '#phone-directory';
        } else {
            ui.showError(response.message || 'Failed to update directory entry');
        }
    } catch (error) {
        console.error('Error updating directory entry:', error);
        ui.showError('Error updating directory entry');
    } finally {
        ui.hideLoading();
    }
},

async handleDelete() {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
        return;
    }

    try {
        ui.showLoading();
        const response = await api.delete(`/api/phone-directory/${this.currentEntry.directoryId}`);

        if (response.success) {
            ui.showSuccess('Directory entry deleted successfully');
            window.location.hash = '#phone-directory';
        } else {
            ui.showError(response.message || 'Failed to delete directory entry');
        }
    } catch (error) {
        console.error('Error deleting directory entry:', error);
        ui.showError('Error deleting directory entry');
    } finally {
        ui.hideLoading();
    }
},

canDelete() {
    const userData = auth.user.get();
    return userData?.user?.role === 'admin' || userData?.user?.role === 'super';
},

escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
},

cleanup() {
    this.initialized = false;
    this.currentEntry = null;
    const container = document.getElementById('phoneDirectoryEditForm');
    if (container) {
        container.innerHTML = '';
    }
}
};