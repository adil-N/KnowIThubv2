// frontend/src/js/articles/articleSearch.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js'; 

const SEARCH_HISTORY_KEY = 'articleSearchHistory';
const MAX_SEARCH_HISTORY = 10; 

class SearchHistory {
    static getHistory() {
        try {
            const history = localStorage.getItem(SEARCH_HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error retrieving search history:', error);
            return [];
        }
    }

    static addToHistory(searchTerm) {
        if (!searchTerm) return;

        try {
            const history = this.getHistory();
            
            const cleanedSearchTerm = searchTerm.trim();
            
            const filteredHistory = history.filter(term => term !== cleanedSearchTerm);
            
            filteredHistory.unshift(cleanedSearchTerm);
            
            const updatedHistory = filteredHistory.slice(0, MAX_SEARCH_HISTORY);
            
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    static clearHistory() {
        try {
            localStorage.removeItem(SEARCH_HISTORY_KEY);
        } catch (error) {
            console.error('Error clearing search history:', error);
        }
    }
}

export const articleSearch = {
    initialize() {
        console.log('Initializing article search...');
        const searchForm = document.getElementById('searchForm');
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        // Just bind the events without touching visibility
        if (searchForm && searchInput && clearSearch) {
            this.bindSearchEvents();
        }
        
        console.log('Search elements:', {
            searchForm: !!searchForm,
            searchInput: !!searchInput,
            clearSearch: !!clearSearch
        });
    },
    bindSearchEvents() {
        console.log('Binding search events...');
        const searchForm = document.getElementById('searchForm');
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        if (searchForm && searchInput && clearSearch) {
            // Handle form submission
            searchForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Search form submitted');
                
                const searchTerm = searchInput.value.trim();
                if (!searchTerm) return;
                
                try {
                    await this.handleSearch(e);
                } catch (error) {
                    console.error('Error during search:', error);
                }
            });
    
            // Handle input changes for clear button
            searchInput.addEventListener('input', (e) => {
                clearSearch.classList.toggle('hidden', e.target.value.trim() === '');
            });
    
            // Handle clear button
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                clearSearch.classList.add('hidden');
            });
    
            console.log('Search events bound successfully');
        } else {
            console.error('Some search elements not found:', {
                searchForm: !!searchForm,
                searchInput: !!searchInput,
                clearSearch: !!clearSearch
            });
        }
    },

    async showTagSuggestions(tagQuery) {
        try {
            const tagSuggestions = document.getElementById('tagSuggestions');
            if (!tagSuggestions) return;

            const response = await api.get(`/api/articles/tags/suggestions?q=${encodeURIComponent(tagQuery)}`);
            if (response.success && response.data.length > 0) {
                const suggestionsHtml = response.data.map(tag => `
                    <div class="tag-suggestion p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                         data-tag="${tag}">
                        <span class="text-blue-600 mr-1">#</span>
                        <span>${tag}</span>
                        <span class="text-gray-400 text-sm ml-auto">Tag</span>
                    </div>
                `).join('');

                tagSuggestions.innerHTML = suggestionsHtml;
                tagSuggestions.classList.remove('hidden');
            } else {
                tagSuggestions.innerHTML = `
                    <div class="p-2 text-gray-500">
                        No tags found matching "${tagQuery}"
                    </div>
                `;
                tagSuggestions.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error fetching tag suggestions:', error);
            ui.showError('Error loading tag suggestions');
        }
    },

    async handleSearch(event) {
        event.preventDefault();
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput.value.trim();
    
        if (!searchTerm) return;
    
        try {
            ui.showLoading();
            let query = searchTerm;
            
            if (searchTerm.startsWith('#')) {
                query = searchTerm.substring(1); 
            }
    
            const queryParams = new URLSearchParams({
                q: query,
                filter: searchTerm.startsWith('#') ? 'tag' : 'all'
            });
            console.log('Making search request:', `/api/articles/search?${queryParams}`);

            console.log('Search Request Debug:', {
                searchTerm: searchTerm,
                query: query,
                isTagSearch: searchTerm.startsWith('#'),
                queryParams: queryParams.toString()
            });
    
            const response = await api.get(`/api/articles/search?${queryParams}`);
            
            console.log('Full Search Response:', {
                success: response.success,
                dataType: typeof response.data,
                dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
                data: response.data,
                pagination: response.pagination
            });
    
            if (response.success) {
                // Ensure we're working with an array
                const searchResults = Array.isArray(response.data) ? response.data : [];
                console.log('Search results:', searchResults);

                window.history.pushState(null, '', `#search/${encodeURIComponent(searchTerm)}`);
                this.renderSearchResults(searchResults, searchTerm);
                
                // Rest of the existing code...
            }
        } catch (error) {
            console.error('Comprehensive Search Error:', {
                errorMessage: error.message,
                errorStack: error.stack
            });
            ui.showError('Error searching articles');
        } finally {
            ui.hideLoading();
        }
    },


renderSearchResults(results, searchTerm) {
    console.log('Rendering search results:', { resultsCount: results.length, searchTerm });

    const articleList = document.getElementById('articleList');
    if (!articleList) return;

    // Explicitly hide the bookmarks section
    const bookmarksSection = document.getElementById('bookmarksSection');
    if (bookmarksSection) {
        bookmarksSection.classList.add('hidden');
    }

    ui.hideAllSections();
    articleList.classList.remove('hidden');

    articleList.innerHTML = `
        <div class="container mx-auto px-4">
            <div class="mb-6">
                <h2 class="text-xl font-bold">
                    ${results.length} result${results.length !== 1 ? 's' : ''} found for "${searchTerm}"
                </h2>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                ${results.map(article => {
                    // Prioritize _id for navigation
                    const articleId = article._id || 
                                      article.id || 
                                      article.articleId || 
                                      'undefined';
                    
                    console.log('Article rendering details:', {
                        articleId,
                        title: article.title,
                        originalId: {
                            _id: article._id,
                            id: article.id,
                            articleId: article.articleId
                        }
                    });

                    return `
                    <div class="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col">
                        <div class="p-4 flex-1 flex flex-col">
                            <h3 class="text-lg font-semibold mb-2 line-clamp-2">
                                ${this.highlightSearchTerm(article.title || 'Untitled', searchTerm)}
                            </h3>
                            <div class="text-sm text-gray-500 mb-2 flex-shrink-0">
                                By ${article.author ? `${article.author.firstName} ${article.author.lastName}` : 'Unknown'} 
                                • ${new Date(article.createdAt).toLocaleDateString()}
                            </div>
                            <div class="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
                                ${this.highlightSearchTerm(this.truncateText(article.content || '', 150), searchTerm)}
                            </div>
                            <div class="mt-auto flex justify-end">
                                <button 
                                    class="view-article-btn px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    data-article-id="${articleId}">
                                    View Article
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                }).join('')}
            </div>
        </div>
    `;

    this.attachSearchResultEventListeners();
},
    
    attachSearchResultEventListeners() {
        document.querySelectorAll('.view-article-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                const articleId = button.getAttribute('data-article-id');
                
                console.log('View Article Button Clicked:', {
                    articleId,
                    buttonElement: button
                });
    
                if (articleId && articleId !== 'undefined') {
                    console.log('Navigating to article:', articleId);
                    window.location.hash = `#article/${articleId}`;
                } else {
                    console.error('Invalid article ID', button);
                    ui.showError('Unable to navigate to article');
                }
            });
        });
    },
    highlightSearchTerm(text, searchTerm) {
        if (!text || !searchTerm) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    },

    truncateText(text, length) {
        if (!text) return '';
        
        // Strip HTML tags first
        const strippedText = text.replace(/<[^>]*>/g, '');
        
        if (strippedText.length <= length) return strippedText;
        
        return strippedText.substring(0, length).trim() + '...';
    }
};