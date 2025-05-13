// Theme handling
(function() {
    try {
        const savedTheme = localStorage.getItem('theme') || 'system';
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme === 'system' ? (systemDark ? 'dark' : 'light') : savedTheme;
        document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
        console.error('Theme initialization failed:', e);
    }
})();

// Theme setting function
(function() {
    try {
        function setTheme(theme) {
            const html = document.documentElement;
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (theme === 'system') {
                html.setAttribute('data-theme', systemDark ? 'dark' : 'light');
            } else {
                html.setAttribute('data-theme', theme);
            }
            localStorage.setItem('theme', theme);
        }

        // Set theme immediately to prevent flash
        const savedTheme = localStorage.getItem('theme') || 'system';
        setTheme(savedTheme);

        // Update on system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const currentTheme = localStorage.getItem('theme') || 'system';
            if (currentTheme === 'system') {
                setTheme('system');
            }
        });
    } catch (e) {
        console.error('Theme initialization failed:', e);
    }
})();

// Tab functionality
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    document.querySelectorAll('[data-tab]').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all tabs and content
            document.querySelectorAll('[data-tab]').forEach(t => {
                t.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active');
            });

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
                
                // If employee-view tab, make sure employee dropdown is visible
                if (tabId === 'employee-view') {
                    const employeeSelect = document.getElementById('employee-select');
                    if (employeeSelect) {
                        employeeSelect.style.display = '';
                        employeeSelect.parentElement.style.display = '';
                        
                        // Trigger a custom event to load employees
                        const event = new CustomEvent('tabActivated');
                        tabContent.dispatchEvent(event);
                    }
                }
            }

            // Save the active tab to localStorage
            localStorage.setItem('activeTab', tabId);
        });
    });

    // Ensure the last active tab is active on page load
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        const savedTabElement = document.querySelector(`[data-tab="${savedTab}"]`);
        if (savedTabElement) {
            savedTabElement.click();
        }
    } else {
        // If no saved tab, activate the first tab
        const firstTab = document.querySelector('[data-tab]');
        if (firstTab) {
            firstTab.click();
        }
    }
});