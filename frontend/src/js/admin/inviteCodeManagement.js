// frontend/src/js/admin/inviteCodeManagement.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const inviteCodeManagement = {
    async show(containerElement) {
        try {
            containerElement.innerHTML = `
                <div class="p-4 bg-indigo-100 rounded-lg">
                    <h3 class="font-semibold mb-2">Generate Invitation Code</h3>
                    <button id="generateNewCode" class="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600">
                        Generate New Code
                    </button>
                </div>
            `;

            this.attachEventListeners();
        } catch (error) {
            console.error('Error initializing invite code management:', error);
            ui.showError('Failed to initialize invite code management');
        }
    },

    attachEventListeners() {
        document.getElementById('generateNewCode')?.addEventListener('click', this.handleGenerateNewCode);
    },

 // frontend/src/js/admin/inviteCodeManagement.js
async handleGenerateNewCode() {
    try {
        ui.showLoading();
        const response = await api.post('/api/admin/invite-codes/generate', {
            expiresInDays: 10,  // Changed from 30 to 10 days
            maxUses: 0,         // Unlimited uses within 10 days
            description: 'General registration code'
        });

        if (response.success) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">New Invite Code</h3>
                        <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">✕</button>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600 mb-2">New invite code:</p>
                        <div class="flex items-center space-x-2">
                            <div class="relative flex-1">
                                <input 
                                    type="text" 
                                    value="${response.data.code}" 
                                    class="w-full p-2 border rounded bg-gray-50 pr-24" 
                                    id="newInviteCode"
                                    readonly
                                />
                                <button 
                                    id="copyCodeBtn"
                                    class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded hover:bg-indigo-600 text-sm"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm text-gray-500 mb-2">Please save this code. For security reasons, it will not be shown again.</p>
                    <p class="text-sm text-gray-500">This code will expire in 10 days.</p>
                </div>
            `;
            // Rest of the modal code remains the same...
        }
    } catch (error) {
        console.error('Error generating new code:', error);
        ui.showError('Failed to generate new invite code');
    } finally {
        ui.hideLoading();
    }
}};

// Global handler for toggling invite code status
window.toggleInviteCode = async (codeId, activate) => {
    try {
        ui.showLoading();
        const action = activate ? 'activate' : 'deactivate';
        const response = await api.patch(`/api/admin/invite-codes/${codeId}/${action}`);
        
        if (response.success) {
            await inviteCodeManagement.show(document.getElementById('adminContent'));
            ui.showError(`Invite code ${action}d successfully`, 'success');
        }
    } catch (error) {
        console.error(`Error ${activate ? 'activating' : 'deactivating'} code:`, error);
        ui.showError(`Failed to ${action} invite code`);
    } finally {
        ui.hideLoading();
    }
};
window.copyInviteCode = async (code) => {
    try {
        await navigator.clipboard.writeText(code);
        ui.showError('Code copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = code;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        ui.showError('Code copied to clipboard!', 'success');
    }
};


window.updateInviteCodeExpiration = async (codeId) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">Update Expiration Date</h3>
                <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">✕</button>
            </div>
            <div class="mb-4">
                <input 
                    type="date" 
                    id="newExpiryDate"
                    class="w-full p-2 border rounded"
                    min="${new Date().toISOString().split('T')[0]}"
                />
            </div>
            <div class="flex justify-end space-x-2">
                <button 
                    onclick="this.closest('.fixed').remove()"
                    class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Cancel
                </button>
                <button 
                    onclick="updateExpiration('${codeId}')"
                    class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Update
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.updateExpiration = async (codeId) => {
    const newDate = document.getElementById('newExpiryDate').value;
    if (!newDate) {
        ui.showError('Please select a date');
        return;
    }

    try {
        ui.showLoading();
        const response = await api.patch(`/api/admin/invite-codes/${codeId}/expiration`, {
            newExpiryDate: new Date(newDate).toISOString()
        });
        
        if (response.success) {
            document.querySelector('.fixed').remove();
            await inviteCodeManagement.show(document.getElementById('adminContent'));
            ui.showError('Expiration date updated successfully', 'success');
        }
    } 
    
    
    catch (error) {
        console.error('Error updating expiration:', error);
        ui.showError('Failed to update expiration date');
    } finally {
        ui.hideLoading();
    }
};