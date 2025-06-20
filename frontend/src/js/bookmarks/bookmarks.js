// frontend/src/js/bookmarks/bookmarks.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';


class Bookmarks {
    constructor() {
        this.initialized = false;
        this.boundHandleClick = this.handleClick.bind(this);
    }

    async initialize() {
    try {
        if (this.initialized) {
            return true;
        }

        ui.showLoading();

        const response = await api.get('/api/bookmarks');
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to load bookmarks');
        }

        const bookmarksSection = document.getElementById('bookmarksSection');
        if (!bookmarksSection) {
            console.error('Bookmarks section not found');
            return false;
        }

        bookmarksSection.className = 'relative w-full';

        // Improved layout with proper padding and responsive design
        bookmarksSection.innerHTML = `
        <div class="min-h-screen bg-gray-50" style="margin-left: ${document.body.classList.contains('sidebar-collapsed') ? '2rem' : '13rem'}; transition: margin-left 0.3s ease;">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
                <!-- Header Section -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="p-2 bg-blue-100 rounded-lg">
                                <span class="material-icons-outlined text-blue-600 text-2xl">bookmark</span>
                            </div>
                            <div>
                                <h1 class="text-3xl font-bold text-gray-900">My Bookmarks</h1>
                                <p class="text-gray-600 mt-1">Manage your saved articles</p>
                            </div>
                        </div>
                        <div id="bookmarkStats" class="text-right">
                            <div class="text-2xl font-bold text-blue-600" id="bookmarkCount">0</div>
                            <div class="text-sm text-gray-500">Articles saved</div>
                        </div>
                    </div>
                </div>
                
                <!-- Empty State -->
                <div id="noBookmarksMessage" class="hidden">
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <div class="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <span class="material-icons-outlined text-gray-400 text-4xl">bookmark_border</span>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">No bookmarks yet</h3>
                        <p class="text-gray-600 mb-6 max-w-sm mx-auto">
                            Start bookmarking articles to create your personal reading list. 
                            Click the bookmark icon on any article to save it here.
                        </p>
                        <a href="#articles" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <span class="material-icons-outlined text-sm mr-2">explore</span>
                            Browse Articles
                        </a>
                    </div>
                </div>

                <!-- Bookmarks Grid -->
                <div id="bookmarksContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                </div>
            </div>
        </div>
        `;

        const container = document.getElementById('bookmarksContainer');
        const noBookmarksMessage = document.getElementById('noBookmarksMessage');
        const bookmarkCount = document.getElementById('bookmarkCount');

        if (!container || !noBookmarksMessage) {
            console.error('Required elements not found');
            return false;
        }

        const bookmarkedArticles = response.data || [];
        localStorage.setItem('userBookmarks', JSON.stringify(bookmarkedArticles));

        // Update bookmark count
        if (bookmarkCount) {
            bookmarkCount.textContent = bookmarkedArticles.length;
        }

        // Add sidebar state observer
        const mainContainer = bookmarksSection.querySelector('.min-h-screen');
        if (mainContainer) {
            const observer = new MutationObserver(() => {
                mainContainer.style.marginLeft = document.body.classList.contains('sidebar-collapsed') ? '2rem' : '13rem';
            });
            
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            this.observer = observer;
        }

        if (bookmarkedArticles.length === 0) {
            noBookmarksMessage.classList.remove('hidden');
            container.innerHTML = '';
        } else {
            noBookmarksMessage.classList.add('hidden');
            this.renderBookmarks(bookmarkedArticles);
        }

        container.addEventListener('click', this.boundHandleClick);
        this.initialized = true;
        return true;

    } catch (error) {
        console.error('Bookmarks load error:', error);
        ui.showError(error.message || 'Error loading bookmarks');
        return false;
    } finally {
        ui.hideLoading();
    }
}

    cleanup() {
        this.initialized = false;
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        const bookmarksSection = document.getElementById('bookmarksSection');
        if (bookmarksSection) {
            const container = document.getElementById('bookmarksContainer');
            if (container) {
                container.removeEventListener('click', this.boundHandleClick);
            }
            bookmarksSection.innerHTML = '';
            bookmarksSection.className = 'hidden';
        }
        localStorage.removeItem('userBookmarks');
    }

    // Keep all other methods the same
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    renderBookmarks(bookmarkedArticles) {
    const container = document.getElementById('bookmarksContainer');
    if (!container) return;

    container.innerHTML = bookmarkedArticles.map(article => {
        if (!article || !article._id) return '';

        const authorName = article.author ? 
            `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim() || 'Unknown Author' :
            'Unknown Author';

        // Truncate content for preview
        const contentPreview = article.content ? 
            article.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : 
            'No preview available';

        const sectionNames = article.sections?.map(s => this.escapeHtml(s.name)).join(', ') || 'Uncategorized';

        return `
            <div class="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden" 
                 data-article-id="${article._id}">
                
                <!-- Article Content -->
                <div class="p-6">
                    <!-- Header -->
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1 min-w-0">
                            <a href="#article/${article._id}" 
                               class="block text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors group-hover:text-blue-700 leading-tight mb-2 line-clamp-2">
                                ${this.escapeHtml(article.title)}
                            </a>
                            
                            <!-- Sections Badge -->
                            <div class="flex items-center space-x-2 mb-3">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <span class="material-icons-outlined text-xs mr-1">folder</span>
                                    ${sectionNames}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Bookmark Action -->
                        <button 
                            type="button"
                            class="remove-bookmark-btn ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 flex-shrink-0"
                            data-article-id="${article._id}"
                            title="Remove bookmark">
                            <span class="material-icons-outlined text-lg">bookmark_remove</span>
                        </button>
                    </div>

                    <!-- Content Preview -->
                    <p class="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                        ${this.escapeHtml(contentPreview)}
                    </p>

                    <!-- Footer -->
                    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div class="flex items-center space-x-3">
                            <div class="flex items-center text-xs text-gray-500">
                                <span class="material-icons-outlined text-sm mr-1">person</span>
                                <span class="font-medium">${authorName}</span>
                            </div>
                        </div>
                        
                        <div class="flex items-center text-xs text-gray-500">
                            <span class="material-icons-outlined text-sm mr-1">schedule</span>
                            <time datetime="${article.createdAt}">
                                ${new Date(article.createdAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                })}
                            </time>
                        </div>
                    </div>
                </div>

                <!-- Action Bar (appears on hover) -->
                <div class="bg-gray-50 px-6 py-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div class="flex items-center justify-between">
                        <a href="#article/${article._id}" 
                           class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                            <span class="material-icons-outlined text-sm mr-1">read_more</span>
                            Read Article
                        </a>
                        
                        <button 
                            type="button"
                            class="remove-bookmark-btn inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                            data-article-id="${article._id}">
                            <span class="material-icons-outlined text-sm mr-1">delete_outline</span>
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add custom CSS for line clamping if not already present
    if (!document.getElementById('bookmark-styles')) {
        const style = document.createElement('style');
        style.id = 'bookmark-styles';
        style.textContent = `
            .line-clamp-2 {
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .line-clamp-3 {
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
        `;
        document.head.appendChild(style);
    }
}

    handleClick(e) {
        const removeBtn = e.target.closest('.remove-bookmark-btn');
        if (!removeBtn) return;
    
        e.preventDefault();
        e.stopPropagation();
    
        const bookmarkContainer = removeBtn.closest('[data-article-id]');
        const articleId = bookmarkContainer ? bookmarkContainer.getAttribute('data-article-id') : null;
    
        if (!articleId) {
            console.error('No article ID found for removal');
            ui.showError('Failed to identify article for removal');
            return;
        }
    
        this.removeBookmark(articleId);
    }
// Enhance bookmark handling with more logging
async addBookmark(articleId) {
    try {
        console.log('Attempting to bookmark article:', {
            articleId: articleId,
            type: typeof articleId
        });

        // Validate article ID
        if (!articleId) {
            console.error('No article ID provided');
            ui.showError('Please select a valid article to bookmark');
            return;
        }

        ui.showLoading();
        
        const response = await api.post('/api/bookmarks', { articleId });
        
        console.log('Bookmark API Response:', {
            success: response.success,
            message: response.message,
            data: response.data
        });

        if (response.success) {
            ui.showSuccess('Article bookmarked successfully');
            // Optional: Update local storage or UI
        } else {
            throw new Error(response.message || 'Failed to bookmark article');
        }
    } catch (error) {
        console.error('Bookmark error details:', {
            message: error.message,
            stack: error.stack
        });
        ui.showError(error.message || 'Error bookmarking article');
    } finally {
        ui.hideLoading();
    }
}
    async removeBookmark(articleId) {
        try {
            ui.showLoading();
            
            const response = await api.delete(`/api/bookmarks/${articleId}`);
            
            if (response.success) {
                const bookmarkElement = document.querySelector(`[data-article-id="${articleId}"]`);
                if (bookmarkElement) {
                    bookmarkElement.remove();
    
                    const container = document.getElementById('bookmarksContainer');
                    if (container && container.children.length === 0) {
                        const noBookmarksMessage = document.getElementById('noBookmarksMessage');
                        if (noBookmarksMessage) {
                            noBookmarksMessage.classList.remove('hidden');
                        }
                    }
                }
                ui.showSuccess('Bookmark removed');
            } else {
                throw new Error(response.message || 'Failed to remove bookmark');
            }
        } catch (error) {
            console.error('Remove bookmark error:', error);
            ui.showError(error.message || 'Error removing bookmark');
        } finally {
            ui.hideLoading();
        }
    }
}

const bookmarksInstance = new Bookmarks();
export default bookmarksInstance;
export const bookmarks = bookmarksInstance;
window.bookmarks = bookmarksInstance;