// frontend/src/js/auth/forcedPasswordChange.js
import { api } from '../utils/api.js';
import { auth } from '../utils/auth.js';
import { ui } from '../utils/ui.js';
import { validators } from '../utils/validators.js';

export const forcedPasswordChange = {
    initialize() {
        console.log('Initializing forced password change');
        
        // Check for stored email from localStorage
        const storedEmail = localStorage.getItem('resetEmail');
        console.log('Stored reset email during initialization:', storedEmail);
    
        const tempAuth = auth.tempAuth.get();
        const currentUser = auth.user.get();
        
        console.log('Authentication states:', {
            tempAuth: !!tempAuth,
            currentUser: !!currentUser,
            passwordResetRequired: currentUser?.user?.passwordResetRequired || tempAuth?.user?.passwordResetRequired
        });
    
        // Ensure we have either temp auth or a password reset requirement
        if (!tempAuth && 
            (!currentUser?.user?.passwordResetRequired) && 
            !storedEmail) {
            console.log('No password reset context found, redirecting to login');
            window.location.hash = '#login';
            return;
        }
        
        this.bindForm();
        this.setupValidation();
    },

    bindForm() {
        const form = document.getElementById('forcedPasswordChangeFormElement');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
            console.log('Forced password change form handler bound');
        } else {
            console.error('Forced password change form not found');
        }
    },

    setupValidation() {
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmNewPassword');
        const errorDiv = document.getElementById('forcedPasswordError');

        const validatePasswords = () => {
            if (!newPasswordInput || !confirmPasswordInput) return;

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
                if (errorDiv) {
                    errorDiv.classList.add('hidden');
                }
            }
        };

        newPasswordInput?.addEventListener('input', validatePasswords);
        confirmPasswordInput?.addEventListener('input', validatePasswords);
    },


    async handleSubmit(event) {
        event.preventDefault();
        console.log('Handling forced password change submission');
        
        const errorDiv = document.getElementById('forcedPasswordError');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    
        try {
            ui.showLoading();
    
            const tempPassword = document.getElementById('tempPassword')?.value;
            const newPassword = document.getElementById('newPassword')?.value;
            const confirmPassword = document.getElementById('confirmNewPassword')?.value;
    
            if (!tempPassword || !newPassword || !confirmPassword) {
                throw new Error('All fields are required');
            }
    
            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }
    
            const passwordValidation = validators.password(newPassword);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.message);
            }
    
            // Use email from temp auth or stored email
            const tempAuth = auth.tempAuth.get();
            const storedEmail = localStorage.getItem('resetEmail');
            const email = tempAuth?.user?.email || storedEmail;
            
            if (!email) {
                throw new Error('No email found for password reset');
            }
    
            console.log('Preparing password change request', { 
                email: email.substring(0, 3) + '***', 
                hasToken: !!tempAuth?.token
            });
    
            const response = await api.post('/api/users/force-change-password', {
                currentPassword: tempPassword,
                newPassword,
                email
            });
    
            console.log('Password change response:', response);
    
            if (response.success) {
                // Clear temporary authentication and stored email
                auth.tempAuth.clear();
                localStorage.removeItem('resetEmail');
                
                // Prepare user data for login
                const userData = {
                    token: response.data.token,
                    user: {
                        ...response.data.user,
                        passwordResetRequired: false
                    }
                };
    
                // Log in the user with new credentials
                const loginSuccess = await auth.login(userData);
                
                if (loginSuccess) {
                    // Update navigation and redirect
                    ui.updateNavigation(true, userData);
                    
                    // Explicitly hide reset form
                    const resetForm = document.getElementById('forcedPasswordChangeForm');
                    if (resetForm) {
                        resetForm.classList.add('hidden');
                        resetForm.style.display = 'none';
                    }
                    
                    window.location.hash = '#articles';
                } else {
                    throw new Error('Failed to log in after password change');
                }
            } else {
                throw new Error(response.message || 'Failed to change password');
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