// frontend/src/js/auth/register.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { validators } from '../utils/validators.js';

export const register = {
    initialize() {
        this.bindRegisterForm();
    },

    bindRegisterForm() {
        const form = document.getElementById('registerFormElement');
        if (form) {
            form.addEventListener('submit', this.handleRegister.bind(this));
            this.setupValidation();
        }
    },

    setupValidation() {
        const passwordInput = document.getElementById('registerPassword');
        const confirmInput = document.getElementById('confirmPassword');
        const emailInput = document.getElementById('registerEmail');
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const errorDiv = document.getElementById('registerError');

        // Password confirmation validation
        const checkPasswords = () => {
            const passwordValidation = validators.password(passwordInput.value);
            
            if (!passwordValidation.isValid) {
                passwordInput.setCustomValidity(passwordValidation.message);
                if (errorDiv) {
                    errorDiv.textContent = passwordValidation.message;
                    errorDiv.classList.remove('hidden');
                }
                return;
            }

            if (confirmInput.value && passwordInput.value !== confirmInput.value) {
                confirmInput.setCustomValidity('Passwords do not match');
                if (errorDiv) {
                    errorDiv.textContent = 'Passwords do not match';
                    errorDiv.classList.remove('hidden');
                }
            } else {
                passwordInput.setCustomValidity('');
                confirmInput.setCustomValidity('');
                errorDiv?.classList.add('hidden');
            }
        };

        // Email validation
        const validateEmail = () => {
            const emailValidation = validators.email(emailInput.value);
            if (!emailValidation.isValid) {
                emailInput.setCustomValidity(emailValidation.message);
                if (errorDiv) {
                    errorDiv.textContent = emailValidation.message;
                    errorDiv.classList.remove('hidden');
                }
            } else {
                emailInput.setCustomValidity('');
                errorDiv?.classList.add('hidden');
            }
        };

        // Name validation
        const validateName = (input, fieldName) => {
            if (input.value.length < 2) {
                input.setCustomValidity(`${fieldName} must be at least 2 characters long`);
                if (errorDiv) {
                    errorDiv.textContent = `${fieldName} must be at least 2 characters long`;
                    errorDiv.classList.remove('hidden');
                }
            } else if (input.value.length > 30) {
                input.setCustomValidity(`${fieldName} cannot exceed 30 characters`);
                if (errorDiv) {
                    errorDiv.textContent = `${fieldName} cannot exceed 30 characters`;
                    errorDiv.classList.remove('hidden');
                }
            } else {
                input.setCustomValidity('');
                errorDiv?.classList.add('hidden');
            }
        };

        // Attach event listeners
        passwordInput?.addEventListener('input', checkPasswords);
        confirmInput?.addEventListener('input', checkPasswords);
        emailInput?.addEventListener('input', validateEmail);
        firstNameInput?.addEventListener('input', () => validateName(firstNameInput, 'First name'));
        lastNameInput?.addEventListener('input', () => validateName(lastNameInput, 'Last name'));
    },

   // frontend/src/js/auth/register.js
async handleRegister(event) {
    event.preventDefault();
    
    // Prevent double submission
    const submitButton = event.target.querySelector('button[type="submit"]');
    if (submitButton) {
        if (submitButton.disabled) {
            return; // Already submitting
        }
        submitButton.disabled = true;
    }

    const errorDiv = document.getElementById('registerError');
    errorDiv?.classList.add('hidden');

    try {
        ui.showLoading();
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('registerEmail').value.trim().toLowerCase(),
            password: document.getElementById('registerPassword').value,
            confirmPassword: document.getElementById('confirmPassword').value,
            inviteCode: document.getElementById('inviteCode').value.trim()
        };

        const response = await api.post('/api/users/register', formData);

        if (response.success) {
            ui.showError('Registration successful! Please log in.', 'success');
            window.location.hash = '#login';
        } else {
            throw new Error(response.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        ui.showError(error.message || 'Registration failed. Please try again.');
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Registration failed. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    } finally {
        ui.hideLoading();
        // Re-enable submit button
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}
};