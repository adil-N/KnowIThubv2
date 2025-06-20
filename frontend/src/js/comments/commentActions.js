// frontend/src/js/comments/commentActions.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const commentActions = {
    async toggleLike(parentType, parentId, commentId) {
        try {
            const response = await api.post(`/api/${parentType}s/${parentId}/comments/${commentId}/like`);
            
            if (!response.success) {
                throw new Error(response?.message || 'Failed to update like status');
            }
            
            return {
                success: true,
                data: response.data // Should contain updated likes array and likeCount
            };
        } catch (error) {
            console.error('Error toggling like:', error);
            ui.showError('Failed to update like status');
            return {
                success: false,
                error: error.message
            };
        }
    },

    async edit(parentType, parentId, commentId, content) {
        try {
            ui.showLoading();
            const response = await api.put(`/api/${parentType}s/${parentId}/comments/${commentId}`, {
                content: content.trim()
            });
            
            if (!response.success) {
                throw new Error(response?.message || 'Failed to edit comment');
            }
            
            return true;
        } catch (error) {
            console.error('Error editing comment:', error);
            ui.showError('Failed to edit comment');
            return false;
        } finally {
            ui.hideLoading();
        }
    },

    async delete(parentType, parentId, commentId) {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 z-50 overflow-y-auto';
        dialog.innerHTML = `
            <div class="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div class="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <div class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                    <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div class="sm:flex sm:items-start">
                            <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                            </div>
                            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 class="text-lg font-medium leading-6 text-gray-900">Delete Comment</h3>
                                <div class="mt-2">
                                    <p class="text-sm text-gray-500">Are you sure you want to delete this comment? This action cannot be undone.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button type="button" class="delete-confirm inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm">Delete</button>
                        <button type="button" class="delete-cancel mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    
        return new Promise((resolve) => {
            const deleteConfirm = dialog.querySelector('.delete-confirm');
            const deleteCancel = dialog.querySelector('.delete-cancel');
    
            deleteConfirm.addEventListener('click', async () => {
                try {
                    ui.showLoading();
                    const response = await api.delete(`/api/${parentType}s/${parentId}/comments/${commentId}`);
                    
                    if (!response.success) {
                        throw new Error(response?.message || 'Failed to delete comment');
                    }
                    
                    resolve(true);
                } catch (error) {
                    console.error('Error deleting comment:', error);
                    ui.showError('Failed to delete comment');
                    resolve(false);
                } finally {
                    ui.hideLoading();
                    document.body.removeChild(dialog);
                }
            });
    
            deleteCancel.addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(false);
            });
        });
    },

    createEditForm(comment, onSave, onCancel) {
        const form = document.createElement('form');
        form.className = 'mt-2 space-y-3';
        
        // Create textarea
        const textarea = document.createElement('textarea');
        textarea.value = comment.content;
        textarea.className = 'w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out shadow-sm';
        textarea.rows = 3;
        textarea.placeholder = 'Edit your comment...';
        
        // Create buttons container
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'flex gap-3 mt-3';
        
        // Save button
        const saveButton = document.createElement('button');
        saveButton.type = 'submit';
        saveButton.className = 'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out disabled:opacity-50';
        saveButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Save Changes</span>
        `;
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 ease-in-out';
        cancelButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancel</span>
        `;
        
        // Add event listeners
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newContent = textarea.value.trim();
            if (!newContent) return;
            
            saveButton.disabled = true;
            saveButton.innerHTML = `
                <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
            `;
            await onSave(newContent);
        });
        
        cancelButton.addEventListener('click', onCancel);
        
        // Assemble the form
        buttonsDiv.appendChild(saveButton);
        buttonsDiv.appendChild(cancelButton);
        form.appendChild(textarea);
        form.appendChild(buttonsDiv);
        
        return form;
    }
};