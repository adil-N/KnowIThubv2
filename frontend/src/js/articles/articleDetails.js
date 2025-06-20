// frontend/src/js/articles/articleDetails.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';
import { commentList } from '../comments/commentList.js';

// NEW: Import the FilePreview class and ExcelViewer
import { FilePreview } from '../utils/filePreview.js';
import { ExcelViewer } from '../utils/excelViewer.js';

// NEW: Initialize the file preview system
const filePreview = new FilePreview();

export const articleDetails = {
    currentArticle: null,
    articleId: null,

    // Core Methods
    // In articleDetails.js
async initialize(articleId) {
    console.log('Initializing article details for ID:', articleId);
    try {
        if (!articleId || articleId === 'undefined') {
            throw new Error('Invalid article ID');
        }

        this.articleId = articleId;
        
        const response = await api.get(`/api/articles/${articleId}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to load article');
        }

        this.currentArticle = response.data;
        await this.render();
        await this.loadComments();

    } catch (error) {
        console.error('Initialization error:', error);
        ui.showError(error.message || 'Failed to load article');
        throw error; // Re-throw to be caught by route handler
    }
},

async showArticle(articleId) {
    try {
        ui.showLoading();
        console.log('Fetching article:', articleId);
        
        const response = await api.get(`/api/articles/${articleId}`);
        console.log('Article response:', response);
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to load article');
        }

        this.articleId = articleId;
        this.currentArticle = response.data;
        
        // Ensure isBookmarked is properly set
        this.currentArticle.isBookmarked = response.data.isBookmarked || false;
        
        console.log('Article state set:', {
            id: this.currentArticle._id,
            isBookmarked: this.currentArticle.isBookmarked
        });
        
        await this.render();
    } catch (error) {
        console.error('Error loading article:', error);
        ui.showError('Failed to load article');
        throw error;
    } finally {
        ui.hideLoading();
    }
},
    
  


    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    async toggleBookmark() {
        try {
            console.log('Current article state:', this.currentArticle);
            
            // Handle both _id and id fields
            const articleId = this.currentArticle?._id || this.currentArticle?.id;
            
            if (!articleId) {
                console.error('Missing article ID:', this.currentArticle);
                ui.showError('No article selected');
                return;
            }
    
            const response = await api.post('/api/bookmarks/toggle', {
                articleId: articleId
            });
    
            console.log('Toggle bookmark response:', response);
    
            if (response.success) {
                // Extract bookmark state from response
                const isBookmarked = response.data?.isBookmarked ?? response.isBookmarked;
                
                // Update article state
                this.currentArticle.isBookmarked = isBookmarked;
                
                // Update UI
                this.updateBookmarkUI(isBookmarked);
                
                // Show success message
                ui.showSuccess(response.message);
            } else {
                throw new Error(response.message || 'Failed to toggle bookmark');
            }
        } catch (error) {
            console.error('Bookmark toggle error:', error);
            ui.showError('Failed to update bookmark');
        }
    },
    
    updateBookmarkUI(isBookmarked) {
        const bookmarkBtn = document.getElementById('bookmarkButton');
        if (!bookmarkBtn) return;
    
        if (isBookmarked) {
            bookmarkBtn.classList.add('bookmarked');
            bookmarkBtn.setAttribute('title', 'Remove from bookmarks');
            const icon = bookmarkBtn.querySelector('.bookmark-icon');
            if (icon) {
                icon.setAttribute('fill', 'currentColor');
            }
        } else {
            bookmarkBtn.classList.remove('bookmarked');
            bookmarkBtn.setAttribute('title', 'Add to bookmarks');
            const icon = bookmarkBtn.querySelector('.bookmark-icon');
            if (icon) {
                icon.setAttribute('fill', 'none');
            }
        }
    },

    // Rendering Methods
    render() {
        const articleDetails = document.getElementById('articleDetails');
        if (!articleDetails || !this.currentArticle) {
            console.error('Article details container not found or no article data');
            return;
        }
    
        const currentUser = auth.user.get();
        const permissions = this.checkArticlePermissions(currentUser, this.currentArticle);
    
        // Helper function to check if a section should be rendered
        const shouldRenderSection = (condition, content) => {
            return condition ? `
                <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                    ${content}
                </div>
            ` : '';
        };
    
        // Prepare metadata section content
        const metadataContent = (() => {
            const metadataItems = [];
    
            if (this.currentArticle.section) {
                metadataItems.push(`
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                        </svg>
                        <span class="text-sm text-gray-700">Section: ${this.currentArticle.section.name}</span>
                    </div>
                `);
            }
    
            if (this.currentArticle.isTemporary && this.currentArticle.expiresAt) {
                metadataItems.push(`
                    <div class="flex items-center text-red-600">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-sm">
                            Expires: ${new Date(this.currentArticle.expiresAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                `);
            }
    
            // If no metadata, show a placeholder
            if (metadataItems.length === 0) {
                metadataItems.push(`
                    <div class="text-sm text-gray-500 italic">
                        No additional metadata available
                    </div>
                `);
            }
    
            return `
                <div class="flex flex-wrap items-center gap-4">
                    ${metadataItems.join('')}
                </div>
            `;
        })();
    
        articleDetails.innerHTML = `
        <div class="pt-16 w-full px-4 space-y-6">
            <!-- Article Header Section -->
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500 w-full">
                <div class="flex items-start justify-between mb-4">
                    <h1 class="text-2xl font-bold text-gray-900 pr-4 flex-1 break-words">
                        ${this.escapeHtml(this.currentArticle.title)}
                    </h1>
                    <div class="flex items-center space-x-2">
                         <button id="bookmarkButton" 
    class="bookmark-btn ${this.currentArticle.isBookmarked ? 'bookmarked' : ''}"
    title="${this.currentArticle.isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}">
    <svg class="bookmark-icon" viewBox="0 0 24 24" 
         fill="${this.currentArticle.isBookmarked ? 'currentColor' : 'none'}" 
         stroke="currentColor" 
         stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
    <div class="bookmark-sparkle"></div>
</button>
                        <span class="inline-block text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            ${this.currentArticle.articleId || 'N/A'}
                        </span>
                    </div>
                </div>
                
                <div class="border-t pt-4 mt-4">
                    <div class="flex flex-wrap justify-between text-sm text-gray-600 space-y-2 md:space-y-0">
                        <div>
                            <span class="font-medium">Author:</span> 
                            ${this.currentArticle.author?.firstName || 'Unknown'} ${this.currentArticle.author?.lastName || ''}
                        </div>
                        <div>
                            <span class="font-medium">Created:</span> 
                            ${new Date(this.currentArticle.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                        ${this.currentArticle.lastContentUpdate ? `
                            <div class="text-blue-600">
                                <span class="font-medium">Last Updated:</span> 
                                ${new Date(this.currentArticle.lastContentUpdate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
    
            <!-- Metadata Section -->
            ${shouldRenderSection(
                this.currentArticle.section || this.currentArticle.isTemporary, 
                metadataContent
            )}
    
           <!-- Tags Sections -->
            <!-- Manual Tags Section -->
            ${(this.currentArticle.tags && this.currentArticle.tags.length > 0) ? 
                shouldRenderSection(true, `
                    <div class="flex flex-col space-y-4">
                        ${this.renderTags()}
                    </div>
                `) : ''
            }
            
            <!-- Auto Tags Section -->
            ${(this.currentArticle.autoTags && this.currentArticle.autoTags.length > 0) ? 
                shouldRenderSection(true, `
                    <div class="flex flex-col space-y-4">
                        ${this.renderAutoTags()}
                    </div>
                `) : ''
            }
    
            <!-- Article Content Section -->
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-indigo-500 w-full">
                <div class="prose max-w-none break-words article-content">
                    ${this.currentArticle.content || 
                        '<p class="text-gray-500 italic">No content available</p>'}
                </div>
            </div>
    
            <!-- Files Section -->
            ${this.renderFiles() ? `
                <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500 w-full">
                    <h3 class="text-lg font-semibold mb-4 text-gray-800">Attached Files</h3>
                    ${this.renderFiles()}
                </div>
            ` : ''}
    
            <!-- Action Buttons -->
            <div class="flex justify-end space-x-4 mt-6 w-full">
                ${permissions.canEdit ? `
                    <button id="editArticleBtn" 
                        class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-300">
                        Edit Article
                    </button>
                ` : ''}
                
                ${permissions.canDelete ? `
                    <button id="deleteArticleBtn" 
                        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition duration-300">
                        Delete Article
                    </button>
                ` : ''}
                
                <button id="backToArticlesBtn" 
                    class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition duration-300">
                    Back to Articles
                </button>
            </div>
    
            <!-- Comments Section -->
            <div id="commentsSection" class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500 mt-6 w-full">
                <h3 class="text-xl font-bold mb-4">Comments</h3>
                <div id="commentsList" class="space-y-4 max-w-full"></div>
                
                <form id="commentForm" class="mt-6">
                    <textarea 
                        id="commentContent" 
                        class="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                        placeholder="Write a comment..."></textarea>
                    <button type="submit" 
                        class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200">
                        Add Comment
                    </button>
                </form>
            </div>
        </div>
        `;
    
        this.attachEventListeners();
    },

    // Update the renderFiles method in articleDetails.js

// In articleDetails.js, update the renderFiles method

// Update your renderFiles method to show preview availability
renderFiles() {
    if (!this.currentArticle.files?.length) return '';

    return `
        <div class="border-t border-b py-4 my-6">
            <h3 class="font-semibold mb-2">Attached Files</h3>
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${this.currentArticle.files.map(file => {
                    const fileType = this.getFileType(file.filename);
                    const iconClass = this.getFileIconClass(fileType);
                    const displayName = file.originalname || file.filename;
                    const fileSize = file.size ? this.formatFileSize(file.size) : '';
                    const isPreviewable = this.isFilePreviewable(file.filename);
                    
                    return `
                        <li class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <span class="${iconClass} w-8 h-8 mr-3 flex items-center justify-center">
                                ${this.getFileIcon(fileType)}
                            </span>
                            <div class="flex-grow min-w-0">
                                <p class="text-sm font-medium truncate" title="${displayName}">
                                    ${displayName}
                                </p>
                                ${fileSize ? `
                                    <p class="text-xs text-gray-500">
                                        ${fileSize}
                                    </p>
                                ` : ''}
                                ${fileType === 'excel' ? `
                                    <p class="text-xs text-green-600 font-medium">
                                        ✓ Viewable in browser
                                    </p>
                                ` : ''}
                            </div>
                            <div class="flex space-x-2 flex-shrink-0">
                                ${isPreviewable ? `
                                    <button 
                                        data-action="preview-file"
                                        data-filename="${file.filename}"
                                        class="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                                        title="Preview ${fileType === 'excel' ? 'Excel spreadsheet' : 'file'} in browser">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    </button>
                                ` : `
                                    <span class="p-2 text-gray-400" title="Preview not available">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L5.64 5.64m4.242 4.242L15.12 15.12M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                    </span>
                                `}
                                <a 
                                    href="/uploads/files/${file.filename}?download=true"
                                    class="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                                    title="Download"
                                    download="${displayName}">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                    </svg>
                                </a>
                            </div>
                        </li>
                    `;
                }).join('')}
            </ul>
        </div>
    `;
},

// Add this helper method to check if a file is previewable
isFilePreviewable(filename) {
    if (!filename) return false;
    const ext = filename.toLowerCase().split('.').pop();
    const previewableExtensions = ['pdf', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'csv'];
    return previewableExtensions.includes(ext);
},

getFileIcon(fileType) {
    switch (fileType) {
        case 'image':
            return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
        case 'pdf':
            return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>';
        case 'word':
            return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
        case 'excel':
            return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
        default:
            return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>';
    }
},

getFileIconClass(fileType) {
    const baseClass = 'flex items-center justify-center rounded-lg';
    switch (fileType) {
        case 'image':
            return `${baseClass} text-white bg-green-500`;
        case 'pdf':
            return `${baseClass} text-white bg-red-500`;
        case 'word':
            return `${baseClass} text-white bg-blue-500`;
        case 'excel':
            return `${baseClass} text-white bg-emerald-500`;
        case 'powerpoint':
            return `${baseClass} text-white bg-orange-500`;
        case 'text':
            return `${baseClass} text-white bg-gray-500`;
        default:
            return `${baseClass} text-white bg-gray-400`;
    }
},

formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
},

getFileType(filename) {
    if (!filename) return 'unknown';
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
    if (['txt', 'md'].includes(ext)) return 'text';
    return 'other';
},

getFileIconClass(fileType) {
    const baseClass = 'flex items-center justify-center text-white rounded-lg';
    switch (fileType) {
        case 'image':
            return `${baseClass} bg-green-500`;
        case 'pdf':
            return `${baseClass} bg-red-500`;
        case 'word':
            return `${baseClass} bg-blue-500`;
        case 'excel':
            return `${baseClass} bg-emerald-500`;
        case 'powerpoint':
            return `${baseClass} bg-orange-500`;
        case 'text':
            return `${baseClass} bg-gray-500`;
        default:
            return `${baseClass} bg-gray-400`;
    }
},

formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
},


getFileIconClass(fileType) {
    const baseClass = 'flex items-center justify-center text-white rounded-lg';
    switch (fileType) {
        case 'image':
            return `${baseClass} bg-green-500`;
        case 'pdf':
            return `${baseClass} bg-red-500`;
        case 'word':
            return `${baseClass} bg-blue-500`;
        case 'excel':
            return `${baseClass} bg-emerald-500`;
        case 'powerpoint':
            return `${baseClass} bg-orange-500`;
        case 'text':
            return `${baseClass} bg-gray-500`;
        default:
            return `${baseClass} bg-gray-400`;
    }
},

formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
},







    // Update the renderTags method in articleDetails.js
    renderTags() {
        if (!this.currentArticle || !Array.isArray(this.currentArticle.tags) || this.currentArticle.tags.length === 0) {
            console.log('No tags available for article');
            return '';
        }
    
        return `
            <div class="mb-4">
                <div class="flex flex-wrap gap-2">
                    <span class="text-sm text-gray-600 font-medium">Tags:</span>
                    ${this.currentArticle.tags.map(tag => `
                        <button type="button"
                            class="tag-link inline-flex items-center px-3 py-1 rounded-full text-sm 
                                   bg-blue-100 text-blue-800 hover:bg-blue-200 
                                   transition-colors duration-200"
                            data-tag="${this.escapeHtml(tag.toLowerCase())}"
                            onclick="(function() {
                                const searchInput = document.getElementById('searchInput');
                                const searchForm = document.getElementById('searchForm');
                                if (searchInput && searchForm) {
                                    searchInput.value = '#${this.escapeHtml(tag.toLowerCase())}';
                                    searchInput.dispatchEvent(new Event('input'));
                                    searchForm.dispatchEvent(new Event('submit'));
                                }
                                window.location.hash = '#articles';
                            })()">
                            <span class="mr-1 text-blue-600">#</span>
                            <span>${this.escapeHtml(tag)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },
    




    renderAutoTags() {
        // Ensure autoTags is defined and is an array, defaulting to empty array if undefined
        const autoTags = this.currentArticle?.autoTags || [];
        
        // Debug log to track auto tags
        console.log('Auto tags available:', {
            articleId: this.currentArticle?._id,
            autoTagsCount: autoTags.length,
            autoTags
        });

        if (!Array.isArray(autoTags) || autoTags.length === 0) {
            console.log('No auto tags available for article');
            return '';
        }
    
        return `
            <div class="mt-4 mb-6">
                <div class="flex flex-wrap gap-2">
                    <span class="text-sm text-gray-600 font-medium">Related Topics:</span>
                    ${this.currentArticle.autoTags.map(tag => `
                        <button type="button"
                            class="tag-link inline-flex items-center px-3 py-1 rounded-full text-sm 
                                   bg-blue-100 text-blue-800 hover:bg-blue-200 
                                   transition-colors duration-200"
                            data-tag="${this.escapeHtml(tag.toLowerCase())}"
                            onclick="(function() {
                                const searchInput = document.getElementById('searchInput');
                                const searchForm = document.getElementById('searchForm');
                                if (searchInput && searchForm) {
                                    searchInput.value = '#${this.escapeHtml(tag.toLowerCase())}';
                                    searchInput.dispatchEvent(new Event('input'));
                                    searchForm.dispatchEvent(new Event('submit'));
                                }
                                window.location.hash = '#articles';
                            })()">
                            <span class="mr-1 text-blue-600">#</span>
                            <span>${this.escapeHtml(tag)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },


    renderComment(comment) {
        const currentUser = auth.user.get();
        const isOwner = currentUser && comment.author && 
                       String(currentUser._id) === String(comment.author._id);
        const isAdmin = currentUser && ['admin', 'super'].includes(currentUser.role);
        const canModify = isOwner || isAdmin;
        const isLiked = comment.likes?.includes(currentUser._id);

        return `
            <div class="bg-white p-4 rounded-lg shadow mb-4" id="comment-${comment._id}">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-semibold">
                            ${comment.author?.firstName || 'Unknown'} ${comment.author?.lastName || ''}
                        </p>
                        <p class="text-sm text-gray-500">
                            ${new Date(comment.createdAt).toLocaleString()}
                        </p>
                    </div>
                    ${canModify ? `
                        <div class="flex space-x-2">
                            <button class="text-blue-600 hover:text-blue-800"
                                data-action="edit-comment" 
                                data-comment-id="${comment._id}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button class="text-red-600 hover:text-red-800"
                                data-action="delete-comment" 
                                data-comment-id="${comment._id}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
                ${article.isTemporary && article.expiresAt ? `
                    <div class="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Expires: ${this.formatDate(article.expiresAt)} (${this.getTimeUntilExpiry(article.expiresAt)})
                    </div>
                ` : ''}
                <div class="mt-2 text-gray-700" id="comment-content-${comment._id}">
                ${comment.content}  // Removed escapeHtml since we'll still want regular text for comments
            </div>
                <div class="mt-3 flex items-center space-x-4">
                    <button class="flex items-center text-sm text-gray-500 hover:text-blue-600 ${isLiked ? 'text-blue-600' : ''}"
                        data-action="like-comment" 
                        data-comment-id="${comment._id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="${isLiked ? 'currentColor' : 'none'}" 
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span>${comment.likes?.length || 0}</span>
                    </button>
                </div>
            </div>
        `;
    },

    // Comments Handling
    async loadComments() {
    try {
        const articleId = this.currentArticle?._id || this.articleId;
        
        if (!articleId) {
            console.error('No article ID available for loading comments');
            return;
        }

        console.log('Initializing comments for article:', articleId);
        await commentList.init('article', articleId);
        
    } catch (error) {
        console.error('Error loading comments:', error);
        ui.showError('Failed to load comments');
    }
},
async handleAddComment(event) {
    event.preventDefault();
    
    if (!auth.isAuthenticated()) {
        ui.showError('Please login to add comments');
        window.location.hash = '#login';
        return;
    }

    const articleId = this.currentArticle?._id || this.articleId;
    if (!articleId) {
        ui.showError('Cannot add comment: Article not found');
        return;
    }

    const commentContent = document.getElementById('commentContent');
    const content = commentContent.value.trim();
    
    if (!content) {
        ui.showError('Comment cannot be empty');
        return;
    }

    try {
        ui.showLoading();
        const response = await api.post(`/api/articles/${articleId}/comments`, {
            content: content
        });
        
        if (response.success) {
            commentContent.value = '';
            await commentList.loadComments(); // Use commentList's method
            ui.showError('Comment added successfully', 'success');
        } else {
            throw new Error(response.message || 'Failed to add comment');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        ui.showError(error.message || 'Failed to add comment');
    } finally {
        ui.hideLoading();
    }
},

    async handleDeleteComment(commentId) {
        if (!commentId) return;
        
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }
    
        try {
            const articleId = this.currentArticle?._id || this.articleId;
            
            if (!articleId) {
                throw new Error('Article ID not found');
            }
    
            console.log('Deleting comment:', {
                articleId,
                commentId,
                currentArticle: this.currentArticle,
                storedArticleId: this.articleId
            });
    
            ui.showLoading();
            
            const response = await api.delete(
                `/api/articles/${articleId}/comments/${commentId}`
            );
    
            if (response.success) {
                await this.loadComments();
                ui.showError('Comment deleted successfully', 'success');
            } else {
                throw new Error(response.message || 'Error deleting comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            ui.showError(error.message || 'Failed to delete comment');
        } finally {
            ui.hideLoading();
        }
    },

    // Article Operations
    async handleDeleteArticle() {
        if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
            return;
        }
    
        try {
            ui.showLoading();
            const response = await api.delete(`/api/articles/${this.currentArticle._id}`);
            
            if (response.success) {
                ui.showError('Article deleted successfully', 'success');
                window.location.hash = '#articles';
            } else {
                throw new Error(response.message || 'Failed to delete article');
            }
        } catch (error) {
            console.error('Error deleting article:', error);
            ui.showError(error.message || 'Failed to delete article');
        } finally {
            ui.hideLoading();
        }
    },

    // Utility Methods
    checkArticlePermissions(currentUser, article) {
        if (!currentUser || !currentUser._id) {
            console.log('No valid user data');
            return {
                canEdit: false,
                canDelete: false,
                canView: true
            };
        }

        if (!article || !article.author || !article.author._id) {
            console.log('No valid article or author data');
            return {
                canEdit: false,
                canDelete: false,
                canView: true
            };
        }

        const userId = String(currentUser._id);
        const authorId = String(article.author._id);
        const isAuthor = userId === authorId;
        const isAdmin = ['admin', 'super'].includes(currentUser.role);

        return {
            canEdit: isAuthor || isAdmin,
            canDelete: isAuthor || isAdmin,
            canView: true
        };
    },
// Add this method to the articleDetails object, just before attachEventListeners
// Replace your existing handleFilePreview method with this:

async handleFilePreview(file) {

 // Quick test for Excel files
    if (file.filename.toLowerCase().includes('.xlsx') || file.filename.toLowerCase().includes('.xls')) {
        console.log('This is an Excel file, should show Excel viewer');
        
        // Test if XLSX library is available
        if (typeof XLSX !== 'undefined') {
            console.log('XLSX library is available');
        } else {
            console.error('XLSX library NOT available');
        }
    }

        if (!file || !file.filename) {
            console.error('Invalid file for preview');
            return;
        }

        console.log('Previewing file:', file); // Debug log

        // Create or get preview modal
        let modal = document.getElementById('filePreviewModal');
        if (!modal) {
            modal = this.createPreviewModal();
            document.body.appendChild(modal);
        }

        // Show modal with loading state
        modal.classList.remove('hidden');
        const previewContainer = modal.querySelector('#previewContainer');
        
        // Show loading state
        previewContainer.innerHTML = `
            <div class="flex items-center justify-center p-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-2">Loading preview...</span>
            </div>
        `;
        
        try {
            // Use the enhanced file preview system
            await filePreview.previewFile(file.filename, previewContainer);
        } catch (error) {
            console.error('Preview error:', error);
            previewContainer.innerHTML = `
                <div class="text-center p-8 text-red-600">
                    <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <h4 class="text-xl font-semibold text-red-700 mb-2">Preview Error</h4>
                    <p class="text-red-500">Error loading preview: ${error.message}</p>
                </div>
            `;
        }
    },

    // ADD this new method to create the preview modal
    createPreviewModal() {
        const modal = document.createElement('div');
        modal.id = 'filePreviewModal';
        modal.className = 'hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">File Preview</h3>
                    <button id="closePreviewModal" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div id="previewContainer" class="min-h-96">
                    <!-- Preview content will be loaded here -->
                </div>
            </div>
        `;
        
        // Add close functionality
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
        
        modal.querySelector('#closePreviewModal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });
        
        return modal;
    },

    // ADD this helper method
    isFilePreviewable(filename) {
        if (!filename) return false;
        const ext = filename.toLowerCase().split('.').pop();
        const previewableExtensions = ['pdf', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'csv'];
        return previewableExtensions.includes(ext);
    },

// Add this new method to create the preview modal
createPreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'filePreviewModal';
    modal.className = 'hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    modal.innerHTML = `
        <div class="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-gray-900">File Preview</h3>
                <button id="closePreviewModal" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div id="previewContainer" class="min-h-96">
                <!-- Preview content will be loaded here -->
            </div>
        </div>
    `;
    
    // Add close functionality
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    modal.querySelector('#closePreviewModal').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    });
    
    return modal;
},
    // Event Listeners
    attachEventListeners() {
        // Previous button listeners remain the same
        document.getElementById('editArticleBtn')?.addEventListener('click', () => {
            window.location.hash = `#edit-article/${this.currentArticle._id}`;
        });
    
        document.getElementById('deleteArticleBtn')?.addEventListener('click', 
            this.handleDeleteArticle.bind(this));
    
        document.getElementById('backToArticlesBtn')?.addEventListener('click', () => {
            window.location.hash = '#articles';
        });
         // Add this new section for the bookmark button
    const bookmarkButton = document.getElementById('bookmarkButton');
    if (bookmarkButton) {
        bookmarkButton.addEventListener('click', () => this.toggleBookmark());
    }
        // Add file preview event listener
    const articleDetails = document.getElementById('articleDetails');
    if (articleDetails) {
        articleDetails.addEventListener('click', (e) => {
            const previewButton = e.target.closest('[data-action="preview-file"]');
            if (previewButton) {
                e.preventDefault();
                const filename = previewButton.getAttribute('data-filename');
                
                // Find the file in the current article's files
                const fileToPreview = this.currentArticle.files.find(
                    file => file.filename === filename
                );
                
                if (fileToPreview) {
                    this.handleFilePreview(fileToPreview);
                }
            }
        });
    }

    // Add tag click handler
    document.addEventListener('click', async (e) => {
        const tagButton = e.target.closest('.tag-link');
        if (tagButton) {
            e.preventDefault();
            e.stopPropagation();

            const tag = tagButton.getAttribute('data-tag');
            if (tag) {
                const searchInput = document.getElementById('searchInput');
                const searchForm = document.getElementById('searchForm');
                
                if (searchInput && searchForm) {
                    searchInput.value = `#${tag}`;
                    searchInput.dispatchEvent(new Event('input'));
                    await new Promise(resolve => setTimeout(resolve, 0)); // Let the input event process
                    searchForm.dispatchEvent(new Event('submit'));
                    window.location.hash = '#articles';
                }
            }
        }
    });
    
        // Only handle the comment form submission
        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => this.handleAddComment(e));
        }
    

        const commentsList = document.getElementById('commentsList');
        if (commentsList) {
            commentsList.addEventListener('click', async (e) => {
                const button = e.target.closest('[data-action]');
                if (!button) return;

                const action = button.dataset.action;
                const commentId = button.dataset.commentId;

                if (!commentId) return;

                switch (action) {
                    case 'delete-comment':
                        await this.handleDeleteComment(commentId);
                        break;
                    case 'edit-comment':
                        await this.handleEditComment(commentId);
                        break;
                    case 'like-comment':
                        await this.handleLikeComment(commentId);
                        break;
                }
            });
        }
    },
    
    async handleEditComment(commentId) {
        const commentDiv = document.getElementById(`comment-content-${commentId}`);
        if (!commentDiv) return;
    
        const currentContent = commentDiv.textContent.trim();
    
        // Create edit form
        const editForm = document.createElement('div');
        editForm.innerHTML = `
            <textarea class="w-full p-2 border rounded-md mb-2"
                id="edit-comment-${commentId}"
                rows="3">${this.escapeHtml(currentContent)}</textarea>
            <div class="flex justify-end space-x-2">
                <button type="button" 
                    class="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    data-action="cancel-edit"
                    data-comment-id="${commentId}">
                    Cancel
                </button>
                <button type="button"
                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    data-action="save-edit"
                    data-comment-id="${commentId}">
                    Save
                </button>
            </div>
        `;
    
        commentDiv.replaceWith(editForm);
    
        // Add event listeners for save and cancel
        editForm.addEventListener('click', async (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;
    
            const action = button.dataset.action;
            const articleId = this.currentArticle?._id || this.articleId;
    
            if (!articleId) {
                ui.showError('Article ID not found');
                return;
            }
    
            if (action === 'cancel-edit') {
                commentDiv.innerHTML = this.escapeHtml(currentContent);
                editForm.replaceWith(commentDiv);
            } else if (action === 'save-edit') {
                const newContent = document.getElementById(`edit-comment-${commentId}`).value.trim();
                
                if (!newContent) {
                    ui.showError('Comment cannot be empty');
                    return;
                }
    
                if (newContent === currentContent) {
                    editForm.replaceWith(commentDiv);
                    return;
                }
    
                try {
                    ui.showLoading();
                    const response = await api.put(
                        `/api/articles/${articleId}/comments/${commentId}`,
                        { content: newContent }
                    );
    
                    if (response.success) {
                        await this.loadComments();
                        ui.showError('Comment updated successfully', 'success');
                    } else {
                        throw new Error(response.message || 'Error updating comment');
                    }
                } catch (error) {
                    console.error('Error updating comment:', error);
                    ui.showError(error.message || 'Failed to update comment');
                    editForm.replaceWith(commentDiv);
                } finally {
                    ui.hideLoading();
                }
            }
        });
    },

    async handleLikeComment(commentId) {
        try {
            if (!this.articleId && !this.currentArticle?._id) {
                throw new Error('Article ID not found');
            }
    
            const articleId = this.currentArticle?._id || this.articleId;
            
            console.log('Liking comment:', {
                articleId,
                commentId,
                currentArticle: this.currentArticle,
                storedArticleId: this.articleId
            });
    
            ui.showLoading();
            const response = await api.post(
                `/api/articles/${articleId}/comments/${commentId}/like`
            );
    
            if (response.success) {
                await this.loadComments();
            } else {
                throw new Error(response.message || 'Error toggling like status');
            }
        } catch (error) {
            console.error('Error liking comment:', error);
            ui.showError(error.message || 'Failed to like comment');
        } finally {
            ui.hideLoading();
        }
    },
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};