/**
 * Theme Toggle and Persistence Logic
 * Handles switching between Light and Dark themes
 */

(function() {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        updateToggleIcon(newTheme);
        
        // Dispatch custom event for other scripts to react
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    };

    function updateToggleIcon(theme) {
        const icons = document.querySelectorAll('.theme-toggle-i');
        icons.forEach(icon => {
            if (theme === 'dark') {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        });
    }

    // Initialize icons on load
    document.addEventListener('DOMContentLoaded', () => {
        updateToggleIcon(savedTheme);
        
        // Add listeners to any theme toggle buttons
        const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', window.toggleTheme);
        });
    });
})();
