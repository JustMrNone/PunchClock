document.addEventListener('DOMContentLoaded', function() {
    const profilePictureInput = document.getElementById('profilePictureInput');
    const profileImage = document.getElementById('profileImage');
    const profileInitialsContainer = document.getElementById('profileInitialsContainer');
    const removeProfilePictureButton = document.getElementById('removeProfilePicture');
    const themeSelect = document.getElementById('themeSelect');
    const themeOptions = document.querySelectorAll('.theme-option');
    
    // Set initial theme selection from localStorage
    const currentTheme = localStorage.getItem('theme') || 'system';
    themeSelect.value = currentTheme;
    updateSelectedThemeOption(currentTheme);
    
    // Apply the theme on page load
    applyTheme(currentTheme);
    
    // Listen for system color scheme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (currentTheme === 'system') {
            applyTheme('system');
        }
    });
    
    // Handle profile picture input change
    profilePictureInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Show preview of the image
                if (profileInitialsContainer) {
                    profileInitialsContainer.classList.add('hidden');
                }
                
                if (!profileImage) {
                    const newProfileImage = document.createElement('img');
                    newProfileImage.id = 'profileImage';
                    newProfileImage.className = 'profile-picture';
                    newProfileImage.alt = 'Profile Picture';
                    document.querySelector('.profile-picture-container').prepend(newProfileImage);
                    profileImage = newProfileImage;
                }
                
                profileImage.classList.remove('hidden');
                profileImage.src = e.target.result;
                
                // Submit form to upload the picture
                const formData = new FormData(document.getElementById('profilePictureForm'));
                uploadProfilePicture(formData);
            };
            
            reader.readAsDataURL(file);
        }
    });
    
    // Remove profile picture
    if (removeProfilePictureButton) {
        removeProfilePictureButton.addEventListener('click', function() {
            fetch('/api/profile-picture/remove/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show initials, hide image
                    if (profileImage) {
                        profileImage.classList.add('hidden');
                    }
                    if (profileInitialsContainer) {
                        profileInitialsContainer.classList.remove('hidden');
                    } else {
                        const container = document.createElement('div');
                        container.id = 'profileInitialsContainer';
                        container.className = 'w-full h-full bg-indigo-500 flex items-center justify-center';
                        
                        const initials = document.createElement('span');
                        initials.id = 'profileInitials';
                        initials.className = 'profile-initials';
                        initials.textContent = getInitials();
                        
                        container.appendChild(initials);
                        document.querySelector('.profile-picture-container').prepend(container);
                    }
                    
                    // Hide the remove button
                    removeProfilePictureButton.classList.add('hidden');
                    
                    showNotification('Profile picture removed successfully');
                } else {
                    showNotification('Failed to remove profile picture', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('An error occurred', 'error');
            });
        });
    }
    
    // Upload profile picture function
    function uploadProfilePicture(formData) {
        fetch('/api/profile-picture/upload/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Profile picture updated successfully');
                removeProfilePictureButton.classList.remove('hidden');
            } else {
                showNotification('Failed to update profile picture', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred', 'error');
        });
    }
    
    // Theme selection
    themeSelect.addEventListener('change', function() {
        const selectedTheme = this.value;
        localStorage.setItem('theme', selectedTheme);
        applyTheme(selectedTheme);
        updateSelectedThemeOption(selectedTheme);
        
        // Save theme preference to server
        saveThemePreference(selectedTheme);
    });
    
    // Theme option click handlers
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const themeId = this.id.replace('Theme', '');
            themeSelect.value = themeId.toLowerCase();
            themeSelect.dispatchEvent(new Event('change'));
        });
    });
    
    // Update selected theme option visual
    function updateSelectedThemeOption(theme) {
        themeOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        document.getElementById(theme + 'Theme').classList.add('selected');
    }
    
    // Apply theme to page
    function applyTheme(theme) {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const html = document.documentElement;
        
        // Set the actual theme based on the selection
        if (theme === 'system') {
            html.setAttribute('data-theme', systemDark ? 'dark' : 'light');
        } else {
            html.setAttribute('data-theme', theme);
        }
        
        // Add smooth transition
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
        
        // Notify other parts of the app that might need to know about theme changes
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }
    
    // Save theme preference to server
    function saveThemePreference(theme) {
        fetch('/api/user/preferences/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                theme: theme
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Theme preference saved');
            } else {
                console.error('Failed to save theme preference');
            }
        })
        .catch(error => {
            console.error('Error saving theme preference:', error);
        });
    }
    
    // Get user initials function
    function getInitials() {
        const firstName = '{{ request.user.first_name }}';
        const lastName = '{{ request.user.last_name }}';
        
        if (firstName && lastName) {
            return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        } else if (firstName) {
            return firstName.charAt(0).toUpperCase();
        } else if (lastName) {
            return lastName.charAt(0).toUpperCase();
        } else {
            return '{{ request.user.username|slice:":2" }}'.toUpperCase();
        }
    }
    
    // Show notification function
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white transition-all duration-300 transform translate-y-0`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateY(150%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Get CSRF token function
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});