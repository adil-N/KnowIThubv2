// frontend/src/js/code/codeCreate.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { codeList } from './codeList.js';  // Add this import

export const codeCreate = {
    initialized: false,

    initialize() {
        if (this.initialized) return;
        
        this.renderForm();
        this.setupEventListeners();
        this.initialized = true;
    },

    renderForm() {
        const container = document.getElementById('codeSnippetsSection');
        if (!container) return;
    
        // Clear any existing content
        container.innerHTML = '';
        
        container.innerHTML = `
            <div id="createSnippetContainer" class="max-w-4xl mx-auto px-4 py-8">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold">Create New Code Snippet</h2>
                        <button id="backToSnippets" class="flex items-center text-gray-600 hover:text-gray-800">
                            <span class="material-icons-outlined mr-1">arrow_back</span>
                            Back to Snippets
                        </button>
                    </div>
                    
                    <form id="createSnippetForm" class="space-y-6">
                        <div>
                            <label for="snippetTitle" class="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" id="snippetTitle" name="title" required
                                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        </div>

                        <div>
                            <label for="snippetDescription" class="block text-sm font-medium text-gray-700">Description (optional)</label>
                            <textarea id="snippetDescription" name="description" rows="2"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
                        </div>

                        <div>
                            <label for="snippetCode" class="block text-sm font-medium text-gray-700">Code</label>
                            <textarea id="snippetCode" name="code" rows="10" required
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"></textarea>
                        </div>

                        <div>
                            <label for="snippetTags" class="block text-sm font-medium text-gray-700">
                                Tags (comma-separated)
                            </label>
                            <input type="text" id="snippetTags" name="tags"
                                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                   placeholder="e.g., query, report, analysis">
                        </div>

                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button" id="cancelCreate"
                                    class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="submit"
                                    class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                Create Snippet
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <div id="codeSnippetsContainer" class="hidden"></div>
        `;
    },

    setupEventListeners() {
        const form = document.getElementById('createSnippetForm');
        const backBtn = document.getElementById('backToSnippets');
        const cancelBtn = document.getElementById('cancelCreate');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubmit(form);
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateBack();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateBack();
            });
        }
    },

    async handleSubmit(form) {
        try {
            ui.showLoading();

            if (!form.snippetTitle.value.trim() || !form.snippetCode.value.trim()) {
                ui.showError('Title and code are required');
                return;
            }

            const formData = {
                title: form.snippetTitle.value.trim(),
                description: form.snippetDescription.value.trim(),
                code: form.snippetCode.value.trim(),
                tags: form.snippetTags.value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0)
            };

            const response = await api.post('/api/code-snippets', formData);

            if (response.success) {
                ui.showSuccess('Code snippet created successfully');
                // Reset form and state before navigation
                form.reset();
                this.cleanup();
                // Ensure codeList is reinitialized when we return
                codeList.initialized = false;
                this.navigateBack();
            } else {
                ui.showError(response.message || 'Failed to create code snippet');
            }
        } catch (error) {
            console.error('Error creating snippet:', error);
            ui.showError('Error creating code snippet');
        } finally {
            ui.hideLoading();
        }
    },

    navigateBack() {
        // Clean up current form state
        this.cleanup();
        // Reset code list state to force reinitialization
        codeList.initialized = false;
        // Navigate back to the list
        window.location.hash = '#code-snippets';
    },

    cleanup() {
        // Reset form if it exists
        const form = document.getElementById('createSnippetForm');
        if (form) {
            form.reset();
        }
        // Clear any event listeners by removing the form container
        const container = document.getElementById('createSnippetContainer');
        if (container) {
            container.innerHTML = '';
        }
        this.initialized = false;
    }
};