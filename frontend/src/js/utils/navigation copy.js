// frontend/src/js/utils/navigation.js
import { api } from './api.js';
import { auth } from './auth.js';

class NavigationSystem {
    constructor() {
        this.sections = [];
        this.isCollapsed = false;
        this.isSectionsCollapsed = false;
        this.initialized = false;
        this.sidebarWidth = '13rem';
        this.collapsedWidth = '2rem';
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.toggleSidebar = this.toggleSidebar.bind(this);
        this.toggleSections = this.toggleSections.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }
    async refreshSections() {
        if (!auth.isAuthenticated()) return;
        
        try {
            await this.fetchSections();
            const sectionsNav = document.getElementById('sectionsNav');
            if (sectionsNav) {
                sectionsNav.innerHTML = `
                    <a href="#articles" 
                       class="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                        <span>All Articles</span>
                    </a>
                    ${this.sections.map(section => `
                        <div class="section-item group" data-section-id="${section._id}">
                            <a href="#section/${section._id}" 
                               class="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-80 hover:text-gray-900 w-full">
                               <span class="truncate">${this.escapeHtml(section.name)}</span>
                            </a>
                            ${section.description ? `
                                <div class="section-tooltip opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200">
                                    ${this.escapeHtml(section.description)}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Error refreshing sections:', error);
        }
    }

    async initialize() {
        if (!auth.isAuthenticated()) {
            this.cleanup();
            return false;
        }

        try {
            // Clean up any existing sidebar first
            this.cleanup();
            await this.fetchSections();
            this.loadSavedState();
            this.renderSidebar();
            this.bindEvents();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Sidebar initialization error:', error);
            return false;
        }
        
    }


    async fetchSections() {
        try {
            const response = await api.get('/api/sections');
            this.sections = response.success ? response.data : [];
        } catch (error) {
            console.error('Error fetching sections:', error);
            this.sections = [];
        }
    }

    loadSavedState() {
        this.isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.isSectionsCollapsed = localStorage.getItem('sectionsCollapsed') === 'true';
        
        const sectionsNav = document.getElementById('sectionsNav');
        if (sectionsNav) {
            sectionsNav.style.display = this.isSectionsCollapsed ? 'none' : 'block';
        }
    }

    renderSidebar() {
        const sidebarContainer = document.getElementById('sidebarContainer');
        if (!sidebarContainer) return;

        sidebarContainer.innerHTML = this.createSidebarHTML();
        this.updateSidebarState();
        this.updateMainContentMargin();
    }

    createSidebarHTML() {
        return `
        <div id="sidebar" class="h-screen bg-white shadow-lg transition-all duration-300 sticky top-0 overflow-y-auto">
            <div class="flex flex-col h-auto min-h-0">
                <div class="p-4">
                    <div class="section-header">
                        <div class="gradient-background">
                            <a href="#create-article" class="block">
                                <span class="section-text">Add Article</span>
                            </a>
                        </div>
                    </div>
                </div>
                
                <div class="px-4 pb-2">
                    <a href="#links" class="flex items-center py-2 px-4 text-gray-800 hover:bg-gray-100 rounded-lg">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span class="text-sm font-semibold">Links</span>
                    </a>
                </div>

                <div class="px-4">
                    <div class="border-t border-gray-150 my-2"></div>
                </div>

                <div class="px-4 pb-2">
                    <a href="#code-snippets" class="flex items-center py-2 px-4 text-gray-800 hover:bg-gray-100 rounded-lg">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                        </svg>
                        <span class="text-sm font-semibold">Code Snippets</span>
                    </a>
                </div>

                <div class="px-4">
                    <div class="border-t border-gray-150 my-2"></div>
                </div>

                <div class="px-4 pb-2">
                    <a href="#phone-directory" class="flex items-center py-2 px-4 text-gray-800 hover:bg-gray-100 rounded-lg">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                        <span class="text-[13px] font-semibold">Phone Directory</span>
                    </a>
                </div>

                <div class="px-4">
                    <div class="border-t border-gray-150 my-2"></div>
                </div>

                <div class="px-4 pb-2">
                    <a href="#bookmarks" class="flex items-center py-2 px-4 text-gray-800 hover:bg-gray-100 rounded-lg">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                        <span class="text-sm font-semibold">Bookmarks</span>
                    </a>
                </div>
                 <div class="px-4">
                    <div class="border-t border-gray-150 my-2"></div>
                </div>
                  <div class="px-4 pb-2">
                    <a href="#apex" class="flex items-center py-2 px-4 text-gray-800 hover:bg-gray-100 rounded-lg">
       <svg xmlns="http://www.w3.org/2000/svg"
     fill="none"
     viewBox="0 0 24 24"
     stroke-width="2"
     stroke="currentColor"
     class="w-5 h-5 mr-2">
  <rect x="4" y="4" width="16" height="16" rx="3" ry="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>


                        <span class="text-sm font-semibold">Oracle Apex</span>
                    </a>
                </div>

                <div class="px-4">
                    <div class="border-t border-gray-150 my-2"></div>
                </div>

                <div class="px-4 pt-2">
                    <div id="sectionsToggle" class="flex items-center justify-between py-2 px-4 text-gray-800 hover:bg-gray-100 cursor-pointer rounded-lg">
                        <span class="text-m font-semibold">Articles</span>
                        <svg class="w-4 h-4 transform transition-transform duration-200" id="sectionArrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <div class="flex-1 overflow-visible" id="sectionsNav">
                    <div class="sections-wrapper">
                        <a href="#articles" 
                           class="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                            <span>All Articles</span>
                        </a>

                        ${this.sections.map(section => `
                            <div class="section-item group" data-section-id="${section._id}">
                                <a href="#section/${section._id}" 
                                   class="flex items-center px-5 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full">
                                   <span class="truncate">${this.escapeHtml(section.name)}</span>
                                </a>
                                ${section.description ? `
                                    <div class="section-tooltip opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200">
                                        ${this.escapeHtml(section.description)}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <button id="sidebarToggle" class="fixed left-[208px] top-28 bg-white p-2 rounded-r-lg shadow-md hover:bg-gray-50 transition-all duration-300 z-50 cursor-pointer">
            <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
        </button>`;
    }
    
    updateSidebarState() {
        const sidebar = document.getElementById('sidebar');
        const sidebarContainer = document.getElementById('sidebarContainer');
        const toggleBtn = document.getElementById('sidebarToggle');
        const sidebarTexts = document.querySelectorAll('#sectionsNav span, #sectionsToggle span, .section-text');
        
        if (!sidebar || !sidebarContainer || !toggleBtn) return;
    
        if (this.isCollapsed) {
            // Sidebar state
            sidebar.classList.add('-translate-x-full');
            document.body.classList.remove('sidebar-expanded');
            document.body.classList.add('sidebar-collapsed');
            
            // Hide text elements
            sidebarTexts.forEach(text => text.style.display = 'none');
            
            // Handle toggle button specifically
            toggleBtn.style.pointerEvents = 'auto';
        } else {
            // Sidebar state
            sidebar.classList.remove('-translate-x-full');
            document.body.classList.remove('sidebar-collapsed');
            document.body.classList.add('sidebar-expanded');
            
            // Show text elements
            sidebarTexts.forEach(text => text.style.display = 'block');
            
            // Handle toggle button specifically
            toggleBtn.style.pointerEvents = 'auto';
        }
    
        // Update margin for main content
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            mainContainer.style.marginLeft = this.isCollapsed ? '2rem' : '13rem';
        }
    
        // Always ensure these styles are set
        if (toggleBtn) {
            toggleBtn.style.zIndex = '50';
            toggleBtn.style.pointerEvents = 'auto';
        }
    
        // Dispatch custom event for other components
        document.dispatchEvent(new CustomEvent('sidebarStateChange'));
    }

    renderSectionLinks() {
        return this.sections.map(section => `
            <div class="section-item group relative" data-section-id="${section._id}">
                <a href="#section/${section._id}" 
                   class="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                    ${this.escapeHtml(section.name)}
                </a>
                ${section.description ? `
                    <div class="section-tooltip">
                        ${this.escapeHtml(section.description)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    
    

    updateMainContentMargin() {
        const main = document.querySelector('main');
        if (!main) return;

        const margin = this.isCollapsed ? this.collapsedWidth : this.sidebarWidth;
        main.style.marginLeft = margin;
    }

    bindEvents() {
        // Toggle sidebar
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleSidebar);
        }

        // Toggle sections
        const sectionsToggle = document.getElementById('sectionsToggle');
        if (sectionsToggle) {
            sectionsToggle.addEventListener('click', this.toggleSections);
        }

        // Handle resize
        window.removeEventListener('resize', this.handleResize);
        window.addEventListener('resize', this.handleResize);
    }

    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
        localStorage.setItem('sidebarCollapsed', this.isCollapsed);
        this.updateSidebarState();
        this.updateMainContentMargin();
    }

    toggleSections() {
        this.isSectionsCollapsed = !this.isSectionsCollapsed;
        localStorage.setItem('sectionsCollapsed', this.isSectionsCollapsed);
        
        const sectionsNav = document.getElementById('sectionsNav');
        const arrow = document.getElementById('sectionArrow');
        if (!sectionsNav || !arrow) return;
    
        if (this.isSectionsCollapsed) {
            sectionsNav.style.display = 'none';
            arrow.style.transform = 'rotate(-180deg)';
        } else {
            sectionsNav.style.display = 'block';
            arrow.style.transform = 'rotate(0)';
        }
    }

    handleResize() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.updateSidebarState();
            this.updateMainContentMargin();
        }, 100);
    }

    cleanup() {
        const sidebarContainer = document.getElementById('sidebarContainer');
        if (sidebarContainer) {
            sidebarContainer.innerHTML = '';
        }
        window.removeEventListener('resize', this.handleResize);
        this.initialized = false;
    }
     // Add this for backwards compatibility
     removeSidebar() {
        this.cleanup();
        // Remove sidebar-related classes from main content
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.style.marginLeft = '0';
            mainContent.classList.remove('sidebar-expanded', 'sidebar-collapsed');
        }
        document.body.classList.remove('sidebar-expanded', 'sidebar-collapsed');
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    updateActiveSection(sectionId) {
        const links = document.querySelectorAll('.section-item a');
        links.forEach(link => {
            link.classList.remove('bg-gray-100', 'text-gray-900');
            const parentItem = link.closest('.section-item');
            if (parentItem && parentItem.dataset.sectionId === sectionId) {
                link.classList.add('bg-gray-100', 'text-gray-900');
            }
        });
    }
}

export const navigation = new NavigationSystem();