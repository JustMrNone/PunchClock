document.addEventListener('DOMContentLoaded', function() {
    const sidebarUserInitials = document.getElementById('sidebar-user-initials');
    const sidebarProfileImage = document.getElementById('sidebar-profile-image');
    const sidebarProfilePic = document.getElementById('sidebar-profile-pic');
    
    // Set initial background and styling for the initials display
    sidebarProfilePic.classList.add('bg-indigo-500');
      // Handle user initial generation
    function getInitials() {
        const userInitialsElement = document.getElementById('sidebar-user-initials');
        const firstName = userInitialsElement.dataset.firstName;
        const lastName = userInitialsElement.dataset.lastName;
        const username = userInitialsElement.dataset.username;
        
        if (firstName && lastName) {
            return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        } else if (firstName) {
            return firstName.charAt(0).toUpperCase();
        } else if (lastName) {
            return lastName.charAt(0).toUpperCase();
        } else if (username) {
            return username.slice(0, 2).toUpperCase();
        } else {
            return '--';
        }
    }
    
    // Set user initials
    if (sidebarUserInitials.textContent.trim() === '') {
        sidebarUserInitials.textContent = getInitials();
    }
    
    // Fetch profile picture from server
    function fetchProfilePicture() {
        fetch('/api/profile-picture/get/')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.has_image) {
                    // Update UI with the server image
                    sidebarUserInitials.classList.add('hidden');
                    sidebarProfileImage.classList.remove('hidden');
                    sidebarProfileImage.src = data.image_url;
                    // Remove background color when showing the image
                    sidebarProfilePic.classList.remove('bg-gradient-to-b', 'from-indigo-400', 'to-indigo-600');
                    sidebarProfilePic.classList.add('bg-white');
                } else {
                    // Ensure the initials are shown with proper background
                    sidebarUserInitials.classList.remove('hidden');
                    sidebarProfileImage.classList.add('hidden');
                    // Make sure the background gradient is applied
                    sidebarProfilePic.classList.remove('bg-white');
                    sidebarProfilePic.classList.add('bg-indigo-500');
                }
            })
            .catch(error => {
                console.error('Error fetching profile picture:', error);
                // On error, ensure the initials are shown with proper background
                sidebarUserInitials.classList.remove('hidden');
                sidebarProfileImage.classList.add('hidden');
                sidebarProfilePic.classList.remove('bg-white');
                sidebarProfilePic.classList.add('bg-indigo-500');
            });
    }
    
    // Load profile picture when page loads
    fetchProfilePicture();
});