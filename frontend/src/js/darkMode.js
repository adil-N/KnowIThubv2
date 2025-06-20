export class DarkModeManager {
    constructor() {
        this.darkModeToggle = null;
        this.transitionDuration = 200; // ms
    }

    init() {
        // Add transition classes to html element
        document.documentElement.classList.add('transition-colors', 'duration-200');
        
        // Check for saved dark mode preference
        const savedDarkMode = localStorage.getItem('darkMode');
        
        if (savedDarkMode === 'enabled') {
            this.enableDarkMode(false); // false = no transition on initial load
        } else if (savedDarkMode === 'disabled') {
            this.disableDarkMode(false);
        } else {
            // Default to system preference
            this.checkSystemPreference();
        }

        // Ensure the toggle is created after a short delay
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }

    setupEventListeners() {
        // Create dark mode toggle button if it doesn't exist
        if (!document.getElementById('darkModeToggleBtn')) {
            this.createDarkModeToggle();
        }

        // Listen for system dark mode changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('darkMode')) {
                // Only react to system changes if user hasn't set a preference
                if (e.matches) {
                    this.enableDarkMode();
                } else {
                    this.disableDarkMode();
                }
            }
        });
    }

    createDarkModeToggle() {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'darkModeToggleBtn';
        toggleButton.setAttribute('aria-label', 'Toggle dark mode');
        toggleButton.innerHTML = `
            <svg id="darkModeIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z">
                </path>
            </svg>
        `;
        
        toggleButton.classList.add(
            'dark-mode-toggle', 
            'p-2', 
            'rounded-full', 
            'hover:bg-gray-200', 
            'dark:hover:bg-gray-700',
            'transition-all',
            'duration-300'
        );
        
        toggleButton.addEventListener('click', () => this.toggleDarkMode());

        const navRightSection = document.querySelector('.flex.items-center.space-x-2:last-child');
        if (navRightSection) {
            navRightSection.insertBefore(toggleButton, navRightSection.firstChild);
            this.updateIcon(document.documentElement.classList.contains('dark'));
        }
    }

    toggleDarkMode() {
        if (document.documentElement.classList.contains('dark')) {
            this.disableDarkMode(true);
        } else {
            this.enableDarkMode(true);
        }
    }

    enableDarkMode(withTransition = true) {
        if (!withTransition) {
            document.documentElement.classList.add('duration-0');
        }
        
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'enabled');
        this.updateIcon(true);
        
        if (!withTransition) {
            // Force a reflow
            void document.documentElement.offsetHeight;
            document.documentElement.classList.remove('duration-0');
        }
    }

    disableDarkMode(withTransition = true) {
        if (!withTransition) {
            document.documentElement.classList.add('duration-0');
        }
        
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'disabled');
        this.updateIcon(false);
        
        if (!withTransition) {
            // Force a reflow
            void document.documentElement.offsetHeight;
            document.documentElement.classList.remove('duration-0');
        }
    }

    checkSystemPreference() {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (darkModeMediaQuery.matches) {
            this.enableDarkMode(false);
        } else {
            this.disableDarkMode(false);
        }
    }

    updateIcon(isDark) {
        const icon = document.getElementById('darkModeIcon');
        if (icon) {
            icon.innerHTML = isDark 
                ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m3.343-5.657L5.636 5.636m12.728 12.728L18.364 18.364M12 7a5 5 0 110 10 5 5 0 010-10z" />`
                : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`;
        }
    }
}

export const darkModeManager = new DarkModeManager();