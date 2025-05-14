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
                  // Upload using base64 data directly
                const imageData = {
                    image_data: e.target.result
                };
                
                // Upload the picture
                uploadProfilePicture(imageData);
            };
            
            reader.readAsDataURL(file);
        }
    });
      // Remove profile picture
    if (removeProfilePictureButton) {
    removeProfilePictureButton.addEventListener('click', function() {
            // Show loading notification
            showNotification('Removing profile picture...', 'info');
            
            fetch('/api/profile-picture/', {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server responded with status: ' + response.status);
                }
                return response.json();
            })
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
                        
                        const pictureContainer = document.querySelector('.profile-picture-container');
                        // Clear the container first
                        pictureContainer.innerHTML = '';
                        // Add the initials container
                        pictureContainer.appendChild(container);
                        // Add back the overlay for camera icon
                        const overlay = document.createElement('div');
                        overlay.className = 'profile-picture-overlay';
                        overlay.innerHTML = '<i class="fas fa-camera text-white text-3xl"></i>';
                        pictureContainer.appendChild(overlay);
                    }
                    
                    // Hide the remove button
                    removeProfilePictureButton.classList.add('hidden');
                    
                    // Re-establish click handler
                    const container = document.querySelector('.profile-picture-container');
                    if (container) {
                        container.onclick = function() {
                            document.getElementById('profilePictureInput').click();
                        };
                    }
                    
                    showNotification('Profile picture removed successfully');
                } else {
                    showNotification(data.message || 'Failed to remove profile picture', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('An error occurred: ' + error.message, 'error');
            });
        });
    }    // Upload profile picture function
    function uploadProfilePicture(imageData) {
        // Show loading notification
        showNotification('Uploading profile picture...', 'info');
        
        fetch('/api/profile-picture/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: new URLSearchParams(imageData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server responded with status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('Profile picture updated successfully');
                removeProfilePictureButton.classList.remove('hidden');
            } else {
                showNotification(data.message || 'Failed to update profile picture', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred: ' + error.message, 'error');
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
    // Replace the getInitials() function with this:
    function getInitials() {
        // Try to get initials from the existing element on the page
        const profileInitialsElement = document.getElementById('profileInitials');
        if (profileInitialsElement && profileInitialsElement.textContent && 
            profileInitialsElement.textContent !== '{{ initials }}') {
            return profileInitialsElement.textContent;
        }
        
        // Fallback to generating from name if available on page
        const nameElement = document.querySelector('[data-user-fullname]');
        if (nameElement && nameElement.dataset.userFullname) {
            const fullName = nameElement.dataset.userFullname;
            return fullName.split(' ').map(n => n[0]).join('').toUpperCase();
        }
        
        // Last resort - return placeholder
        return 'U';
    }
      // Show notification function
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        
        // Choose background color based on notification type
        let bgColor = 'bg-green-600';
        if (type === 'error') {
            bgColor = 'bg-red-600';
        } else if (type === 'info') {
            bgColor = 'bg-blue-600';
        }
        
        notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${bgColor} text-white transition-all duration-300 transform translate-y-0`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove older notifications
        const notifications = document.querySelectorAll('.bottom-4.right-4');
        if (notifications.length > 3) {
            notifications[0].remove();
        }
        
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