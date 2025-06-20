// frontend/src/js/app.js

import { auth } from './utils/auth.js';
import { ui } from './utils/ui.js';
import { events } from './utils/events.js';
import { login } from './auth/login.js';
import { register } from './auth/register.js';
import { passwordReset } from './auth/passwordReset.js';
import { articleList } from './articles/articleList.js';
import { articleDetails } from './articles/articleDetails.js';
import { articleCreate } from './articles/articleCreate.js';
import { articleEdit } from './articles/articleEdit.js';
import { articleSearch } from './articles/articleSearch.js';
import { showAdminPanel } from './admin/adminPanel.js';
import { showSuperAdminPanel } from './admin/superAdminPanel.js';
import { navigation } from './utils/navigation.js';
import { forcedPasswordChange } from './auth/forcedPasswordChange.js';
import { linkManagement } from './links/linkManagement.js';
import { codeList } from './code/codeList.js';
import { codeCreate } from './code/codeCreate.js';
import { codeDetails } from './code/codeDetails.js';
import { codeEdit } from './code/codeEdit.js';

// Add these imports with your other imports
import { phoneDirectoryList } from './phonedirectory/phoneDirectoryList.js';
import { phoneDirectoryCreate } from './phonedirectory/phoneDirectoryCreate.js';
import { phoneDirectoryEdit } from './phonedirectory/phoneDirectoryEdit.js';
import { bookmarks } from './bookmarks/bookmarks.js';
import { darkModeManager } from './darkMode.js';


// cleanupArticleFilters after your imports
function cleanupArticleFilters() {
    // Reset all article list filters
    if (articleList) {
        articleList.currentFilter = 'all';
        articleList.currentSort = 'recent';
        articleList.currentDateRange = 'all';
        articleList.currentPage = 1;
        articleList.searchTerm = '';
        articleList.currentSection = 'all';

        // Reset filter UI elements
        ['sortFilter', 'dateFilter', 'authorFilter'].forEach(filterId => {
            const select = document.getElementById(filterId);
            if (select) select.value = 'all';
        });

        // CRITICAL FIX: Force hide and clear filter info
        const filterInfo = document.getElementById('filterInfo');
        if (filterInfo) {
            filterInfo.classList.add('hidden');
            filterInfo.style.display = 'none'; // Force hide with inline style
            filterInfo.innerHTML = ''; // Clear content
        }

        // Reset any active filter buttons
        const filterButtons = document.querySelectorAll('[data-filter]');
        filterButtons.forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-600', 'ring-offset-2');
            btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            if (btn.getAttribute('data-filter') === 'all') {
                btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                btn.classList.add('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-600', 'ring-offset-2');
            }
        });
    }
}
let isAuthenticated = false;


// Event handlers
async function handleLogin(user) {
    try {
        ui.hideLoading();
        ui.updateNavigation(true, user);
        
        // Show search bar after successful login
        const searchBar = document.getElementById('searchBar');
        if (searchBar) {
            searchBar.classList.remove('hidden');
        }
        
        const userData = auth.user.get();
        
        // Ensure auth state is set before initializing navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        await navigation.initialize();

        if (userData?.user?.role === 'admin' || userData?.user?.role === 'super') {
            window.location.hash = '#admin';
        } else {
            // First set up the UI for articles
            await articleList.setSection('all');
            // Initialize banner
            await articleList.initializeFlashBanner();
            // Then change the hash
            window.location.hash = '#articles';
        }
    } catch (error) {
        console.error('Login handler error:', error);
        ui.showError('Error during login process');
    }
}

async function handleLogout() {
    // CRITICAL FIX: Clean up filters FIRST before any other cleanup
    cleanupArticleFilters();
    
    // Hide search bar on logout
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.classList.add('hidden');
    }
    
    // Hide flash banner immediately on logout
    const flashBanner = document.getElementById('flashInfoBanner');
    if (flashBanner) {
        flashBanner.classList.add('hidden');
        flashBanner.style.display = 'none';
    }

    // ADDITIONAL FIX: Ensure filter info is completely hidden
    const filterInfo = document.getElementById('filterInfo');
    if (filterInfo) {
        filterInfo.classList.add('hidden');
        filterInfo.style.display = 'none';
        filterInfo.innerHTML = '';
    }

    auth.logout();
    navigation.removeSidebar();
    ui.hideLoading();
    ui.forceUpdateNavigation();
    
    // Reset UI elements with a slight delay to ensure DOM updates
    setTimeout(() => {
        ui.updateNavigation(false, null);
        
        // ADDITIONAL CLEANUP: Double-check filter info is hidden after UI update
        const filterInfoCheck = document.getElementById('filterInfo');
        if (filterInfoCheck) {
            filterInfoCheck.classList.add('hidden');
            filterInfoCheck.style.display = 'none';
            filterInfoCheck.innerHTML = '';
        }
    }, 0);
    
    window.location.hash = '#login';
}
if (window.linkManagement) {
        window.linkManagement.cleanup();
    }
function handleError(error) {
    ui.hideLoading();
    ui.showError(error.message || 'An error occurred');
}
async function handleRouteChange() {
try {
    const hash = window.location.hash || '#home';
    // Cleanup link management when leaving the page
        if (hash !== '#links' && window.linkManagement) {
            window.linkManagement.cleanup();
        }
    // UNIVERSAL CLEANUP: Hide filter info for any non-article routes
        const articleRoutes = ['#articles', '#home', ''];
        const isArticleRoute = articleRoutes.includes(hash) || hash.startsWith('#section/');
        
        if (!isArticleRoute) {
            const filterInfo = document.getElementById('filterInfo');
            if (filterInfo) {
                filterInfo.classList.add('hidden');
                filterInfo.style.display = 'none';
                filterInfo.innerHTML = '';
            }
        }
    console.log('Route Change Debug:', {
        fullHash: hash,
        pathname: window.location.pathname,
        search: window.location.search
    });
    
    // Always cleanup bookmarks when leaving the bookmarks page
    if (hash !== '#bookmarks') {
        bookmarks.cleanup();
    }
        const isPublicRoute = ['#login', '#register', '#password-reset'].includes(hash);
        const isAuthenticated = auth.isAuthenticated();

        // Hide all sections first
        ui.hideAllSections();
        articleList.updateBannerVisibility();

        const currentUser = auth.user.get();
        const tempAuth = auth.tempAuth.get();

        // Debug log for password reset state
        console.log('Route Change Password Reset Check:', {
            hash,
            currentUser: currentUser?.user,
            tempAuth: tempAuth?.user,
            isAuthenticated
        });

        // Check and clear password reset state if no longer required
        if (currentUser?.user && !currentUser.user.passwordResetRequired) {
            auth.tempAuth.clear();
            localStorage.removeItem('resetEmail');
            
            // Extra precaution to hide reset form
            const resetForm = document.getElementById('forcedPasswordChangeForm');
            if (resetForm) {
                resetForm.classList.add('hidden');
                resetForm.style.display = 'none';
            }
        }

        // First handle the force-change-password case
        if (hash === '#force-change-password') {
            if (!tempAuth && (!currentUser?.user?.passwordResetRequired)) {
                console.log('No password reset required, redirecting to login');
                window.location.hash = '#login';
                return;
            }
            
            // Ensure the forced password change form is shown
            ui.showSection('forcedPasswordChangeForm');
            forcedPasswordChange.initialize();
            return;
        }

        // Handle links section visibility and cleanup
        const linksSection = document.getElementById('linksSection');
        if (linksSection) {
            if (hash !== '#links') {
                linksSection.classList.add('hidden', 'absolute');
                linksSection.classList.remove('relative');
                linksSection.innerHTML = ''; // Clear content when navigating away
                linkManagement.initialized = false; // Reset initialization state
            }
        }
// Add in your route change handling logic

if (hash !== '#create-directory-entry') {
    phoneDirectoryCreate.cleanup();
}
if (!hash.startsWith('#edit-directory-entry/')) {
    phoneDirectoryEdit.cleanup();
}
        // Clean up editor if leaving create article
        if (window.location.hash !== '#create-article' && tinymce.get('articleContent')) {
            articleCreate.cleanup();
        }

// Handle public routes
if (isPublicRoute) {
    // CRITICAL FIX: Clean up filters when navigating to public routes
    cleanupArticleFilters();
    navigation.removeSidebar();
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.classList.add('hidden');
    if (isAuthenticated && !currentUser?.user?.passwordResetRequired) {
        window.location.hash = '#articles';
        return;
    }
} else if (!isAuthenticated) {
    window.location.hash = '#login';
    return;
    
} else {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.classList.remove('hidden');
    if (!document.getElementById('sidebarNav')) {
        await navigation.initialize();
    }
}

// Password reset requirement check for non-public routes
// For all other routes, check if password reset is required
if (currentUser?.user?.passwordResetRequired && hash !== '#force-change-password') {
    console.log('Password reset required, redirecting to force change password');
    window.location.hash = '#force-change-password';
    return;
}
 
// Handle routes
switch (hash) {
   
    case '#login':
    if (currentUser?.user?.passwordResetRequired || tempAuth) {
        console.log('Password reset required, redirecting to force change password');
        window.location.hash = '#force-change-password';
        return;
    }
    if (isAuthenticated) {
        window.location.hash = '#articles';
    } else {
        ui.showSection('loginForm');
    }
    break;


        
            case '#links':
                if (!isAuthenticated) {
                    window.location.hash = '#login';
                    return;
                }
                try {
                    // Ensure navigation is initialized first
                    if (!navigation.initialized) {
                        await navigation.initialize();
                    }
            
                    // Show section before initializing
                    ui.showSection('linksSection');
                    
                    // Prepare links section
                    if (linksSection) {
                        linksSection.classList.remove('hidden', 'absolute');
                        linksSection.classList.add('relative');
                    }
                    
                    // Force reinitialization of link management
                    linkManagement.initialized = false;
                    await linkManagement.initialize();
                    await linkManagement.loadLinks();
                } catch (error) {
                    console.error('Error loading links page:', error);
                    ui.showError('Failed to load links');
                }
                break;

                case '#articles':
    if (!isAuthenticated) {
        window.location.hash = '#login';
        return;
    }
    try {
        // Ensure links section is cleared
        const linksSection = document.getElementById('linksSection');
        if (linksSection) {
            linksSection.classList.add('hidden', 'absolute');
            linksSection.classList.remove('relative');
            linksSection.innerHTML = '';
            linkManagement.initialized = false;
        }
        
        // Reset article list state
        articleList.currentPage = 1;
        
        // Show article list section
        ui.showSection('articleList');
        
        // Set section to 'all' and update navigation
        await articleList.setSection('all');
        navigation.updateActiveSection('all');
        
        // Initialize flash banner
        await articleList.initializeFlashBanner();
    } catch (error) {
        console.error('Error loading home/articles page:', error);
        ui.showError('Failed to load articles');
    }
    break;
               
// In handleRouteChange function, add a case:
case '#bookmarks':
    cleanupArticleFilters();
    if (!isAuthenticated) {
        window.location.hash = '#login';
        return;
    }
    try {
        // First cleanup any existing bookmarks
        bookmarks.cleanup();
        
        // Hide all other sections
        ui.hideAllSections();
        
        // Initialize bookmarks and check result
        const initialized = await bookmarks.initialize();
        
        if (!initialized) {
            throw new Error('Failed to initialize bookmarks');
        }
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        ui.showError('Failed to load bookmarks');
        window.location.hash = '#articles';
    }
    break;
// In handleRouteChange function, add a case:
case '#apex':
    if (!isAuthenticated) {
        window.location.hash = '#login';
        return;
    }
    // Open your Oracle Apex app immediately
    window.open(
        'https://apex.oracle.com/pls/apex/r/projects_report/ddf-i-t-operations/login',
        '_blank'
    );
    // Optionally, redirect user *somewhere else* after opening popup
    window.location.hash = '#home';
    break;


               case '#register':
                if (isAuthenticated) {
                    window.location.hash = '#articles';
                } else {
                    ui.showSection('registerForm');
                }
                break;
                //section
                case hash.match(/^#section\/[^/]+$/)?.input:
                    if (!isAuthenticated) {
                        window.location.hash = '#login';
                        return;
                    }
                    try {
                        // Extract section ID
                        const sectionId = hash.split('/')[1];
                        console.log('Loading section:', sectionId);
                        
                        // Reset article list state
                        articleList.currentPage = 1;
                        
                        // Show article list section first
                        ui.showSection('articleList');
                        
                        // Set the section
                        await articleList.setSection(sectionId);
                        
                        // Update navigation
                        navigation.updateActiveSection(sectionId);
                    } catch (error) {
                        console.error('Error loading section:', error);
                        ui.showError('Failed to load section articles');
                        window.location.hash = '#articles';
                    }
                    break;
                    case '#create-article':
                console.log('Handling create-article route');
                if (!auth.isAuthenticated()) {
                    console.log('User not authenticated, redirecting to login');
                    window.location.hash = '#login';
                    return;
                }

                try {
                    ui.showLoading();
                    
                    // Cleanup any existing instances before showing new form
                    articleCreate.cleanup();
                    
                    // Show the section first
                    ui.showSection('createArticleForm');
                    
                    // Then initialize
                    const initialized = await articleCreate.initialize();
                    if (!initialized) {
                        throw new Error('Failed to initialize article creation form');
                    }
                    
                    console.log('Article create form initialized successfully');
                } catch (error) {
                    console.error('Error initializing create article form:', error);
                    ui.showError('Failed to initialize article creation form');
                    window.location.hash = '#articles';
                } finally {
                    ui.hideLoading();
                }
                break;
                            case '#admin':
                console.log('=== Handling Admin Route ===');
                const userData = auth.user.get();
                console.log('User Data:', userData);
                
                if (!isAuthenticated) {
                    console.log('Not authenticated, redirecting to login');
                    window.location.hash = '#login';
                    return;
                }
                
                try {
                    ui.showLoading();
                    console.log('User role:', userData?.user?.role);
                    
                    if (userData?.user?.role === 'super') {
                        console.log('Initializing super admin view...');
                        // Show the container first
                        ui.showSection('superAdminPanel');
                        // Then load the content
                        const success = await showSuperAdminPanel();
                        if (!success) {
                            throw new Error('Failed to initialize super admin panel');
                        }
                    } else if (userData?.user?.role === 'admin') {
                        console.log('Initializing admin view...');
                        ui.showSection('adminPanelContainer');
                        await showAdminPanel();
                    } else {
                        throw new Error('Invalid user role');
                    }
                } catch (error) {
                    console.error('Admin panel error:', error);
                    ui.showError(error.message);
                    window.location.hash = '#articles';
                } finally {
                    ui.hideLoading();
                }
                break;

                
                case '#password-reset':
        ui.showSection('passwordResetForm');
        break;
    
        
        case '#home':
            if (!isAuthenticated) {
                window.location.hash = '#login';
                return;
            }
            try {
                // Ensure links section is cleared
                if (linksSection) {
                    linksSection.classList.add('hidden', 'absolute');
                    linksSection.classList.remove('relative');
                    linksSection.innerHTML = '';
                    linkManagement.initialized = false;
                }
                // Reset article list state
                articleList.articles = [];
                articleList.currentPage = 1;
                
                // Show article list section
                ui.showSection('articleList');
                
                // Set section to 'all' and update navigation
                await articleList.setSection('all');
                navigation.updateActiveSection('all');
                
                // Initialize flash banner
                await articleList.initializeFlashBanner();
            } catch (error) {
                console.error('Error loading home page:', error);
                ui.showError('Failed to load home page');
            }
            break;
            case hash.match(/^#edit-article\/[^/]+$/)?.input:
                if (!isAuthenticated) {
                    console.log('User not authenticated, redirecting to login');
                    window.location.hash = '#login';
                    return;
                }
                try {
                    const articleId = hash.split('/')[1];
                    console.log('Initializing article edit for:', articleId);
                    
                    // Clear any existing editor instances
                    if (tinymce.get('editArticleContent')) {
                        tinymce.get('editArticleContent').remove();
                    }
            
                    // Show the section before initializing
                    ui.showSection('editArticleForm');
                    console.log('Edit article form section shown');
            
                    // Initialize the edit form
                    const editSuccess = await articleEdit.initialize(articleId);
                    console.log('Article edit initialization result:', editSuccess);
            
                    if (!editSuccess) {
                        throw new Error('Failed to initialize article edit form');
                    }
                } catch (error) {
                    console.error('Error initializing article edit:', error);
                    ui.showError(error.message || 'Failed to load article for editing');
                    window.location.hash = '#articles';
                }
                break;

// code page cases
// Add these cases in the switch statement inside handleRouteChange function
// Place them before the default case

case '#code-snippets':
    cleanupArticleFilters();
    if (!isAuthenticated) {
        window.location.hash = '#login';
        return;
    }
    try {
        console.log('Loading code snippets page...');
        
        // First show the section
        ui.showSection('codeSnippetsSection');
        
        // Then initialize the code list
        if (!codeList.initialized) {
            await codeList.initialize();
        } else {
            // If already initialized, just reload snippets
            await codeList.loadSnippets();
        }
    } catch (error) {
        console.error('Error loading code snippets:', error);
        ui.showError('Failed to load code snippets');
    }
    break;

    case '#create-snippet':
        if (!isAuthenticated) {
            window.location.hash = '#login';
            return;
        }
        try {
            console.log('Initializing create snippet form...');
            ui.showSection('codeSnippetsSection');
            // Reset initialization state to ensure clean form
            codeCreate.initialized = false;
            await codeCreate.initialize();
        } catch (error) {
            console.error('Error initializing create snippet form:', error);
            ui.showError('Failed to initialize create form');
        }
        break;

case hash.match(/^#snippet\/[^/]+$/)?.input:
    if (!isAuthenticated) {
        window.location.hash = '#login';
        return;
    }
    try {
        const snippetId = hash.split('/')[1];
        ui.showSection('codeDetails');
        await codeDetails.initialize(snippetId);
    } catch (error) {
        console.error('Error loading snippet details:', error);
        ui.showError('Failed to load snippet details');
    }
    break;

case hash.match(/^#edit-snippet\/[^/]+$/)?.input:
    if (!isAuthenticated) {
        window.location.hash = '#login';
        return;
    }
    try {
        const editSnippetId = hash.split('/')[1];
        ui.showSection('editSnippetForm');
        await codeEdit.initialize(editSnippetId);
    } catch (error) {
        console.error('Error initializing snippet edit:', error);
        ui.showError('Failed to initialize edit form');
    }
    break;
// Add these cases in your switch statement
case '#phone-directory':
    cleanupArticleFilters();
    console.log('=== Handling Phone Directory Route ===');
    if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        window.location.hash = '#login';
        return;
    }
    
    try {
        // Reset state if coming from another page
        if (!phoneDirectoryList.initialized) {
            phoneDirectoryList.resetState();
        }

        // First ensure the section exists in the DOM
        let phoneDirectorySection = document.getElementById('phoneDirectorySection');
        if (!phoneDirectorySection) {
            console.log('Creating phone directory section');
            phoneDirectorySection = document.createElement('div');
            phoneDirectorySection.id = 'phoneDirectorySection';
            document.querySelector('main').appendChild(phoneDirectorySection);
        }

        // Show the section
        console.log('Showing phone directory section');
        ui.showSection('phoneDirectorySection');
        
        // Initialize the component
        console.log('Initializing phone directory');
        await phoneDirectoryList.initialize();
        
        console.log('Phone directory initialization completed');
    } catch (error) {
        console.error('Error in phone directory route:', error);
        ui.showError('Failed to load phone directory');
        
        // Optionally redirect to a fallback route
        // window.location.hash = '#home';
    }
    break;

case '#create-directory-entry':
    if (!isAuthenticated) {
        window.location.hash = '#login';
        return;
    }
    try {
        ui.showSection('phoneDirectoryCreateForm');
        await phoneDirectoryCreate.initialize();
    } catch (error) {
        console.error('Error initializing directory entry creation:', error);
        ui.showError('Failed to initialize entry creation form');
    }
    break;

    case hash.match(/^#edit-directory-entry\/[^/]+$/)?.input:
        if (!isAuthenticated) {
            window.location.hash = '#login';
            return;
        }
        try {
            const directoryId = hash.split('/')[1];
            ui.showSection('phoneDirectoryEditForm');
            await phoneDirectoryEdit.initialize(directoryId);
        } catch (error) {
            console.error('Error initializing directory edit:', error);
            ui.showError('Failed to initialize edit form');
        }
        break;


//default case
        
// In the default case of handleRouteChange
default:
    if (hash.startsWith('#article/')) {
        // More robust ID extraction
        const parts = hash.split('/');
        const articleId = parts[1];
        
        console.log('Detailed Article Navigation:', {
            fullHash: hash,
            hashParts: parts,
            extractedId: articleId
        });
        
        // Stricter validation of article ID
        if (!articleId || articleId === 'undefined' || articleId.trim() === '') {
            console.error('Invalid article ID', { 
                hash, 
                parts, 
                articleId 
            });
            window.location.hash = '#articles';
            return;
        }
        
        try {
            ui.showSection('articleDetails');
            
            console.log('Attempting to initialize article details with ID:', articleId);
            
            await articleDetails.initialize(articleId);
        } catch (error) {
            console.error('Comprehensive article loading error:', {
                articleId,
                errorMessage: error.message,
                errorStack: error.stack
            });
            
            ui.showError(error.message || 'Failed to load article');
            window.location.hash = '#articles';
        }
    }


     // Hide bookmarks section when navigating away
     const bookmarksSection = document.getElementById('bookmarksSection');
     if (bookmarksSection) {
         bookmarksSection.classList.add('hidden');
     }
}

        } catch (error) {
            console.error('Route change error:', error);
            ui.showError('Navigation error occurred');
        }
    
    }

    

// Single initialization point
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App loaded');
    try {
        await ui.initialize();
        ui.showLoading();
        console.log('Starting app initialization...');

        // Add this new code to hide search bar by default
        const searchBar = document.getElementById('searchBar');
        if (searchBar) {
            searchBar.classList.add('hidden');
        }

        // Initialize auth and banner
        const authInitialized = await auth.init();
        console.log('Auth initialization status:', authInitialized);

        isAuthenticated = auth.isAuthenticated();

        // Initialize other modules before showing/hiding UI elements
        login.initialize();
        register.initialize();
        passwordReset.initialize();
        forcedPasswordChange.initialize();
        articleCreate.initialize();

        // Handle search bar visibility after auth check
        if (isAuthenticated && !['#login', '#register', '#password-reset'].includes(window.location.hash)) {
            if (searchBar) searchBar.classList.remove('hidden');
        }

        // Initialize search after handling visibility
        articleSearch.initialize();

// Initialize banner only if authenticated and on home page
// Ensure banner is hidden by default
const flashBanner = document.getElementById('flashInfoBanner');
if (flashBanner) {
    flashBanner.classList.add('hidden');
    flashBanner.style.display = 'none';
}

// Only initialize banner if authenticated
if (isAuthenticated) {
    console.log('User authenticated, initializing flash banner...');
    await articleList.initializeFlashBanner();
}

// Add event listener for login success to initialize banner
events.subscribe('auth:login', async () => {
    console.log('Login successful, initializing flash banner...');
    await articleList.initializeFlashBanner();
});

        // Initialize other modules
        login.initialize();
        register.initialize();
        passwordReset.initialize();
        forcedPasswordChange.initialize();
        articleCreate.initialize();
        articleSearch.initialize();
        console.log('Search elements initialization:', {
            searchForm: document.getElementById('searchForm'),
            searchInput: document.getElementById('searchInput'),
            searchBar: document.getElementById('searchBar')
        });
        
// Initialize link management only if authenticated and on links page
if (isAuthenticated && window.location.hash === '#links') {
    await linkManagement.initialize();
} else {
    const linksSection = document.getElementById('linksSection');
    if (linksSection) {
        linksSection.classList.add('hidden');
        linksSection.innerHTML = ''; // Clear any existing content
    }
}

        console.log('Search elements initialization:', {
            searchForm: document.getElementById('searchForm'),
            searchInput: document.getElementById('searchInput'),
            searchBar: document.getElementById('searchBar')
        });
        
        
        // Subscribe to events
        events.subscribe('auth:login', handleLogin);
        events.subscribe('auth:logout', handleLogout);
        events.subscribe('error', handleError);

        // Setup click handling for hash-based navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href.includes('#')) {
                e.preventDefault();
                e.stopPropagation();
                
                const hash = link.href.split('#')[1];
                if (hash) {
                    window.history.pushState(null, '', `#${hash}`);
                    handleRouteChange();
                }
            }
        });
        // Initialize code snippets only if authenticated and on code snippets page
if (isAuthenticated && window.location.hash === '#code-snippets') {
    await codeList.initialize();
} else {
    const codeSnippetsSection = document.getElementById('codeSnippetsSection');
    if (codeSnippetsSection) {
        codeSnippetsSection.classList.add('hidden');
    }
}
if (isAuthenticated && window.location.hash === '#phone-directory') {
    await phoneDirectoryList.initialize();
} else {
    const phoneDirectorySection = document.getElementById('phoneDirectorySection');
    if (phoneDirectorySection) {
        phoneDirectorySection.classList.add('hidden');
    }
}
        // Handle initial authentication state
if (isAuthenticated) {
    const userData = auth.user.get();
    console.log('User authenticated:', userData);
    ui.updateNavigation(true, userData);
    
    // Initialize navigation only once
    await navigation.initialize();

    // Initialize current route
    if (!window.location.hash) {
        // Load articles first
        await articleList.setSection('all');
        // Then set hash to trigger route change
        window.location.hash = '#home';
    } else {
        // Handle existing hash
        await handleRouteChange();
    }
} else {
    console.log('User not authenticated');
    ui.updateNavigation(false, null);
    window.location.hash = '#login';
}

        // Set up route handler
        window.removeEventListener('hashchange', handleRouteChange);
        window.addEventListener('hashchange', handleRouteChange);

          // Banner visibility handler
          window.addEventListener('hashchange', async () => {
            const flashBanner = document.getElementById('flashInfoBanner');
            if (flashBanner) {
                const currentHash = window.location.hash;
                const isAuthenticated = auth.isAuthenticated();
                const allowedPages = ['', '#home', '#articles'];
                
                console.log('Hash changed:', { currentHash, isAuthenticated });
                
                if (!isAuthenticated || !allowedPages.includes(currentHash)) {
                    flashBanner.classList.add('hidden');
                    return;
                }
        
                await articleList.initializeFlashBanner();
            }
        });
        // Add this with your other event listeners in app.js
window.addEventListener('hashchange', () => {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;

    const isPublicRoute = ['#login', '#register', '#password-reset'].includes(window.location.hash);
    const isAuthenticated = auth.isAuthenticated();

    if (!isAuthenticated || isPublicRoute) {
        searchBar.classList.add('hidden');
    } else {
        searchBar.classList.remove('hidden');
    }
});
                // Add this line near the end, after all other initializations
                window.handleRouteChange = handleRouteChange;
        // Handle initial route
        await handleRouteChange();
        
        ui.hideLoading();
        console.log('App initialization completed');

    } catch (error) {
        console.error('App initialization error:', error);
        ui.hideLoading();
        ui.showError('Error initializing application');
        
        const isAuthenticated = auth.isAuthenticated();
        if (isAuthenticated) {
            window.location.hash = '#articles';
        } else {
            window.location.hash = '#login';
        }
    }


    // Setup clear search functionality
const clearSearchBtn = document.getElementById('clearSearch');
const searchInput = document.getElementById('searchInput');

if (clearSearchBtn && searchInput) {
    // Handle input changes to show/hide clear button
    searchInput.addEventListener('input', (e) => {
        clearSearchBtn.classList.toggle('hidden', e.target.value.trim() === '');
    });

    // Clear button click handler
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        searchInput.focus();
        
        // Reset search state
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.dispatchEvent(new Event('submit'));
        }
        
        // Navigate back to articles list
        window.location.hash = '#articles';
    });
}
      // Explicitly initialize dark mode
      darkModeManager.init();
    
      console.log('Dark Mode Manager initialized');
          // Add Oracle APEX button event listener here
    const openApexBtn = document.getElementById('openApexBtn');
    if (openApexBtn) {
        openApexBtn.addEventListener('click', () => {
            window.open(
                'https://apex.oracle.com/pls/apex/r/projects_report/ddf-i-t-operations/login',
                '_blank'
            );
        });
    }

});