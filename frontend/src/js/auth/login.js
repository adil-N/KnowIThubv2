// frontend/src/js/auth/login.js - Clean version with no HTML in error messages
import { api } from '../utils/api.js';
import { auth } from '../utils/auth.js';
import { ui } from '../utils/ui.js';
import { events } from '../utils/events.js';

export const login = {
    initialize() {
        this.bindLoginForm();
        console.log('Login module initialized');
    },

    bindLoginForm() {
        const form = document.querySelector('#loginForm form') || document.getElementById('loginFormElement');
        if (form) {
            form.addEventListener('submit', this.handleLogin.bind(this));
            console.log('Login form handler bound to:', form);
        } else {
            console.warn('Login form element not found');
        }
    },

    async handleLogin(event) {
        event.preventDefault();
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton?.disabled) return;
        
        if (submitButton) submitButton.disabled = true;

        const errorDiv = document.getElementById('loginError');
        errorDiv?.classList.add('hidden');

        try {
            ui.showLoading();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                throw new Error('Please enter both email and password');
            }

            const response = await api.post('/api/users/login', {
                email: email.toLowerCase(),
                password
            });

            if (response.success) {
                // Use the existing auth.login method from your auth.js
                const loginSuccess = await auth.login(response.data);
                
                if (!loginSuccess) {
                    throw new Error('Failed to process login data');
                }
                
                // FIXED: Use events.emit instead of events.publish
                events.emit('auth:login', response.data.user);
                
            } else {
                throw new Error(response.message);
            }

        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = error.message || 'Login failed. Please try again.';
            
            // Handle specific error messages with clean text ONLY
            if (error.message?.includes('pending admin approval')) {
                errorMessage = ' You are alomst there ☺️! Account Pending Approval, Please contact  administrators to activate your account.';
            } else if (error.message?.includes('suspended') || error.message?.includes('inactive')) {
                errorMessage = 'Account Suspended: Your account has been suspended. Please contact  the administrators for assistance.';
            }
            
            // Only show error in the form error div
            if (errorDiv) {
                errorDiv.textContent = errorMessage;
                errorDiv.classList.remove('hidden');
            }
            
            // DON'T show toast notification for these specific errors to avoid duplication
            if (!error.message?.includes('pending admin approval') && 
                !error.message?.includes('suspended') && 
                !error.message?.includes('inactive')) {
                ui.showError(errorMessage);
            }
            
        } finally {
            ui.hideLoading();
            if (submitButton) submitButton.disabled = false;
        }
    }
};