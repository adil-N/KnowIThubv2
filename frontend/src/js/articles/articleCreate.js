// frontend/src/js/articles/articleCreate.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';
import { fileHandlers } from '../utils/fileHandlers.js';

export const articleCreate = {
    sections: [],
    tags: [],
    maxTags: 10,
    editor: null,
    initialized: false,
    selectedFiles: [], // Initialize selectedFiles property

    cleanup() {
        try {
            if (tinymce.get('articleContent')) {
                tinymce.get('articleContent').remove();
            }
            this.initialized = false;
            this.sections = [];
            this.tags = [];
            this.selectedFiles = []; // Reset selected files
        } catch (error) {
            console.error('Error cleaning up TinyMCE:', error);
        }
    },

    bindCreateForm() {
        const form = document.getElementById('createArticleFormElement');
        if (form) {
            // Use an arrow function to preserve 'this' context
            form.addEventListener('submit', async (event) => {
                await this.handleCreateArticle(event);
            });
            
            const fileInput = form.querySelector('#articleFiles');
            if (fileInput) {
                fileInput.addEventListener('change', async (e) => {
                    await this.handleFileChange(e);
                });
            }
        }
    },

    // Initialization and file handling methods
async initialize() {
    // Check authentication first
    if (!auth.isAuthenticated()) {
        console.log('User not authenticated, skipping article create initialization');
        window.location.hash = '#login';
        return false;
    }

    // Prevent double initialization
    if (this.initialized) {
        console.log('Article create already initialized');
        return true;
    }

    try {
        console.log('Initializing article create module');
        await this.fetchSections();
        this.render();
        this.bindCreateForm();
        this.initializeTagHandling();
        this.initializeRichEditor();
        this.initialized = true;
        return true;
    } catch (error) {
        console.error('Error during article create initialization:', error);
        ui.showError('Failed to initialize article creation form');
        return false;
    }
},
async fetchSections() {
    try {
        // Verify authentication before fetching
        if (!auth.isAuthenticated()) {
            console.log('User not authenticated, skipping sections fetch');
            this.sections = [];
            return;
        }

        const response = await api.get('/api/sections');
        if (response.success) {
            // Filter out inactive sections
            this.sections = response.data.filter(section => section.isActive !== false);
            console.log('Fetched sections:', this.sections);
        } else {
            throw new Error(response.message || 'Failed to fetch sections');
        }
    } catch (error) {
        console.error('Error fetching sections:', error);
        // Don't show error to user, just set empty sections
        this.sections = [];
        ui.showError('Failed to load sections');
    }
},
// Restore the addFiles method with a simple implementation
addFiles(newFiles) {
    // If you need a simple implementation, you can use:
    const filesToAdd = Array.from(newFiles);
    
    // Prevent exceeding 7 total files
    const remainingSlots = 7 - this.selectedFiles.length;
    const limitedFiles = filesToAdd.slice(0, remainingSlots);

    // Add new files, avoiding duplicates
    limitedFiles.forEach(newFile => {
        const isDuplicate = this.selectedFiles.some(
            existingFile => existingFile.name === newFile.name && 
                            existingFile.size === newFile.size
        );
        
        if (!isDuplicate) {
            this.selectedFiles.push(newFile);
        }
    });
},

handleFileChange(e) {
    try {
        const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
        const files = e.target.files;

        for (let file of files) {
            if (file.size > MAX_FILE_SIZE) {
                ui.showError(`File ${file.name} exceeds 15MB limit`);
                e.target.value = ''; // Clear the file input
                return;
            }
        }

        this.validateFiles(files);
        this.addFiles(files);
        this.displaySelectedFiles();
        
        // Reset file input
        e.target.value = '';
    } catch (error) {
        ui.showError(error.message);
        e.target.value = '';
    }
},

    // Method to add files to selectedFiles
    // addFiles(newFiles) {
    //     // Prevent exceeding 7 total files
    //     const remainingSlots = 7 - this.selectedFiles.length;
    //     const filesToAdd = Array.from(newFiles).slice(0, remainingSlots);

    //     // Add new files, avoiding duplicates
    //     filesToAdd.forEach(newFile => {
    //         const isDuplicate = this.selectedFiles.some(
    //             existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size
    //         );
            
    //         if (!isDuplicate) {
    //             this.selectedFiles.push(newFile);
    //         }
    //     });
    // },

    displaySelectedFiles() {
        const listContainer = document.getElementById('selectedFilesList');
        
        // Create container if it doesn't exist
        if (!listContainer) {
            const fileUploadContainer = document.getElementById('fileUploadContainer');
            if (fileUploadContainer) {
                const newListContainer = document.createElement('div');
                newListContainer.id = 'selectedFilesList';
                newListContainer.className = 'mt-2 space-y-2';
                fileUploadContainer.appendChild(newListContainer);
            }
        }

        const container = document.getElementById('selectedFilesList');
        if (!container) return;

        container.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="flex items-center justify-between bg-gray-100 p-2 rounded">
                <span>${file.name} (${this.formatFileSize(file.size)})</span>
                <button type="button" class="remove-file text-red-500 hover:text-red-700" data-index="${index}">
                    ×
                </button>
            </div>
        `).join('');

        // Add event listener for file removal
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-file')) {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.selectedFiles.splice(index, 1);
                this.displaySelectedFiles();
                
                // Reset file input to allow re-selecting files
                const fileInput = document.getElementById('articleFiles');
                if (fileInput) {
                    fileInput.value = '';
                }
            }
        });
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

  // Replace your existing handleCreateArticle method with this fixed version
async handleCreateArticle(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('createArticleError');
    
    if (submitButton?.disabled) return;
    
    try {
        ui.showLoading();
        submitButton.disabled = true;
        errorDiv?.classList.add('hidden');
        
        if (!auth.isAuthenticated()) {
            throw new Error('Please login to create an article');
        }
        
        const titleInput = form.querySelector('#articleTitle');
        const sectionInput = form.querySelector('#sectionId');

        const editor = tinymce.get('articleContent');
        if (!editor) {
            throw new Error('Editor not initialized. Please try again.');
        }
        const content = editor.getContent();

        const title = titleInput?.value?.trim() || '';
        if (!title) {
            throw new Error('Title is required');
        }

        const selectedSection = this.sections.find(section => section._id === sectionInput?.value);
        const isFlashInfo = selectedSection?.name === 'Flash Information';

        if (!isFlashInfo && !content.trim()) {
            throw new Error('Content is required');
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        
        if (sectionInput?.value) {
            formData.append('sectionId', sectionInput.value);
            
            // Handle Flash Information section and expiration
            if (isFlashInfo) {
                const expirationSelect = document.getElementById('expirationTime');
                const temporaryDuration = expirationSelect?.value;
                
                if (!temporaryDuration) {
                    throw new Error('Please select an expiration time for Flash Information articles');
                }

                if (!['72h', '1w', '1m'].includes(temporaryDuration)) {
                    throw new Error('Invalid expiration time selected');
                }

                formData.append('temporaryDuration', temporaryDuration);
            }
        }
        
        if (this.tags.length > 0) {
            formData.append('tags', JSON.stringify(this.tags));
        }
        
        // Add selected files to FormData
        if (this.selectedFiles?.length > 0) {
            this.selectedFiles.forEach(file => {
                formData.append('files', file);
            });
        }

        console.log('Making API request to create article...');

        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: formData
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        // CRITICAL FIX: Always try to parse JSON response
        let responseData;
        try {
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            if (responseText) {
                responseData = JSON.parse(responseText);
            } else {
                responseData = { success: false, message: 'Empty response from server' };
            }
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            throw new Error(`Server returned invalid response (Status: ${response.status})`);
        }

        console.log('Parsed response data:', responseData);

        // Check if the operation was successful based on response data
        if (response.ok && responseData.success) {
            ui.showError('Article created successfully!', 'success');
            
            // Reset form and files
            this.selectedFiles = [];
            this.tags = [];
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Reset form and clean up
            this.cleanup();
            
            // Navigate to articles
            window.location.hash = '#articles';
        } else {
            // Handle server-reported errors
            const errorMessage = responseData.message || `Server error (${response.status})`;
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Article creation error:', error);
        
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
        
        ui.showError(error.message || 'Error creating article');
        
    } finally {
        ui.hideLoading();
        if (submitButton) {
            setTimeout(() => submitButton.disabled = false, 1500);
        }
    }
},

// Add a new method to show and manage selected files
displaySelectedFiles() {
    const fileInput = document.getElementById('articleFiles');
    const fileList = document.getElementById('selectedFilesList');
    
    if (!fileList) {
        // Create a new div to show selected files if it doesn't exist
        const container = document.getElementById('fileUploadContainer');
        const newFileList = document.createElement('div');
        newFileList.id = 'selectedFilesList';
        newFileList.className = 'mt-2 space-y-2';
        container.appendChild(newFileList);
    }

    const listContainer = document.getElementById('selectedFilesList');
    listContainer.innerHTML = '';

    if (this.selectedFiles && this.selectedFiles.length > 0) {
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center justify-between bg-gray-100 p-2 rounded';
            fileItem.innerHTML = `
                <span>${file.name} (${this.formatFileSize(file.size)})</span>
                <button type="button" class="remove-file text-red-500 hover:text-red-700" data-index="${index}">
                    ×
                </button>
            `;
            listContainer.appendChild(fileItem);
        });

        // Add event listeners for file removal
        listContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-file')) {
                const index = e.target.getAttribute('data-index');
                this.selectedFiles.splice(index, 1);
                this.displaySelectedFiles();
            }
        });
    }
},

// Utility method to format file size
formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
},

// Update the cleanup method to reset files
cleanup() {
    try {
        if (tinymce.get('articleContent')) {
            tinymce.get('articleContent').remove();
        }
        this.initialized = false;
        this.sections = [];
        this.tags = [];
        this.selectedFiles = []; // Reset selected files
    } catch (error) {
        console.error('Error cleaning up TinyMCE:', error);
    }
},

initializeRichEditor() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    tinymce.init({
        selector: '#articleContent',
        height: 800,
        min_height: 500,
        autofocus: true,
        promotion: false,
        branding: false,
        placeholder: 'Start writing your article here...',
        
        // OFFLINE CONFIG STARTS HERE
        skin_url: '/vendor/tinymce/skins/ui/oxide',
        icons_url: '/vendor/icons/default/icons.min.js',
        content_css: [
            '/vendor/tinymce/skins/content/default/content.min.css',
            isDarkMode ? '/vendor/skins/content/dark/content.css' : ''
        ].filter(Boolean),
        
        // Configure all plugins to load from local vendor directory
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
        // OFFLINE CONFIG ENDS HERE
        
        skin: isDarkMode ? 'oxide-dark' : 'oxide',
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
        quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
        contextmenu: 'link image table',
        file_picker_types: 'file image media',
        paste_data_images: true,
        paste_as_text: false,
        paste_enable_default_filters: true,
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
                fileHandlers.processFile(file, callback, this.editor);
            };

            input.click();
        },
        setup: (editor) => {
            this.editor = editor;
            
            editor.on('init', () => {
                console.log('TinyMCE initialized (offline mode)');
                
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'class') {
                            const isDarkMode = document.documentElement.classList.contains('dark');
                            editor.dom.setStyle(editor.getBody(), 'background-color', isDarkMode ? '#171616' : '#ffffff');
                            editor.dom.setStyle(editor.getBody(), 'color', isDarkMode ? '#e0e0e0' : '#1f2937');
                        }
                    });
                });

                observer.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['class']
                });
            });

            editor.ui.registry.addButton('excel', {
                text: 'Add Excel',
                icon: 'table',
                onAction: () => {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', '.xlsx,.xls');
                    input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            fileHandlers.handleExcelFile(file, null, editor);
                        }
                    };
                    input.click();
                }
            });
        }
    });
},


    handleSectionChange(event) {
        const sectionId = event.target.value;
        const expirationContainer = document.getElementById('expirationContainer');
        const selectedSection = this.sections.find(section => section._id === sectionId);
        const isFlashInfo = selectedSection?.name === 'Flash Information';
        
        if (expirationContainer) {
            expirationContainer.classList.toggle('hidden', !isFlashInfo);
            if (!isFlashInfo) {
                document.getElementById('expirationTime').value = '';
            }
        }
    },
    
    initializeTagHandling() {
        const tagInput = document.getElementById('articleTags');
        const tagsList = document.getElementById('tagsList');
        
        if (!tagInput || !tagsList) return;

        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                this.addTag(tagInput.value.trim());
                tagInput.value = '';
            } else if (e.key === 'Backspace' && tagInput.value === '' && this.tags.length > 0) {
                this.removeTag(this.tags[this.tags.length - 1]);
            }
        });

        tagInput.addEventListener('blur', () => {
            if (tagInput.value.trim()) {
                this.addTag(tagInput.value.trim());
                tagInput.value = '';
            }
        });

        tagsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag')) {
                const tag = e.target.parentElement.getAttribute('data-tag');
                this.removeTag(tag);
            }
        });
    },

    addTag(tag) {
        tag = tag.toLowerCase().trim().replace(/[^\w\s-]/g, '');
        if (!tag) return;

        if (this.tags.length >= this.maxTags) {
            ui.showError(`Maximum ${this.maxTags} tags allowed`);
            return;
        }

        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            this.renderTags();
        }
    },

    removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
        this.renderTags();
    },

    renderTags() {
        const tagsList = document.getElementById('tagsList');
        if (!tagsList) return;

        tagsList.innerHTML = this.tags.map(tag => `
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded" data-tag="${tag}">
                ${tag}
                <button type="button" class="remove-tag text-blue-600 hover:text-blue-800">×</button>
            </span>
        `).join('');
    },

    validateFiles(files) {
        const maxSize = 15 * 1024 * 1024; // 15MB
        const maxCompressedSize = 5 * 1024 * 1024; // 5MB for compressed images
        
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
    
        const allowedExtensions = [
            'jpg', 'jpeg', 'png', 'gif',
            'pdf', 'doc', 'docx', 'txt',
            'xls', 'xlsx', 'ppt', 'pptx'
        ];
    
        if (files.length > 7) {
            throw new Error('Maximum 7 files allowed');
        }
    
        for (let file of files) {
            // Special handling for images
            if (file.type.startsWith('image/')) {
                if (file.size > maxCompressedSize) {
                    throw new Error(`Image ${file.name} must be compressed to under 5MB`);
                }
            } else {
                // Non-image files
                if (file.size > maxSize) {
                    throw new Error(`File ${file.name} exceeds 15MB limit`);
                }
            }
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
                throw new Error(`File ${file.name} has unsupported format`);
            }
        }
    
        return true;
    },

    render() {
        const container = document.getElementById('createArticleFormContainer');
        if (!container) return;
    
        // Inside the render method, replace the sectionsOptions part with:
const sectionsOptions = [
    '<option value="">Select a section</option>',
    ...this.sections
        .filter(section => section.isActive !== false)  // Only show active sections
        .map(section => `
            <option value="${section._id}">
                ${section.name}
            </option>
        `)
].join('');
    
        container.innerHTML = `
            <form id="createArticleFormElement" class="space-y-6" enctype="multipart/form-data">
                <div class="space-y-2">
                    <label for="articleTitle" class="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" 
                        id="articleTitle" 
                        name="title"
                        required 
                        class="block w-full px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                </div>
                
                <div class="space-y-2">
                    <label for="sectionId" class="block text-sm font-medium text-gray-700">Section</label>
                    <select id="sectionId" 
                        name="sectionId"
                        class="block w-full px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        ${sectionsOptions}
                    </select>
                </div>

                <div id="expirationContainer" class="space-y-2 hidden">
                    <label for="expirationTime" class="block text-sm font-medium text-gray-700">Article Expiration</label>
                    <select id="expirationTime" 
                        name="expirationTime"
                        class="block w-full px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option value="">No expiration</option>
                        <option value="72h">72 Hours</option>
                        <option value="1w">1 Week</option>
                        <option value="1m">1 Month</option>
                    </select>
                    <p class="text-sm text-gray-500">After this time, the article will be automatically deleted</p>
                </div>

                <div class="space-y-2">
                    <label for="articleContent" class="block text-sm font-medium text-gray-700">Content</label>
                   <div class="space-y-2 bg-white rounded-md border border-gray-300">
                    <label for="articleContent" class="block text-sm font-medium text-gray-700 px-4 pt-4">Content</label>
                    <textarea id="articleContent" 
                        class="block w-full"
                        style="visibility: hidden"></textarea>
</div>
                </div>
    
                <div class="space-y-2">
                    <label for="articleTags" class="block text-sm font-medium text-gray-700">Tags</label>
                    <div class="flex flex-wrap gap-2 p-2 border rounded-md" id="tagContainer">
                        <input type="text" 
                            id="articleTags" 
                            placeholder="Add tags (press Enter or comma to add)"
                            class="flex-1 min-w-[200px] px-4 py-2 border-0 focus:ring-0 focus:outline-none">
                    </div>
                    <p class="text-sm text-gray-500">Separate tags with commas or press Enter. Maximum 10 tags.</p>
                    <div id="tagsList" class="flex flex-wrap gap-2"></div>
                </div>
    
                <div class="space-y-2">
                    <label for="articleFiles" class="block text-sm font-medium text-gray-700">Attachments</label>
                    <input type="file" 
                        id="articleFiles" 
                        name="files"
                        multiple 
                        class="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100">
                    <p class="mt-1 text-sm text-gray-500">Max 7 files. Supported formats: Images (JPEG, PNG, GIF), PDF, Word, Excel, PowerPoint, Text. Maximum 15MB per file.</p>
                </div>
                   <div id="fileUploadContainer" class="space-y-2">
                    <div id="selectedFilesList" class="mt-2 space-y-2"></div>
                </div>
    
                <div id="createArticleError" class="hidden text-red-600"></div>
                
                <div class="flex justify-end space-x-4 pt-4">
                    <button type="button" 
                        onclick="history.back()" 
                        class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                        Cancel
                    </button>
                    <button type="submit" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        Create Article
                    </button>
                </div>
            </form>
        `;

        const sectionSelect = document.getElementById('sectionId');
        if (sectionSelect) {
            sectionSelect.addEventListener('change', this.handleSectionChange.bind(this));
        }

        if (tinymce.get('articleContent')) {
            tinymce.get('articleContent').remove();
        }
    
        setTimeout(() => {
            this.initializeRichEditor();
            this.bindCreateForm();
            this.initializeTagHandling();
            this.renderTags();
        }, 0);
    }
};
