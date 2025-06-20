// frontend/src/js/admin/articleManagement.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const articleManagement = {
    currentPage: 1,
    
    async show(skipSuccessMessage = false) {
        try {
            ui.showLoading();
            
            // Fetch initial stats
            const statsResponse = await api.get('/api/admin/articles/stats');
            
            // FIXED: Include pagination parameters in the API call
            const articlesResponse = await api.get(`/api/admin/articles?page=${this.currentPage}&limit=10`);
    
            if (!articlesResponse.success) {
                throw new Error('Failed to fetch articles');
            }
    
            const articles = articlesResponse.data;
            const stats = statsResponse.success ? statsResponse.data : null;
            
            // Clear existing content
            const adminContent = document.getElementById('adminContent');
            if (!adminContent) return;
            
            adminContent.innerHTML = '';
            
            // Render with stats
            this.renderArticleManagement(articles, stats, articlesResponse.pagination);
            this.attachEventListeners();
            
            // Start real-time stats updates
            this.stopStatsRefresh();
            this.startStatsRefresh();
    
        } catch (error) {
            console.error('Error in show():', error);
            if (!skipSuccessMessage) {
                ui.showError('Failed to load content management data');
            }
        } finally {
            ui.hideLoading();
        }
    },

    renderArticleManagement(articles, stats, pagination) {
        const adminContent = document.getElementById('adminContent');
        if (!adminContent) return;

        adminContent.innerHTML = `
            <div class="space-y-6">
                <!-- Stats Overview -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white p-4 rounded-lg shadow">
                        <h4 class="text-lg font-semibold text-gray-700">Content Overview</h4>
                        <div class="mt-2" data-stat="totalArticles">
                            <p class="text-2xl font-bold text-blue-600">${stats?.overview?.totalArticles || 0}</p>
                            <p class="text-sm text-gray-600">Total Articles</p>
                            <div class="text-xs text-gray-500 mt-1">
                                Active: ${stats?.overview?.visibleArticles || 0}
                            </div>
                        </div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow">
                        <h4 class="text-lg font-semibold text-gray-700">Hidden Content</h4>
                        <div class="mt-2" data-stat="hiddenArticles">
                            <p class="text-2xl font-bold text-red-600">${stats?.overview?.hiddenArticles || 0}</p>
                            <p class="text-sm text-gray-600">Hidden Articles</p>
                            <div class="text-xs text-gray-500 mt-1" data-stat="hiddenPercent">
                                ${((stats?.overview?.hiddenArticles / stats?.overview?.totalArticles) * 100 || 0).toFixed(1)}% of total
                            </div>
                        </div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow">
                        <h4 class="text-lg font-semibold text-gray-700">Comments</h4>
                        <div class="mt-2" data-stat="totalComments">
                            <p class="text-2xl font-bold text-green-600">${stats?.overview?.totalComments || 0}</p>
                            <p class="text-sm text-gray-600">Total Comments</p>
                            <div class="text-xs text-gray-500 mt-1" data-stat="commentAvg">
                                Avg: ${((stats?.overview?.totalComments / stats?.overview?.totalArticles) || 0).toFixed(1)} per article
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Articles Table -->
                <div class="bg-white rounded-lg shadow">
                

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 table-fixed">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                                        Title & Content
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                                        Author
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                                        Status
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                                        Comments
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                                        Created
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${articles && articles.length > 0 ? 
                                    articles.map(article => this.renderArticleRow(article)).join('') :
                                    '<tr><td colspan="6" class="text-center py-8 text-gray-500">No articles found</td></tr>'
                                }
                            </tbody>
                        </table>
                        ${this.renderPagination(pagination)}
                    </div>
                </div>
            </div>
        `;
    },

    // FIXED: Enhanced pagination rendering with better navigation
    renderPagination(pagination) {
        if (!pagination || pagination.totalPages <= 1) return '';
        
        const { currentPage, totalPages, totalItems, limit } = pagination;
        const startItem = ((currentPage - 1) * limit) + 1;
        const endItem = Math.min(currentPage * limit, totalItems);
        
        // Generate page numbers to show
        let pagesToShow = [];
        const maxPagesToShow = 5;
        
        if (totalPages <= maxPagesToShow) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pagesToShow.push(i);
            }
        } else {
            // Show pages around current page
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);
            
            if (startPage > 1) {
                pagesToShow.push(1);
                if (startPage > 2) pagesToShow.push('...');
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pagesToShow.push(i);
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pagesToShow.push('...');
                pagesToShow.push(totalPages);
            }
        }
        
        return `
            <div class="px-6 py-4 flex justify-between items-center border-t bg-gray-50">
                <div class="flex items-center text-sm text-gray-700">
                    <span>Showing ${startItem} to ${endItem} of ${totalItems} articles</span>
                </div>
                
                <div class="flex items-center space-x-2">
                    <!-- First Page -->
                    ${currentPage > 1 ? `
                        <button 
                            class="pagination-btn px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            data-page="1"
                            title="First page">
                            ««
                        </button>
                    ` : ''}
                    
                    <!-- Previous Page -->
                    ${currentPage > 1 ? `
                        <button 
                            class="pagination-btn px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            data-page="${currentPage - 1}"
                            title="Previous page">
                            ‹ Previous
                        </button>
                    ` : ''}
                    
                    <!-- Page Numbers -->
                    <div class="flex space-x-1">
                        ${pagesToShow.map(page => {
                            if (page === '...') {
                                return '<span class="px-3 py-2 text-sm text-gray-500">...</span>';
                            }
                            
                            const isCurrentPage = page === currentPage;
                            return `
                                <button 
                                    class="pagination-btn px-3 py-2 text-sm border rounded-md ${
                                        isCurrentPage 
                                            ? 'bg-blue-600 text-white border-blue-600' 
                                            : 'bg-white border-gray-300 hover:bg-gray-50'
                                    }"
                                    data-page="${page}"
                                    ${isCurrentPage ? 'disabled' : ''}>
                                    ${page}
                                </button>
                            `;
                        }).join('')}
                    </div>
                    
                    <!-- Next Page -->
                    ${currentPage < totalPages ? `
                        <button 
                            class="pagination-btn px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            data-page="${currentPage + 1}"
                            title="Next page">
                            Next ›
                        </button>
                    ` : ''}
                    
                    <!-- Last Page -->
                    ${currentPage < totalPages ? `
                        <button 
                            class="pagination-btn px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            data-page="${totalPages}"
                            title="Last page">
                            »»
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    startStatsRefresh() {
        this.statsInterval = setInterval(async () => {
            const statsResponse = await api.get('/api/admin/articles/stats');
            if (statsResponse.success) {
                this.updateStatsDisplay(statsResponse.data.overview);
            }
        }, 30000);
    },

    stopStatsRefresh() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
    },

    updateStatsDisplay(stats) {
        const elements = {
            totalArticles: document.querySelector('[data-stat="totalArticles"] .text-2xl'),
            hiddenArticles: document.querySelector('[data-stat="hiddenArticles"] .text-2xl'),
            totalComments: document.querySelector('[data-stat="totalComments"] .text-2xl'),
            hiddenPercent: document.querySelector('[data-stat="hiddenPercent"]'),
            commentAvg: document.querySelector('[data-stat="commentAvg"]')
        };

        if (elements.totalArticles) {
            elements.totalArticles.textContent = stats.totalArticles || 0;
            elements.totalArticles.nextElementSibling.nextElementSibling.textContent = 
                `Active: ${stats.visibleArticles || 0}`;
        }

        if (elements.hiddenArticles) {
            elements.hiddenArticles.textContent = stats.hiddenArticles || 0;
        }

        if (elements.totalComments) {
            elements.totalComments.textContent = stats.totalComments || 0;
        }

        if (elements.hiddenPercent) {
            const percentage = ((stats.hiddenArticles / stats.totalArticles) * 100 || 0).toFixed(1);
            elements.hiddenPercent.textContent = `${percentage}% of total`;
        }

        if (elements.commentAvg) {
            const avg = ((stats.totalComments / stats.totalArticles) || 0).toFixed(1);
            elements.commentAvg.textContent = `Avg: ${avg} per article`;
        }
    },

    renderArticleRow(article) {
        console.log('Rendering article:', {
            id: article._id,
            mongoId: article.id,
            articleId: article.articleId,
            article
        });
        
        return `
            <tr class="article-row transition-colors duration-200" data-article-id="${article._id}">
                <td class="px-6 py-4">
                    <div class="flex items-start">
                       
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center">
                                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">
                                    ${article.articleId || 'N/A'}
                                </span>
                                <span class="text-sm font-medium text-gray-900 max-w-xs truncate inline-block hover:text-blue-600" 
                                      title="${article.title}">
                                    ${article.title.length > 30 ? article.title.substring(0, 30) + '...' : article.title}
                                </span>
                                ${article.hidden ? 
                                    '<span class="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Hidden</span>' 
                                    : ''}
                            </div>

                            <p class="text-sm text-gray-500 max-w-xs truncate hover:text-blue-600 mt-1" title="${article.content.replace(/"/g, '&quot;')}">
                                ${this.sanitizeContent(article.content)}
                            </p>

                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap w-40">
                    <div class="text-sm text-gray-900 truncate">
                        ${article.author?.email || 'Unknown'}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap w-28">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${article.hidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                        ${article.hidden ? 'Hidden' : 'Visible'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap w-28">
                    <div class="text-sm text-gray-900">
                        ${article.comments?.length || 0}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap w-40">
                   <div class="text-sm text-gray-500">
                        ${new Date(article.createdAt).toLocaleDateString()}
                    </div>
                </td>
                <td class="px-6 py-4 w-44">
                    <div class="flex justify-end space-x-2">
                   <button class="toggle-visibility-btn px-2 py-1 rounded whitespace-nowrap
                        ${article.hidden ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}"
                        data-id="${article._id || article.id}">
                        ${article.hidden ? 'Show' : 'Hide'}
                    </button>
                        <button class="edit-article-btn px-2 py-1 bg-blue-100 text-blue-800 rounded"
                            data-id="${article._id || article.id}">
                            Edit
                        </button>
                        <button class="delete-article-btn px-2 py-1 bg-red-100 text-red-800 rounded"
                            data-id="${article._id || article.id}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    sanitizeContent(content) {
        const strippedContent = content.replace(/<[^>]*>|<\/[^>]*>/g, '');
        const cleanContent = strippedContent.replace(/data:image\/[^;]+;base64,[^"]+/g, '[image]');
        const truncatedContent = cleanContent.length > 50 
            ? cleanContent.substring(0, 50) + '...' 
            : cleanContent;
        
        return truncatedContent;
    },

    attachEventListeners() {
       

        


        document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const btn = e.currentTarget;
                const articleId = btn.getAttribute('data-id');
                const row = btn.closest('tr');

                console.log('Toggle click debug:', {
                    buttonElement: btn,
                    articleId,
                    rowId: row?.dataset?.articleId,
                    allDataAttributes: Object.fromEntries(
                        [...btn.attributes].filter(attr => attr.name.startsWith('data-'))
                        .map(attr => [attr.name, attr.value])
                    )
                });

                if (!articleId) {
                    console.error('No article ID found on button');
                    ui.showError('Failed to identify article');
                    return;
                }

                await this.handleToggleVisibility(articleId, btn);
            });
        });

        document.querySelectorAll('.delete-article-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDeleteArticle(e.target.dataset.id));
        });

        document.querySelectorAll('.edit-article-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.location.hash = `#edit-article/${e.target.dataset.id}`;
            });
        });

        // FIXED: Enhanced pagination event handling
        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    // Update current page
                    this.currentPage = page;
                    
                   
                    // Reload the page with new data
                    await this.show();
                    
                    // Scroll to top of the table
                    const tableContainer = document.querySelector('.overflow-x-auto');
                    if (tableContainer) {
                        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });

        

    },

    handleArticleSelection(e) {
        const checkbox = e.target;
        const articleId = checkbox.dataset.articleId;
        const bulkToggleBtn = document.getElementById('bulkToggleVisibilityBtn');

        if (checkbox.checked) {
            this.selectedArticles.add(articleId);
        } else {
            this.selectedArticles.delete(articleId);
        }

        if (bulkToggleBtn) {
            bulkToggleBtn.disabled = this.selectedArticles.size === 0;
        }

        const row = checkbox.closest('tr');
        if (row) {
            if (checkbox.checked) {
                row.classList.add('bg-blue-50');
            } else {
                row.classList.remove('bg-blue-50');
            }
        }
    },

    async handleToggleVisibility(articleId, btn) {
        if (!articleId) {
            console.error('No article ID provided');
            ui.showError('Failed to identify article');
            return;
        }

        try {
            ui.showLoading();
            btn.disabled = true;

            const currentlyHidden = btn.textContent.trim() === 'Show';
            const newHiddenStatus = !currentlyHidden;

            const response = await api.post(`/api/articles/toggle/${articleId}`, {
                hidden: newHiddenStatus
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to update article visibility');
            }

            this.updateVisibilityUI(btn, newHiddenStatus);

        } catch (error) {
            console.error('Error toggling visibility:', error);
            ui.showError('Failed to update article visibility');
        } finally {
            ui.hideLoading();
            btn.disabled = false;
        }
    },

    updateVisibilityUI(btn, newHiddenStatus) {
        btn.textContent = newHiddenStatus ? 'Show' : 'Hide';
        btn.className = `toggle-visibility-btn px-2 py-1 rounded whitespace-nowrap ${
            newHiddenStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`;

        const row = btn.closest('tr');
        const statusCell = row.querySelector('td:nth-child(3) span');
        if (statusCell) {
            statusCell.textContent = newHiddenStatus ? 'Hidden' : 'Visible';
            statusCell.className = `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                newHiddenStatus ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`;
        }

        const titleContainer = row.querySelector('.flex.items-center');
        const existingHiddenLabel = titleContainer.querySelector('.ml-2.px-2.py-1.text-xs.bg-red-100');
        
        if (newHiddenStatus && !existingHiddenLabel) {
            titleContainer.insertAdjacentHTML(
                'beforeend',
                '<span class="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Hidden</span>'
            );
        } else if (!newHiddenStatus && existingHiddenLabel) {
            existingHiddenLabel.remove();
        }
    },

    async handleBulkVisibilityToggle() {
        try {
            ui.showLoading();
            
            const selectedCheckboxes = document.querySelectorAll('.article-select-checkbox:checked');
            const selectedArticleIds = Array.from(selectedCheckboxes).map(checkbox => 
                checkbox.getAttribute('data-article-id')
            ).filter(id => id && id !== 'undefined');
            
            if (selectedArticleIds.length === 0) {
                ui.showError('No articles selected');
                return;
            }

            console.log('Selected articles for bulk update:', selectedArticleIds);

            const currentStatusResponses = await Promise.all(
                selectedArticleIds.map(id => api.get(`/api/admin/articles/${id}`))
            );

            const hiddenCount = currentStatusResponses.reduce((count, response) => {
                return count + (response.data?.hidden ? 1 : 0);
            }, 0);

            const shouldHide = hiddenCount <= selectedArticleIds.length / 2;
            console.log('New visibility status will be hidden:', shouldHide);

            const updateResults = await Promise.all(
                selectedArticleIds.map(id => 
                    api.put(`/api/admin/articles/${id}`, {
                        hidden: shouldHide
                    })
                )
            );

            console.log('Update results:', updateResults);

            const allSuccessful = updateResults.every(result => result.success);
            if (!allSuccessful) {
                throw new Error('Some updates failed');
            }

            await this.show(true);

            ui.showError(
                `Successfully ${shouldHide ? 'hidden' : 'shown'} ${selectedArticleIds.length} articles`, 
                'success'
            );

        } catch (error) {
            console.error('Error in bulk visibility toggle:', error);
            ui.showError('Failed to update articles visibility');
        } finally {
            ui.hideLoading();
        }
    },

    async handleDeleteArticle(articleId) {
        const deleteBtn = document.querySelector(`.delete-article-btn[data-id="${articleId}"]`);
        if (deleteBtn?.disabled) {
            return;
        }

        if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
            return;
        }

        try {
            ui.showLoading();
            
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Deleting...';
            }

            const deleteResponse = await api.delete(`/api/admin/articles/${articleId}`);
            
            if (deleteResponse.success) {
                try {
                    ui.showError('Article deleted successfully', 'success');
                    await this.show(true);
                } catch (refreshError) {
                    console.error('Error refreshing content:', refreshError);
                }
            } else {
                throw new Error('Delete operation failed');
            }
        } catch (error) {
            console.error('Error deleting article:', error);
            ui.showError('Failed to delete article');
        } finally {
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = 'Delete';
            }
            ui.hideLoading();
        }
    },

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const rows = document.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const title = row.querySelector('td:first-child').textContent.toLowerCase();
            const author = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || author.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    },

    handleSort(event) {
        if (!this.articles) return;
        
        const sortValue = event.target.value;
        switch(sortValue) {
            case 'newest':
                this.articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                this.articles.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'mostComments':
                this.articles.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
                break;
        }
        
        this.renderArticles();
    },

    handleFilter(event) {
        const filterValue = event.target.value;
        const rows = document.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const status = row.querySelector('td:nth-child(3) span').textContent;
            
            if (filterValue === 'all' || 
                (filterValue === 'hidden' && status === 'Hidden') ||
                (filterValue === 'visible' && status === 'Visible')) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
};