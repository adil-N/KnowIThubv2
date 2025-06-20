// frontend/src/js/admin/sectionManagement.js 
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const sectionManagement = {
    currentSections: [],

    async show(container) {
        try {
            console.log('🔧 Loading sections for admin panel...');
            const token = localStorage.getItem('token');
            const response = await fetch('/api/sections', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Admin-Request': 'true'
                }
            });
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load sections');
            }

            const sections = data.data || [];
            this.currentSections = sections;
            
            container.innerHTML = `
                <div class="w-full">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">Section Management</h2>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center">
                                <input type="checkbox" id="showInactiveToggle" 
                                    class="mr-2 rounded border-gray-300 text-blue-600">
                                <span class="text-sm text-gray-600">Show Inactive Sections</span>
                            </label>
                            <button id="createSectionBtn" 
                                class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                                Create Section
                            </button>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto bg-white rounded-lg shadow">
                        <table class="min-w-full bg-white">
                           <thead class="bg-gray-50">
                            <tr>
                                <th class="border px-4 py-2 text-left">Name</th>
                                <th class="border px-4 py-2 text-left">Description</th>
                                <th class="border px-4 py-2 text-left">Parent Section</th>
                                <th class="border px-4 py-2 text-left">Order</th>
                                <th class="border px-4 py-2 text-center" width="100">Reorder</th>
                                <th class="border px-4 py-2 text-left">Status</th>
                                <th class="border px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                            <tbody id="sectionsTableBody">
                                ${this.renderSectionsTable(this.currentSections, false)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            this.removeAllEventListeners();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error loading sections:', error);
            ui.showError('Failed to load sections');
        }
    },

    removeAllEventListeners() {
        document.removeEventListener('click', this.globalClickHandler);
    },

    renderSectionsTable(sections, showInactive = false) {
        const filteredSections = showInactive 
            ? sections 
            : sections.filter(section => section.isActive);
            
        return filteredSections.map(section => this.renderSectionRow(section)).join('');
    },

    renderSectionRow(section) {
        const rowClass = section.isActive 
            ? '' 
            : 'bg-gray-100 opacity-75 border-l-4 border-red-400';
            
        return `
            <tr data-section-id="${section._id}" class="${rowClass}">
                <td class="border px-4 py-2">
                    ${section.name}
                    ${!section.isActive ? '<span class="text-xs text-red-600 ml-2">(INACTIVE)</span>' : ''}
                </td>
                <td class="border px-4 py-2">${section.description || '-'}</td>
                <td class="border px-4 py-2">${section.parentSection?.name || '-'}</td>
                <td class="border px-4 py-2">${section.order}</td>
                <td class="border px-4 py-2 text-center">
                    <div class="flex justify-center space-x-1">
                        <button class="section-move-up px-2 py-1 text-gray-600 hover:text-gray-900 bg-gray-100 rounded hover:bg-gray-200" 
                            data-section-id="${section._id}" data-action="move-up">↑</button>
                        <button class="section-move-down px-2 py-1 text-gray-600 hover:text-gray-900 bg-gray-100 rounded hover:bg-gray-200" 
                            data-section-id="${section._id}" data-action="move-down">↓</button>
                    </div>
                </td>
                <td class="border px-4 py-2">
                    <button 
                        class="section-status-toggle w-full px-2 py-1 rounded text-center ${section.isActive ? 
                            'bg-green-100 text-green-800 hover:bg-green-200' : 
                            'bg-red-100 text-red-800 hover:bg-red-200'}"
                        data-section-id="${section._id}" 
                        data-section-name="${section.name}"
                        data-current-status="${section.isActive}"
                        data-action="toggle-status"
                        type="button">
                        ${section.isActive ? 'Active' : 'Inactive'}
                    </button>
                </td>
                <td class="border px-4 py-2">
                    <button 
                        class="section-edit-btn bg-blue-500 text-white px-2 py-1 rounded mr-2 hover:bg-blue-600"
                        data-section-id="${section._id}"
                        data-action="edit"
                        type="button">
                        Edit
                    </button>
                    <button 
                        class="section-delete-btn bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        data-section-id="${section._id}"
                        data-section-name="${section.name}"
                        data-action="delete"
                        type="button">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    },

    globalClickHandler: null,

    attachEventListeners() {
        console.log('🔧 Attaching section management event listeners...');

        const createBtn = document.getElementById('createSectionBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                console.log('✅ Create button clicked');
                this.showSectionModal();
            });
        }

        const showInactiveToggle = document.getElementById('showInactiveToggle');
        if (showInactiveToggle) {
            showInactiveToggle.addEventListener('change', (e) => {
                const tableBody = document.getElementById('sectionsTableBody');
                if (tableBody) {
                    tableBody.innerHTML = this.renderSectionsTable(this.currentSections, e.target.checked);
                }
            });
        }

        this.globalClickHandler = async (e) => {
            const target = e.target;
            const action = target.dataset.action;
            
            if (!action) return;

            e.preventDefault();
            e.stopPropagation();

            const sectionId = target.dataset.sectionId;
            const sectionName = target.dataset.sectionName;

            console.log('🎯 Section action clicked:', {
                action,
                sectionId,
                sectionName,
                buttonClass: target.className
            });

            switch (action) {
                case 'toggle-status':
                    const currentStatus = target.dataset.currentStatus === 'true';
                    console.log('🔄 STATUS TOGGLE ACTION:', {
                        sectionId,
                        sectionName,
                        currentStatus,
                        newStatus: !currentStatus
                    });
                    await this.toggleSectionStatus(sectionId, currentStatus, sectionName);
                    break;

                case 'edit':
                    console.log('✏️ Edit action for section:', sectionId);
                    await this.editSection(sectionId);
                    break;

                case 'delete':
                    console.log('🗑️ Delete action for section:', sectionId, sectionName);
                    await this.deleteSection(sectionId, sectionName);
                    break;

                case 'move-up':
                    await this.reorderSection(sectionId, 'up');
                    break;

                case 'move-down':
                    await this.reorderSection(sectionId, 'down');
                    break;

                default:
                    console.log('❓ Unknown action:', action);
            }
        };

        document.addEventListener('click', this.globalClickHandler);
        console.log('✅ Global section event handler attached');
    },

    async toggleSectionStatus(sectionId, currentStatus, sectionName) {
        console.log('🔄 Starting status toggle operation:', {
            sectionId,
            currentStatus,
            sectionName,
            newStatus: !currentStatus
        });

        try {
            ui.showLoading();
            
            const updateData = {
                isActive: !currentStatus
            };
            
            console.log('📤 Sending PUT request to update status ONLY:', {
                endpoint: `/api/sections/${sectionId}`,
                data: updateData
            });
            
            const response = await api.put(`/api/sections/${sectionId}`, updateData);
            
            console.log('📥 Status toggle response:', response);

            if (!response.success) {
                throw new Error(response.message || 'Failed to update section status');
            }

            await this.show(document.getElementById('adminContent'));
            
            if (window.navigation && typeof window.navigation.refresh === 'function') {
                console.log('🔄 Refreshing sidebar navigation...');
                await window.navigation.refresh();
            }
            
            const statusText = !currentStatus ? 'activated' : 'deactivated';
            ui.showError(`Section "${sectionName}" ${statusText} successfully`, 'success');
            
            console.log('✅ Status toggle completed successfully');
        } catch (error) {
            console.error('❌ Error updating section status:', error);
            ui.showError(`Failed to update section status: ${error.message}`);
        } finally {
            ui.hideLoading();
        }
    },

    async reorderSection(sectionId, direction) {
        try {
            ui.showLoading();
            const response = await api.put(`/api/sections/${sectionId}/reorder`, {
                direction
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to reorder section');
            }

            await this.show(document.getElementById('adminContent'));
            
            if (window.navigation && typeof window.navigation.refresh === 'function') {
                await window.navigation.refresh();
            }
        } catch (error) {
            console.error('Error reordering section:', error);
            ui.showError(error.message);
        } finally {
            ui.hideLoading();
        }
    },

    async editSection(sectionId) {
        try {
            ui.showLoading();
            const response = await api.get(`/api/sections/${sectionId}`);
            if (!response.success) {
                throw new Error(response.message || 'Failed to fetch section details');
            }
            await this.showSectionModal(response.data);
        } catch (error) {
            console.error('Error editing section:', error);
            ui.showError(error.message);
        } finally {
            ui.hideLoading();
        }
    },

    async deleteSection(sectionId, sectionName) {
        const currentUser = JSON.parse(localStorage.getItem('userData'))?.user;
        if (!currentUser?.email) {
            ui.showError('Unable to verify user identity. Please log in again.');
            return;
        }

        if (!confirm(`⚠️ DANGER: This will permanently delete section "${sectionName}" and ALL articles within it.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`)) {
            return;
        }

        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'fixed inset-0 bg-red-900 bg-opacity-75 flex items-center justify-center z-50';
        confirmationModal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 border-4 border-red-500">
                <div class="text-center mb-6">
                    <div class="text-red-600 text-6xl mb-4">⚠️</div>
                    <h3 class="text-xl font-bold text-red-600 mb-2">DANGER: Permanent Deletion</h3>
                    <p class="text-gray-700">You are about to permanently delete:</p>
                    <p class="font-bold text-lg text-red-600 mt-2">"${sectionName}"</p>
                    <p class="text-sm text-gray-600 mt-2">All articles in this section will be permanently lost!</p>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        To confirm this dangerous action, please type your email address:
                    </label>
                    <input 
                        type="email" 
                        id="confirmEmail" 
                        placeholder="Enter your email address"
                        class="w-full p-3 border-2 border-gray-300 rounded focus:border-red-500 focus:ring-red-500"
                        autocomplete="off"
                    />
                    <p class="text-xs text-gray-500 mt-1">Expected: ${currentUser.email}</p>
                </div>
                
                <div class="flex space-x-3">
                    <button 
                        id="cancelDelete"
                        class="flex-1 px-4 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium">
                        Cancel (Safe)
                    </button>
                    <button 
                        id="confirmDelete"
                        class="flex-1 px-4 py-3 bg-gray-400 text-gray-600 rounded cursor-not-allowed font-medium"
                        disabled>
                        Delete Forever
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmationModal);

        const emailInput = confirmationModal.querySelector('#confirmEmail');
        const confirmBtn = confirmationModal.querySelector('#confirmDelete');
        const cancelBtn = confirmationModal.querySelector('#cancelDelete');

        emailInput.addEventListener('input', (e) => {
            const emailMatches = e.target.value.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
            confirmBtn.disabled = !emailMatches;
            if (emailMatches) {
                confirmBtn.className = 'flex-1 px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-medium';
            } else {
                confirmBtn.className = 'flex-1 px-4 py-3 bg-gray-400 text-gray-600 rounded cursor-not-allowed font-medium';
            }
        });

        emailInput.focus();

        confirmBtn.addEventListener('click', async () => {
            if (emailInput.value.toLowerCase().trim() !== currentUser.email.toLowerCase().trim()) {
                ui.showError('Email confirmation does not match. Deletion cancelled for safety.');
                return;
            }

            try {
                ui.showLoading();
                confirmationModal.remove();

                const response = await api.post(`/api/sections/${sectionId}/delete-confirm`, {
                    confirmEmail: currentUser.email
                });

                if (!response.success) {
                    throw new Error(response.message || 'Failed to delete section');
                }

                await this.show(document.getElementById('adminContent'));
                
                if (window.navigation && typeof window.navigation.refresh === 'function') {
                    console.log('🔄 Refreshing sidebar navigation after deletion...');
                    await window.navigation.refresh();
                }
                
                ui.showError(`Section "${sectionName}" has been permanently deleted`, 'success');
            } catch (error) {
                console.error('Error deleting section:', error);
                ui.showError(error.message);
            } finally {
                ui.hideLoading();
            }
        });

        cancelBtn.addEventListener('click', () => {
            confirmationModal.remove();
        });
    },

    async showSectionModal(sectionData = null) {
        const isEditing = !!sectionData;
        
        const response = await api.get('/api/sections');
        const parentOptions = response.success ? response.data
            .filter(s => !sectionData || s._id !== sectionData._id)
            .map(s => `<option value="${s._id}" ${sectionData?.parentSection?._id === s._id ? 'selected' : ''}>${s.name}</option>`)
            .join('') : '';

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">${isEditing ? 'Edit' : 'Create'} Section</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700">✕</button>
                </div>
                <form id="sectionForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" name="name" required
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value="${sectionData?.name || ''}"
                        >
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" rows="3"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >${sectionData?.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Parent Section</label>
                        <select name="parentSection"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">None</option>
                            ${parentOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Order</label>
                        <input type="number" name="order"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value="${sectionData?.order || 0}"
                        >
                    </div>
                    ${isEditing ? `
                        <div>
                            <label class="flex items-center">
                                <input type="checkbox" name="isActive"
                                    class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    ${sectionData.isActive ? 'checked' : ''}
                                >
                                <span class="ml-2 text-sm text-gray-600">Active</span>
                            </label>
                        </div>
                    ` : ''}
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" class="cancel-modal px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit"
                            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                            ${isEditing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.cancel-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#sectionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                parentSection: formData.get('parentSection') || null,
                order: parseInt(formData.get('order')) || 0
            };

            if (isEditing) {
                data.isActive = formData.get('isActive') === 'on';
            }

            try {
                ui.showLoading();
                const response = await api[isEditing ? 'put' : 'post'](
                    `/api/sections${isEditing ? `/${sectionData._id}` : ''}`,
                    data
                );

                if (!response.success) {
                    throw new Error(response.message || `Failed to ${isEditing ? 'update' : 'create'} section`);
                }

                modal.remove();
                await this.show(document.getElementById('adminContent'));
                
                if (window.navigation && typeof window.navigation.refresh === 'function') {
                    console.log('🔄 Refreshing sidebar navigation after section create/edit...');
                    await window.navigation.refresh();
                }
                
                ui.showError(`Section ${isEditing ? 'updated' : 'created'} successfully`, 'success');
            } catch (error) {
                console.error('Section operation error:', error);
                ui.showError(error.message);
            } finally {
                ui.hideLoading();
            }
        });
    }
};