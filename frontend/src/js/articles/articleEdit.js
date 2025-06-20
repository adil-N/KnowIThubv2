// frontend/src/js/articles/articleEdit.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';
import { fileHandlers } from '../utils/fileHandlers.js';

export const articleEdit = {
    currentArticle: null,
    articleId: null,
    editor: null,
    filesToDelete: [],
    newFilesToUpload: [],

    async initialize(articleId) {
        console.log('Starting article edit initialization for ID:', articleId);
        try {
            ui.showLoading();
            
            if (!articleId || articleId === 'undefined') {
                throw new Error('Invalid article ID');
            }
    
            const editFormContainer = document.getElementById('editArticleForm');
            if (!editFormContainer) {
                throw new Error('Edit form container not found in DOM');
            }
            console.log('Edit form container found');
    
            this.cleanup();
            
            const response = await api.get(`/api/articles/${articleId}`);
            console.log('Article fetch response:', response);
            
            if (!response.success || !response.data) {
                throw new Error(response.message || 'Failed to load article');
            }
    
            this.articleId = articleId;
            this.currentArticle = response.data;
            this.filesToDelete = [];
            this.newFilesToUpload = [];
            
            const currentUser = auth.user.get();
            const isAuthor = currentUser && 
                            this.currentArticle.author && 
                            String(currentUser.user._id) === String(this.currentArticle.author._id);
            const isAdminUser = currentUser && ['admin', 'super'].includes(currentUser.user.role);
    
            if (!isAuthor && !isAdminUser) {
                throw new Error('You do not have permission to edit this article');
            }
    
            this.renderEditForm();
            console.log('Edit form rendered');
    
            await this.initializeRichEditor();
            console.log('Rich text editor initialized');
    
            this.attachEventListeners();
            console.log('Event listeners attached');
    
            return true;
    
        } catch (error) {
            console.error('Error in article edit initialization:', error);
            ui.showError(error.message || 'Failed to load article for editing');
            return false;
        } finally {
            ui.hideLoading();
        }
    },

    initializeRichEditor() {
        return new Promise((resolve) => {
            if (tinymce.get('editArticleContent')) {
                tinymce.get('editArticleContent').remove();
            }

            const isDarkMode = document.documentElement.classList.contains('dark');

            tinymce.init({
                selector: '#editArticleContent',
                height: 800,
                min_height: 500,
                autofocus: true,
                promotion: false,
                branding: false,
                placeholder: 'Start writing your article here...',
                
                skin_url: '/vendor/tinymce/skins/ui/oxide',
                icons_url: '/vendor/icons/default/icons.min.js',
                content_css: [
                    '/vendor/tinymce/skins/content/default/content.min.css',
                    isDarkMode ? '/vendor/skins/content/dark/content.css' : ''
                ].filter(Boolean),
                
                external_plugins: {
                    'advlist': '/vendor/tinymce/plugins/advlist/plugin.min.js',
                    'autolink': '/vendor/tinymce/plugins/autolink/plugin.min.js',
                    'lists': '/vendor/tinymce/plugins/lists/plugin.min.js',
                    'link': '/vendor/tinymce/plugins/link/plugin.min.js',
                    'image': '/vendor/tinymce/plugins/image/plugin.min.js',
                    'charmap': '/vendor/tinymce/plugins/charmap/plugin.min.js',
                    'preview': '/vendor/tinymce/plugins/preview/plugin.min.js',
                    'anchor': '/vendor/tinymce/plugins/anchor/plugin.min.js',
                    'searchreplace': '/vendor/tinymce/plugins/searchreplace/plugin.min.js',
                    'visualblocks': '/vendor/tinymce/plugins/visualblocks/plugin.min.js',
                    'code': '/vendor/tinymce/plugins/code/plugin.min.js',
                    'fullscreen': '/vendor/tinymce/plugins/fullscreen/plugin.min.js',
                    'insertdatetime': '/vendor/tinymce/plugins/insertdatetime/plugin.min.js',
                    'media': '/vendor/tinymce/plugins/media/plugin.min.js',
                    'table': '/vendor/tinymce/plugins/table/plugin.min.js',
                    'help': '/vendor/tinymce/plugins/help/plugin.min.js',
                    'wordcount': '/vendor/tinymce/plugins/wordcount/plugin.min.js',
                    'codesample': '/vendor/tinymce/plugins/codesample/plugin.min.js',
                    'paste': '/vendor/tinymce/plugins/paste/plugin.min.js',
                    'quickbars': '/vendor/tinymce/plugins/quickbars/plugin.min.js',
                    'autoresize': '/vendor/tinymce/plugins/autoresize/plugin.min.js',
                    'pagebreak': '/vendor/tinymce/plugins/pagebreak/plugin.min.js'
                },

                skin: isDarkMode ? 'oxide-dark' : 'oxide',
                plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount',
                    'codesample', 'paste', 'quickbars', 'autoresize', 'pagebreak'
                ],
                toolbar: [
                    'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify',
                    'bullist numlist outdent indent | removeformat | image media table link codesample | fullscreen code preview'
                ],
                menubar: 'file edit view insert format tools table help',
                content_style: `
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 16px;
                        line-height: 1.6;
                        padding: 20px;
                        background-color: ${isDarkMode ? '#171616' : '#ffffff'};
                        color: ${isDarkMode ? '#e0e0e0' : '#1f2937'};
                    }
                    
                    ${isDarkMode ? `
                        h1, h2, h3, h4, h5, h6 { color: #e0e0e0; }
                        a { color: #60a5fa; }
                        table { border-color: #404040; }
                        td, th { border-color: #404040; }
                        pre { background-color: #1a1a1a; border-color: #404040; color: #e0e0e0; }
                        code { background-color: #1a1a1a; color: #e0e0e0; }
                    ` : ''}
                `,
                setup: (editor) => {
                    this.editor = editor;
                    editor.on('init', () => {
                        console.log('Editor initialized (offline mode), setting content...');
                        if (this.currentArticle && this.currentArticle.content) {
                            editor.setContent(this.currentArticle.content);
                            console.log('Content set in editor');
                        }
                        resolve();
                    });

                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.attributeName === 'class') {
                                const isDarkNow = document.documentElement.classList.contains('dark');
                                editor.dom.setStyle(editor.getBody(), 'background-color', isDarkNow ? '#171616' : '#ffffff');
                                editor.dom.setStyle(editor.getBody(), 'color', isDarkNow ? '#e0e0e0' : '#1f2937');
                            }
                        });
                    });

                    observer.observe(document.documentElement, {
                        attributes: true,
                        attributeFilter: ['class']
                    });
                },
                automatic_uploads: true,
                file_picker_types: 'file image media',
                file_picker_callback: (callback, value, meta) => {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    
                    if (meta.filetype === 'image') {
                        input.setAttribute('accept', 'image/*');
                    } else if (meta.filetype === 'file') {
                        input.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx,.txt');
                    }

                    input.onchange = async () => {
                        const file = input.files[0];
                        if (!file) return;

                        try {
                            fileHandlers.processFile(file, callback, this.editor);
                        } catch (error) {
                            console.error('File handling error:', error);
                            ui.showError('Failed to process file');
                        }
                    };

                    input.click();
                }
            });
        });
    },

    renderEditForm() {
        console.log('Rendering edit form...');
        const editFormContainer = document.getElementById('editArticleForm');
        if (!editFormContainer || !this.currentArticle) {
            console.error('Edit form container not found or no article data');
            return;
        }
    
        editFormContainer.innerHTML = `
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Edit Article</h2>
                    <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        #${this.currentArticle.articleId || 'N/A'}
                    </span>
                </div>
    
                <form id="editArticleFormElement" class="space-y-6">
                    <div class="space-y-2">
                        <label for="editArticleTitle" class="block text-sm font-medium text-gray-700">Title</label>
                        <input type="text" 
                            id="editArticleTitle" 
                            value="${this.escapeHtml(this.currentArticle.title)}"
                            required 
                            class="block w-full px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
    
                    <div class="space-y-2">
                        <label for="editArticleContent" class="block text-sm font-medium text-gray-700">Content</label>
                        <textarea id="editArticleContent" 
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            ></textarea>
                    </div>
    
                    ${this.renderExistingFiles()}
                    
                    <div class="space-y-2">
                        <label for="editArticleFiles" class="block text-sm font-medium text-gray-700">Upload New Files</label>
                        <input type="file" 
                            id="editArticleFiles" 
                            multiple 
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                            class="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100">
                        <p class="mt-1 text-sm text-gray-500">Max 7 files. Supported formats: Images, PDF, Word, Excel, PowerPoint, Text.</p>
                    </div>
                    
                    <div id="editArticleError" class="text-red-600 hidden"></div>
                    
                    <div class="flex justify-end items-center space-x-4 pt-6 border-t mt-6">
                        <button type="button" 
                            id="cancelEditButton"
                            class="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-200">
                            Cancel
                        </button>
                        <button type="submit" 
                            id="saveArticleButton"
                            class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;
        console.log('Edit form rendered');
    },

    renderExistingFiles() {
        if (!this.currentArticle.files?.length) {
            return '<p class="text-sm text-gray-500 italic">No files attached</p>';
        }

        return `
            <div class="current-files mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Current Files</label>
                <div class="space-y-2">
                    ${this.currentArticle.files.map(file => `
                        <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg shadow-sm" id="file-${file.filename}">
                            <div class="flex items-center space-x-3">
                                <span class="text-sm text-gray-600">${this.escapeHtml(file.originalname)}</span>
                            </div>
                            <button type="button"
                                data-filename="${this.escapeHtml(file.filename)}"
                                class="delete-file-btn p-2 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700">
                                Delete
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // FIXED handleEditArticle method
    async handleEditArticle(event) {
        event.preventDefault();
        const errorDiv = document.getElementById('editArticleError');
        const saveButton = document.getElementById('saveArticleButton');
        
        try {
            ui.showLoading();
            if (saveButton) saveButton.disabled = true;
    
            const articleId = this.currentArticle?._id || this.articleId;
            if (!articleId) {
                throw new Error('Invalid article context');
            }
    
            const title = document.getElementById('editArticleTitle')?.value.trim();
            const editor = tinymce.get('editArticleContent');
            if (!editor) {
                throw new Error('Editor not initialized properly');
            }
            const content = editor.getContent();
    
            const fileInput = document.getElementById('editArticleFiles');
            const files = fileInput?.files;
    
            if (!title || !content) {
                throw new Error('Title and content are required');
            }
    
            // FIXED FormData construction
            const formData = new FormData();
            
            // Add basic fields
            formData.append('title', title);
            formData.append('content', content);
            
            // Add files marked for deletion
            if (this.filesToDelete.length > 0) {
                formData.append('removedFiles', JSON.stringify(this.filesToDelete));
            }
            
            // Add new files
            if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }
            }
    
            console.log('Sending FormData with:', {
                title,
                contentLength: content.length,
                filesToDelete: this.filesToDelete,
                newFiles: files ? files.length : 0
            });
            
            // FIXED API call - removed isFormData parameter, let the API detect it
            const response = await api.put(`/api/articles/${articleId}`, formData, true);
    
            if (!response.success) {
                throw new Error(response.message || 'Failed to update article');
            }
    
            ui.showError('Article updated successfully', 'success');
            
            this.filesToDelete = [];
            this.newFilesToUpload = [];
            
            setTimeout(() => {
                window.location.hash = `#article/${articleId}`;
            }, 1000);
    
        } catch (error) {
            console.error('Error updating article:', error);
            if (errorDiv) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            }
            ui.showError(error.message || 'Failed to update article');
        } finally {
            ui.hideLoading();
            if (saveButton) saveButton.disabled = false;
        }
    },

    attachEventListeners() {
        console.log('Attaching event listeners...');
        const form = document.getElementById('editArticleFormElement');
        if (form) {
            const boundHandler = this.handleEditArticle.bind(this);
            form.removeEventListener('submit', boundHandler);
            form.addEventListener('submit', boundHandler);
        }

        const cancelButton = document.getElementById('cancelEditButton');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                    window.location.hash = `#article/${this.currentArticle._id || this.articleId}`;
                }
            });
        }

        const fileInput = document.getElementById('editArticleFiles');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files.length > 7) {
                    ui.showError('Maximum 7 files allowed');
                    e.target.value = '';
                }
            });
        }

        this.initializeFileDeleteButtons();
        console.log('Event listeners attached');
    },

    initializeFileDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.delete-file-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const filename = e.currentTarget.dataset.filename;
                if (!filename) return;

                if (confirm('Are you sure you want to delete this file?')) {
                    this.handleDeleteFile(filename);
                }
            });
        });
    },

    handleDeleteFile(filename) {
        try {
            if (!this.filesToDelete.includes(filename)) {
                this.filesToDelete.push(filename);
            }
            
            const fileElement = document.getElementById(`file-${filename}`);
            if (fileElement) {
                fileElement.style.opacity = '0.5';
                fileElement.style.backgroundColor = '#fee2e2';
                
                const deleteBtn = fileElement.querySelector('.delete-file-btn');
                if (deleteBtn) {
                    deleteBtn.textContent = 'Undo';
                    deleteBtn.onclick = () => this.undoDeleteFile(filename);
                }
                
                const notice = document.createElement('div');
                notice.className = 'text-xs text-red-600 mt-1';
                notice.textContent = 'Will be deleted when saved';
                notice.id = `deletion-notice-${filename}`;
                fileElement.appendChild(notice);
            }
            
            ui.showError('File marked for deletion. Save changes to confirm.', 'info');
        } catch (error) {
            console.error('Error marking file for deletion:', error);
            ui.showError('Failed to mark file for deletion');
        }
    },

    undoDeleteFile(filename) {
        this.filesToDelete = this.filesToDelete.filter(f => f !== filename);
        
        const fileElement = document.getElementById(`file-${filename}`);
        if (fileElement) {
            fileElement.style.opacity = '1';
            fileElement.style.backgroundColor = '';
            
            const deleteBtn = fileElement.querySelector('.delete-file-btn');
            if (deleteBtn) {
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => {
                    if (confirm('Are you sure you want to delete this file?')) {
                        this.handleDeleteFile(filename);
                    }
                };
            }
            
            const notice = document.getElementById(`deletion-notice-${filename}`);
            if (notice) notice.remove();
        }
        
        ui.showError('File deletion cancelled', 'success');
    },

    cleanup() {
        console.log('Cleaning up article edit...');
        if (tinymce.get('editArticleContent')) {
            tinymce.get('editArticleContent').remove();
        }
        this.currentArticle = null;
        this.articleId = null;
        this.editor = null;
        this.filesToDelete = [];
        this.newFilesToUpload = [];

        const form = document.getElementById('editArticleFormElement');
        if (form) {
            form.removeEventListener('submit', this.handleEditArticle.bind(this));
        }

        console.log('Article edit cleanup completed');
    }
};