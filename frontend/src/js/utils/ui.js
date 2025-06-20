// frontend/src/js/utils/ui.js
import { events } from './events.js';
import { auth } from './auth.js';

export const ui = {
    sections: [
        'loginForm',
        'registerForm',
        'passwordResetForm',
        'createArticleForm',
        'articleList',
        'articleDetails',
        'editArticleForm',
        'adminPanelContainer',
        'superAdminPanel',
        'userProfileSection',
        'forcedPasswordChangeForm',
        'linksSection',
        'codeSnippetsSection' ,
        'phoneDirectorySection' ,
        'apexSection',
    ],

    // Add this method right after the sections array in ui.js

initialize() {
    console.log('Starting UI initialization...');
    
    try {
        // Setup basic UI components
        this.setupToastContainer();
        this.setupEventListeners();
        
        // Check user state
        const currentUser = auth.user.get();
        if (currentUser?.passwordResetRequired) {
            this.checkPasswordResetRequired(currentUser);
        }
        
        // Initialize navigation based on auth state
        const isAuthenticated = auth.isAuthenticated();
        if (isAuthenticated) {
            this.updateNavigation(true, auth.user.get());
        } else {
            this.forceUpdateNavigation();
        }

        // Hide loading spinner
        this.hideLoading();
        
        console.log('UI initialization completed successfully');
    } catch (error) {
        console.error('Error during UI initialization:', error);
        this.showError('Failed to initialize UI components');
    }
},

    showLoading() {
        console.log('Showing loading spinner');
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.remove('hidden');
        } else {
            console.warn('Loading spinner element not found');
        }
    },

    hideLoading() {
        console.log('Hiding loading spinner');
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.add('hidden');
        } else {
            console.warn('Loading spinner element not found');
        }
    },

  

    setupEventListeners() {
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                auth.logout();
                this.forceUpdateNavigation();
                events.emit('auth:logout');
            });
        }
    },

    setupToastContainer() {
        const container = this.getElement('toastContainer');
        if (!container) {
            console.warn('Toast container not found');
            return;
        }
    },

    safeToggleClass(element, className, condition) {
        if (element && element.classList) {
            try {
                if (condition) {
                    element.classList.add(className);
                } else {
                    element.classList.remove(className);
                }
            } catch (error) {
                console.error('Error toggling class:', error);
            }
        }
    },

    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id "${id}" not found`);
        }
        return element;
    },


    hideAllSections() {
        console.log('=== Hiding All Sections ===');
        
        // First hide standard sections
        this.sections.forEach(sectionId => {
            console.log('Attempting to hide section:', sectionId);
            const section = document.getElementById(sectionId);
            if (section) {
                console.log(`Found section ${sectionId}, hiding it`);
                section.classList.add('hidden');
            }
        });
    
        // Add phone directory section to specific cleanup
        const phoneDirectorySection = document.getElementById('phoneDirectorySection');
        if (phoneDirectorySection) {
            phoneDirectorySection.classList.add('hidden');
            // Optional: Clear the content to reset state
            phoneDirectorySection.innerHTML = '';
        }
    
        // Hide specific containers
        const containers = {
            'linksContainer': 'linksSection',
            'codeSnippetsContainer': 'codeSnippetsSection',
            'phoneDirectoryContainer': 'phoneDirectorySection'  // Add this line
        };
    
        Object.keys(containers).forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.classList.add('hidden');
            }
        });
    },

    showSection(sectionId) {
        console.log(`Showing section: ${sectionId}`);
        this.hideAllSections();
        
        const section = document.getElementById(sectionId);
        if (!section) {
            console.error(`Section not found: ${sectionId}`);
            return false;
        }
    
        try {
            section.classList.remove('hidden');
            section.classList.add('block');
            console.log(`Successfully showed section: ${sectionId}`);
            return true;
        } catch (error) {
            console.error(`Error showing section ${sectionId}:`, error);
            return false;
        }
    },

    

    checkPasswordResetRequired(user) {
        console.log('Checking password reset requirement:', user);
        if (user?.passwordResetRequired) {
            console.log('Password reset required for user');
            this.hideAllSections();
            const resetForm = this.getElement('forcedPasswordChangeForm');
            if (resetForm) {
                resetForm.classList.remove('hidden');
            }
            this.updateNavigation(true, user);
            return true;
        }
        return false;
    },

    

    // frontend/src/js/utils/ui.js - Fixed updateNavigation function

updateNavigation(isAuthenticated, userData = null) {
    console.log('=== Updating Navigation ===');
    console.log('Auth state:', { isAuthenticated, userData });
    console.log('userData structure:', JSON.stringify(userData, null, 2));

    try {
        const elements = {
            loginLink: document.getElementById('loginLink'),
            registerLink: document.getElementById('registerLink'),
            logoutLink: document.getElementById('logoutLink'),
            createArticleLink: document.getElementById('createArticleLink'),
            adminLink: document.getElementById('adminLink'),
            superAdminLink: document.getElementById('superAdminLink'),
            userInfo: document.getElementById('userInfo'),
            searchBar: document.getElementById('searchBar'),
            linksLink: document.getElementById('linksLink'),
            codeSnippetsLink: document.getElementById('codeSnippetsLink') 
        };

        Object.entries(elements).forEach(([key, el]) => {
            console.log(`${key}: ${el ? 'Found' : 'Missing'}`);
        });

        // FIXED: Handle different user data structures
        let user = null;
        if (userData) {
            // Check if userData has a nested user property or is the user directly
            user = userData.user || userData;
        }

        // If no user data passed, try to get it from auth
        if (!user && isAuthenticated) {
            const authData = auth.user.get();
            user = authData?.user || authData;
        }

        console.log('Final user object:', user);

        if (isAuthenticated && user) {
            this.hideElement(elements.loginLink);
            this.hideElement(elements.registerLink);
            this.showElement(elements.logoutLink);
            this.showElement(elements.createArticleLink);
            this.showElement(elements.linksLink);
            this.showElement(elements.codeSnippetsLink);
            this.showElement(elements.userInfo);
            this.showElement(elements.searchBar);

            if (elements.userInfo) {
                elements.userInfo.textContent = `${user.firstName || user.email}`;
            }

            if (user.role === 'super') {
                console.log('Setting up super admin navigation');
                this.showElement(elements.superAdminLink);
                this.hideElement(elements.adminLink);
            } else if (user.role === 'admin') {
                console.log('Setting up admin navigation');
                this.hideElement(elements.superAdminLink);
                this.showElement(elements.adminLink);
            } else {
                this.hideElement(elements.adminLink);
                this.hideElement(elements.superAdminLink);
            }
        } else {
            this.showElement(elements.loginLink);
            this.showElement(elements.registerLink);
            this.hideElement(elements.logoutLink);
            this.hideElement(elements.createArticleLink);
            this.hideElement(elements.adminLink);
            this.hideElement(elements.superAdminLink);
            this.hideElement(elements.userInfo);
            this.hideElement(elements.searchBar);
            this.hideElement(elements.linksLink);
            this.hideElement(elements.codeSnippetsLink);

            if (elements.userInfo) {
                elements.userInfo.textContent = '';
            }
        }
    } catch (error) {
        console.error('Error updating navigation:', error);
    }
},

    forceUpdateNavigation() {
        const elements = {
            loginLink: document.getElementById('loginLink'),
            registerLink: document.getElementById('registerLink'),
            logoutLink: document.getElementById('logoutLink'),
            createArticleLink: document.getElementById('createArticleLink'),
            adminLink: document.getElementById('adminLink'),
            superAdminLink: document.getElementById('superAdminLink'),
            userInfo: document.getElementById('userInfo'),
            searchBar: document.getElementById('searchBar'),
            linksLink: document.getElementById('linksLink'),
            codeSnippetsLink: document.getElementById('codeSnippetsLink')
        };
    
        // Show only login/register
        this.showElement(elements.loginLink);
        this.showElement(elements.registerLink);
    
        // Hide all authenticated elements
        this.hideElement(elements.logoutLink);
        this.hideElement(elements.createArticleLink);
        this.hideElement(elements.adminLink);
        this.hideElement(elements.superAdminLink);
        this.hideElement(elements.userInfo);
        this.hideElement(elements.searchBar);
        this.hideElement(elements.linksLink);
        this.hideElement(elements.codeSnippetsLink); 
    
        if (elements.userInfo) {
            elements.userInfo.textContent = '';
        }
    },

    showElement(element) {
        if (element && element instanceof HTMLElement) {
            element.classList.remove('hidden');
        }
    },

    hideElement(element) {
        if (element && element instanceof HTMLElement) {
            element.classList.add('hidden');
        }
    },

    showError(message, duration = 4000) {
        this.showToast(message, 'error', duration);
    },

    showSuccess(message, duration = 4000) {
        this.showToast(message, 'success', duration);
    },

    showToast(message, type = 'error', duration = 4000) { 
        const container = this.getElement('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
        
        toast.className = `p-4 mb-4 rounded shadow-lg ${bgColor} text-white`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, duration);
    }
};