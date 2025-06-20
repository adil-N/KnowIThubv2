// frontend/src/js/comments/commentList.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';
import { commentActions } from './commentActions.js';

export const commentList = {
    comments: [],
    parentId: null,
    parentType: null,
    isProcessingLike: false,
    editingCommentId: null,

    async init(parentType, parentId) {
        if (!parentType || !parentId) {
            console.error('Invalid parent type or ID');
            return;
        }
        
        this.parentType = parentType;
        this.parentId = parentId;
        await this.loadComments();
    },

    async loadComments() {
        try {
            ui.showLoading();
            const endpoint = `/api/articles/${this.parentId}/comments`;
            const response = await api.get(endpoint);
            
            if (!response || !response.success) {
                throw new Error(response?.message || 'Failed to fetch comments');
            }

            this.comments = response.data;
            this.render();
        } catch (error) {
            console.error('Error loading comments:', error);
            ui.showError('Error loading comments');
        } finally {
            ui.hideLoading();
        }
    },
    
    render(containerId = 'commentsList') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Comments container not found:', containerId);
            return;
        }
    
        const currentUser = auth.user.get();
    
        if (!Array.isArray(this.comments) || this.comments.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No comments yet. Be the first to comment!</p>';
            return;
        }
    
        container.innerHTML = `
            <div class="space-y-4 w-full max-w-full">
                ${this.comments.map(comment => this.renderComment(comment, currentUser)).join('')}
            </div>
        `;
    
        this.attachEventListeners();
    },

    renderComment(comment, currentUser) {
        const userIsAuthor = currentUser?.user && comment.author._id === currentUser.user._id;
        const userIsAdmin = currentUser?.user && ['admin', 'super'].includes(currentUser.user.role);
        const canModify = userIsAuthor || userIsAdmin;
        const isLiked = comment.likes?.some(like => like === currentUser?.user?._id);
        const needsTruncation = comment.content.length > 200;
        const truncatedContent = needsTruncation ? comment.content.slice(0, 200) + '...' : comment.content;
        const isEditing = comment._id === this.editingCommentId;
    
        return `
            <div class="bg-gray-50 rounded-lg p-4" id="comment-${comment._id}">
                <!-- User Info and Timestamp -->
                <div class="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span class="font-medium text-gray-800">${comment.author?.email || 'Unknown'}</span>
                    <span>•</span>
                    <span>${new Date(comment.createdAt).toLocaleString()}</span>
                    ${comment.edited ? 
                        `<span>• edited ${new Date(comment.updatedAt).toLocaleString()}</span>` 
                        : ''}
                </div>
    
                <!-- Comment Content -->
                ${isEditing ? 
                    `<div id="edit-form-${comment._id}"></div>` :
                    `<div class="comment-content bg-white rounded-md p-4 shadow-sm border border-gray-100">
                        <div class="text-gray-700 text-base leading-relaxed font-normal" 
                             style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" 
                             data-comment-id="${comment._id}">${truncatedContent}</div>
                        ${needsTruncation ? `
                            <button class="toggle-comment text-blue-600 hover:text-blue-800 text-sm mt-2 flex items-center gap-1 transition-colors duration-200"
                                    data-comment-id="${comment
                                    ._id}">
                                <span>Show more</span>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>`
                }
    
                <!-- Actions -->
                ${!isEditing ? `
                    <div class="mt-3 flex items-center gap-4">
                        <!-- Like Button with Animation -->
                        <button class="like-button ${isLiked ? 'liked' : ''} flex items-center hover:text-blue-600 transition-colors duration-200"
                                data-comment-id="${comment._id}"
                                ${this.isProcessingLike ? 'disabled' : ''}>
                            <div class="relative">
                                <!-- Sparkles -->
                                <svg class="sparkle sparkle-1 w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="#ff1744">
                                    <path d="M12 2L15 9L22 9L16 14L18 21L12 17L6 21L8 14L2 9L9 9L12 2Z" />
                                </svg>
                                <svg class="sparkle sparkle-2 w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="#ff1744">
                                    <path d="M12 2L15 9L22 9L16 14L18 21L12 17L6 21L8 14L2 9L9 9L12 2Z" />
                                </svg>
                                <svg class="sparkle sparkle-3 w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="#ff1744">
                                    <path d="M12 2L15 9L22 9L16 14L18 21L12 17L6 21L8 14L2 9L9 9L12 2Z" />
                                </svg>
                                <svg class="sparkle sparkle-4 w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="#ff1744">
                                    <path d="M12 2L15 9L22 9L16 14L18 21L12 17L6 21L8 14L2 9L9 9L12 2Z" />
                                </svg>
                                <!-- Thumb Icon -->
                               <svg xmlns="http://www.w3.org/2000/svg" 
                                     class="w-6 h-6" 
                                     fill="${isLiked ? 'currentColor' : 'none'}"
                                     viewBox="0 0 24 24" 
                                     stroke="currentColor">
                                    <path stroke-linecap="round" 
                                          stroke-linejoin="round" 
                                          stroke-width="1.2" 
                                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                            </div>
                            <span class="like-count text-sm ml-1 font-medium">${comment.likeCount || 0}</span>
                        </button>
    
                        ${canModify ? `
                            <div class="flex items-center gap-2">
                                <!-- Edit Button -->
                                <button class="edit-comment-btn flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-gray-100" 
                                        data-comment-id="${comment._id}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    <span class="text-sm">Edit</span>
                                </button>
                                <!-- Delete Button -->
                                <button class="delete-comment-btn flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-gray-100" 
                                        data-comment-id="${comment._id}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    <span class="text-sm">Delete</span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    },

    attachEventListeners() {
        // Enhanced like button functionality
        document.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                if (this.isProcessingLike) return;
                
                const commentId = button.dataset.commentId;
                this.isProcessingLike = true;
                
                try {
                    // Add animation class
                    button.classList.add('animating');
                    
                    // Toggle liked state immediately for better UX
                    const wasLiked = button.classList.contains('liked');
                    button.classList.toggle('liked');
                    
                    // Update count immediately for better UX
                    const countSpan = button.querySelector('.like-count');
                    const currentCount = parseInt(countSpan.textContent);
                    countSpan.textContent = wasLiked ? currentCount - 1 : currentCount + 1;
                    
                    // Make API call
                    const response = await commentActions.toggleLike(this.parentType, this.parentId, commentId);
                    if (response && response.success) {
                        // Update the comments array with the new like state
                        const updatedComment = this.comments.find(c => c._id === commentId);
                        if (updatedComment) {
                            updatedComment.likes = response.data.likes;
                            updatedComment.likeCount = response.data.likeCount;
                        }
                        
                        // Remove animation class after animation completes
                        setTimeout(() => {
                            button.classList.remove('animating');
                        }, 600);
                    } else {
                        // API call failed, revert UI changes
                        button.classList.toggle('liked');
                        countSpan.textContent = currentCount;
                    }
                } finally {
                    this.isProcessingLike = false;
                }
            });
        });

        // Edit button functionality
        document.querySelectorAll('.edit-comment-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const commentId = button.dataset.commentId;
                const comment = this.comments.find(c => c._id === commentId);
                if (!comment) return;

                this.editingCommentId = commentId;
                this.render();

                const editFormContainer = document.getElementById(`edit-form-${commentId}`);
                if (editFormContainer) {
                    const onSave = async (newContent) => {
                        if (await commentActions.edit(this.parentType, this.parentId, commentId, newContent)) {
                            this.editingCommentId = null;
                            await this.loadComments();
                        }
                    };

                    const onCancel = () => {
                        this.editingCommentId = null;
                        this.render();
                    };

                    const form = commentActions.createEditForm(comment, onSave, onCancel);
                    editFormContainer.appendChild(form);
                }
            });
        });

        // Delete button functionality
        document.querySelectorAll('.delete-comment-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const commentId = button.dataset.commentId;
                if (await commentActions.delete(this.parentType, this.parentId, commentId)) {
                    await this.loadComments();
                }
            });
        });

        // Toggle comment expansion functionality
        document.querySelectorAll('.toggle-comment').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const commentId = button.getAttribute('data-comment-id');
                const comment = this.comments.find(c => c._id === commentId);
                
                if (!comment) return;
                
                const contentDiv = button.closest('.comment-content').querySelector('[data-comment-id]');
                const isExpanded = contentDiv.textContent.length > 200;
                
                if (isExpanded) {
                    contentDiv.textContent = comment.content.slice(0, 200) + '...';
                    button.querySelector('span').textContent = 'Show more';
                } else {
                    contentDiv.textContent = comment.content;
                    button.querySelector('span').textContent = 'Show less';
                }
            });
        });
    }
};