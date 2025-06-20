// frontend/src/js/auth/passwordReset.js
import { api } from '../utils/api.js';
import { auth } from '../utils/auth.js';
import { ui } from '../utils/ui.js';
import { validators } from '../utils/validators.js';

export const passwordReset = {
    initialize() {
        this.bindPasswordResetForm();
    },

    bindPasswordResetForm() {
        const form = document.getElementById('passwordChangeForm');
        if (form) {
            form.addEventListener('submit', this.handlePasswordChange.bind(this));
        }
    },
    setupValidation() {
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const errorDiv = document.getElementById('passwordError');

        const validatePasswords = () => {
            const passwordValidation = validators.password(newPasswordInput.value);
            
            if (!passwordValidation.isValid) {
                newPasswordInput.setCustomValidity(passwordValidation.message);
                if (errorDiv) {
                    errorDiv.textContent = passwordValidation.message;
                    errorDiv.classList.remove('hidden');
                }
                return;
            }

            if (confirmPasswordInput.value && newPasswordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.setCustomValidity('Passwords do not match');
                if (errorDiv) {
                    errorDiv.textContent = 'Passwords do not match';
                    errorDiv.classList.remove('hidden');
                }
            } else {
                newPasswordInput.setCustomValidity('');
                confirmPasswordInput.setCustomValidity('');
                errorDiv?.classList.add('hidden');
            }
        };

        newPasswordInput?.addEventListener('input', validatePasswords);
        confirmPasswordInput?.addEventListener('input', validatePasswords);
    },

    
    async handlePasswordChange(event) {
        event.preventDefault();
        const errorDiv = document.getElementById('passwordError');
        errorDiv?.classList.add('hidden');
    
        try {
            ui.showLoading();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
    
            // Validate passwords match
            if (newPassword !== confirmPassword) {
                ui.showError('New passwords do not match');
                return;
            }
    
            console.log('Attempting password change...');
            const response = await api.post('/api/users/change-password', {
                currentPassword,
                newPassword
            });
            
            console.log('Password change response:', response);
    
            if (response.success) {
                // Update auth token
                if (response.data?.token) {
                    auth.updateToken(response.data.token);
                }
    
                // Update user data
                if (response.data?.user) {
                    auth.updateUser(response.data.user);
                }
    
                ui.showError('Password changed successfully', 'success');
                
                // Clear form
                event.target.reset();
                
                // Redirect based on role
                const userRole = auth.user.get().role;
                if (userRole === 'admin' || userRole === 'super') {
                    window.location.hash = '#admin';
                } else {
                    window.location.hash = '#articles';
                }
            }
        } catch (error) {
            console.error('Password change error:', error);
            ui.showError(error.message || 'Failed to change password');
            if (errorDiv) {
                errorDiv.textContent = error.message || 'Failed to change password';
                errorDiv.classList.remove('hidden');
            }
        } finally {
            ui.hideLoading();
        }
    }
};