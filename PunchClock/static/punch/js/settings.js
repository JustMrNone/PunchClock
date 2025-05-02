document.addEventListener('DOMContentLoaded', function() {
    // Profile picture functionality
    const uploadBtn = document.getElementById('upload-pic-btn');
    const fileInput = document.getElementById('profile-pic-input');
    const userInitials = document.getElementById('user-initials');
    const profileImage = document.getElementById('profile-image');
    const removeBtn = document.getElementById('remove-pic-btn');
    const cropModal = document.getElementById('crop-modal');
    const cropContainer = document.getElementById('crop-container');
    const closeCropModalBtn = document.getElementById('close-crop-modal-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    const applyCropBtn = document.getElementById('apply-crop-btn');
    
    // Delete confirmation modal elements
    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    let cropper;
    let currentImageUrl = null;

    // Handle user initial generation
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
    
    // Set user initials
    userInitials.textContent = getInitials();

    // Fetch existing profile picture from server
    fetchProfilePicture();
    
    // Trigger file input when upload button is clicked
    uploadBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                cropContainer.innerHTML = `<img id="crop-image" src="${e.target.result}" class="max-w-full">`;
                const cropImage = document.getElementById('crop-image');
                
                cropModal.classList.remove('hidden');
                
                // Initialize cropper after image is loaded
                cropImage.onload = function() {
                    cropper = new Cropper(cropImage, {
                        aspectRatio: 1,
                        viewMode: 2,
                        ready: function() {
                            // Set initial crop box size to be square
                            const containerData = cropper.getContainerData();
                            const minSize = Math.min(containerData.width, containerData.height);
                            cropper.setCropBoxData({
                                width: minSize * 0.8,
                                height: minSize * 0.8
                            });
                        }
                    });
                };
            };
            
            reader.readAsDataURL(this.files[0]);
        }
    });

    // Close crop modal
    closeCropModalBtn.addEventListener('click', closeCropModal);
    cancelCropBtn.addEventListener('click', closeCropModal);
    
    function closeCropModal() {
        cropModal.classList.add('hidden');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    // Apply crop
    applyCropBtn.addEventListener('click', function() {
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 256,
                height: 256,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            const croppedImage = croppedCanvas.toDataURL('image/png');
            
            // Update UI first for better user experience
            userInitials.classList.add('hidden');
            profileImage.classList.remove('hidden');
            profileImage.src = croppedImage;
            removeBtn.classList.remove('hidden');
            
            // Close modal
            closeCropModal();
            
            // Upload to server
            uploadProfilePicture(croppedImage);
        }
    });

    // Handle remove button click - show the custom modal instead of alert
    removeBtn.addEventListener('click', function() {
        deleteModal.classList.remove('hidden');
    });
    
    // Close delete confirmation modal
    closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    
    function closeDeleteModal() {
        deleteModal.classList.add('hidden');
    }
    
    // Handle confirm delete button
    confirmDeleteBtn.addEventListener('click', function() {
        // Close the modal
        closeDeleteModal();
        
        // Show loading notification
        showNotification('Removing profile picture...', 'info');
        
        // Call server to remove the image
        fetch('/api/profile-picture/', {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': '{{ csrf_token }}'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update UI
                userInitials.classList.remove('hidden');
                profileImage.classList.add('hidden');
                profileImage.src = '';
                removeBtn.classList.add('hidden');
                currentImageUrl = null;
                
                showNotification('Profile picture removed successfully.');
            } else {
                showNotification(data.message || 'Failed to remove profile picture.', false);
            }
        })
        .catch(error => {
            console.error('Error removing profile picture:', error);
            showNotification('An error occurred while removing the profile picture.', false);
        });
    });
    
    // Fetch profile picture from server
    function fetchProfilePicture() {
        fetch('/api/profile-picture/get/')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.has_image) {
                    currentImageUrl = data.image_url;
                    
                    // Update UI with the server image
                    userInitials.classList.add('hidden');
                    profileImage.classList.remove('hidden');
                    profileImage.src = data.image_url;
                    removeBtn.classList.remove('hidden');
                }
            })
            .catch(error => {
                console.error('Error fetching profile picture:', error);
            });
    }
    
    // Upload profile picture to server
    function uploadProfilePicture(imageData) {
        // Show loading notification
        showNotification('Uploading profile picture...', 'info');
        
        // Create form data for the upload
        const formData = new FormData();
        formData.append('image_data', imageData);
        
        // Send to server
        fetch('/api/profile-picture/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': '{{ csrf_token }}'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentImageUrl = data.image_url;
                profileImage.src = data.image_url; // Use the server URL
                showNotification('Profile picture uploaded successfully.');
            } else {
                showNotification(data.message || 'Failed to upload profile picture.', false);
            }
        })
        .catch(error => {
            console.error('Error uploading profile picture:', error);
            showNotification('An error occurred while uploading the profile picture.', false);
        });
    }
    
    // Create notification container
    const notificationContainer = document.createElement('div');
    const sidebarWidth = 256; // 16rem sidebar width
    
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.bottom = '2rem';
    notificationContainer.style.left = `calc(50% + ${sidebarWidth/2}px)`;
    notificationContainer.style.transform = 'translateX(-50%)';
    notificationContainer.style.width = '20rem';
    notificationContainer.style.zIndex = '50';
    notificationContainer.style.display = 'none';
    notificationContainer.id = 'notification-container';
    document.body.appendChild(notificationContainer);
    
    let autoHideTimer = null;
    
    // Enhanced notification function
    function showNotification(message, type = 'success') {
        // Clear any existing timer
        if (autoHideTimer) {
            clearTimeout(autoHideTimer);
        }
        
        // Set styles based on notification type
        let bgColor, borderColor, textColor;
        
        switch(type) {
            case 'success':
                bgColor = 'bg-green-100';
                borderColor = 'border-green-500';
                textColor = 'text-green-800';
                break;
            case 'error':
            case false: // For backward compatibility
                bgColor = 'bg-red-100';
                borderColor = 'border-red-500';
                textColor = 'text-red-800';
                break;
            case 'info':
                bgColor = 'bg-blue-100';
                borderColor = 'border-blue-500';
                textColor = 'text-blue-800';
                break;
            case 'warning':
                bgColor = 'bg-yellow-100';
                borderColor = 'border-yellow-500';
                textColor = 'text-yellow-800';
                break;
            default:
                bgColor = 'bg-green-100';
                borderColor = 'border-green-500';
                textColor = 'text-green-800';
        }
        
        notificationContainer.innerHTML = `
            <div class="px-4 py-3 rounded-lg shadow-md ${bgColor} border-l-4 ${borderColor} relative">
                <button type="button" id="close-btn" class="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </button>
                <div class="flex items-center justify-center pr-4">
                    <p class="text-sm font-medium ${textColor}">${message}</p>
                </div>
            </div>
        `;
        
        // Show the notification
        notificationContainer.style.display = 'block';
        
        // Add close button listener
        document.getElementById('close-btn').onclick = function() {
            hideNotification();
        };
        
        // Auto hide after appropriate time based on type
        const timeout = (type === 'success') ? 3000 : 5000;
        autoHideTimer = setTimeout(hideNotification, timeout);
    }
    
    // Hide notification function
    function hideNotification() {
        notificationContainer.style.display = 'none';
        if (autoHideTimer) {
            clearTimeout(autoHideTimer);
            autoHideTimer = null;
        }
    }

    // Existing code for company name editing
    const editButton = document.getElementById('edit-company-name');
    const companyNameInput = document.getElementById('company-name');

    editButton.addEventListener('click', function(event) {
        event.preventDefault();
        
        if (companyNameInput.disabled) {
            companyNameInput.disabled = false;
            companyNameInput.focus();
            editButton.textContent = 'Save';
        } else {
            const companyName = companyNameInput.value;

            fetch('/update-company-name/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': '{{ csrf_token }}'
                },
                body: JSON.stringify({ company_name: companyName })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Company name updated successfully.');
                    companyNameInput.disabled = true;
                    editButton.textContent = 'Edit';
                } else {
                    showNotification(data.message || 'An error occurred while updating company name.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('An unexpected error occurred.', 'error');
            });
        }
    });
    
    // Timezone settings
    const timezoneSelect = document.getElementById('timezone');

    // Load the saved timezone from localStorage or use the user's local timezone
    const savedTimezone = localStorage.getItem('selected-timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    timezoneSelect.value = savedTimezone;

    // Save the selected timezone to localStorage and update the current time
    timezoneSelect.addEventListener('change', function() {
        const selectedTimezone = this.value;
        localStorage.setItem('selected-timezone', selectedTimezone);
        updateTime();
    });

    function updateTime() {
        const timezone = localStorage.getItem('selected-timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const now = new Date().toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true });
        const currentTimeElement = document.getElementById('current-time');
        if (currentTimeElement) {
            currentTimeElement.textContent = now;
        }
    }

    updateTime();
    setInterval(updateTime, 60000); // Update every minute

    // Work hours and rest hours functionality
    const workHoursInput = document.getElementById('work-hours');
    const restHoursInput = document.getElementById('rest-hours');
    const totalWorkHoursDisplay = document.getElementById('total-work-hours');
    const settingsForm = document.querySelector('.bg-white form');
    
    // Calculate total work hours
    function calculateTotalWorkHours() {
        const workHours = parseFloat(workHoursInput.value) || 0;
        const restHours = parseFloat(restHoursInput.value) || 0;
        const totalHours = Math.max(0, workHours - restHours);
        totalWorkHoursDisplay.textContent = totalHours.toFixed(1);
    }
    
    // Load company settings
    function loadCompanySettings() {
        fetch('/api/company-settings/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': '{{ csrf_token }}'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                workHoursInput.value = data.work_hours || '';
                restHoursInput.value = data.rest_hours || '';
                calculateTotalWorkHours();
            } else {
                console.error('Failed to load company settings:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading company settings:', error);
        });
    }
    
    // Save company settings
    settingsForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const workHours = parseFloat(workHoursInput.value) || 0;
        const restHours = parseFloat(restHoursInput.value) || 0;
        
        fetch('/api/company-settings/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': '{{ csrf_token }}'
            },
            body: JSON.stringify({
                work_hours: workHours,
                rest_hours: restHours
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Settings saved successfully.');
                calculateTotalWorkHours();
            } else {
                showNotification(data.message || 'Failed to save settings.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An unexpected error occurred.', 'error');
        });
    });
    
    // Update total hours when inputs change
    workHoursInput.addEventListener('input', calculateTotalWorkHours);
    restHoursInput.addEventListener('input', calculateTotalWorkHours);
    
    // Load settings when page loads
    loadCompanySettings();

    // Theme switching functionality
    const themeSelect = document.getElementById('theme-type');
    const html = document.documentElement;

    // Function to set theme with animation
    function setTheme(theme, animate = true) {
        try {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const currentTheme = html.getAttribute('data-theme');
            
            let newTheme;
            if (theme === 'system') {
                newTheme = systemDark ? 'dark' : 'light';
            } else {
                newTheme = theme;
            }
            
            // Only change if theme is actually different
            if (currentTheme !== newTheme) {
                if (animate) {
                    // Add transition
                    document.body.style.transition = 'background-color 0.3s ease';
                    setTimeout(() => {
                        document.body.style.transition = '';
                    }, 300);
                }
                
                html.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', theme); // Store user preference
                
                // Apply theme immediately
                window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
            }
        } catch (e) {
            console.error('Error setting theme:', e);
            showNotification('Failed to update theme', 'error');
        }
    }

    // Function to get current theme preference
    function getCurrentTheme() {
        return localStorage.getItem('theme') || 'system';
    }

    // Initialize theme selector
    themeSelect.value = getCurrentTheme();
    setTheme(getCurrentTheme(), false);

    // Listen for theme changes
    themeSelect.addEventListener('change', (e) => {
        setTheme(e.target.value);
        showNotification('Theme updated successfully');
    });

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const currentTheme = getCurrentTheme();
        if (currentTheme === 'system') {
            setTheme('system');
        }
    });

    // Department management
    const addDepartmentBtn = document.getElementById('add-department-btn');
    const departmentModal = document.getElementById('department-modal');
    const closeDepartmentModal = document.getElementById('close-department-modal');
    const cancelDepartment = document.getElementById('cancel-department');
    const departmentForm = document.getElementById('department-form');
    const departmentId = document.getElementById('department-id');
    const departmentName = document.getElementById('department-name');
    const departmentDesc = document.getElementById('department-description');
    const departmentsContainer = document.getElementById('departments-container');
    const loadingDepartments = document.getElementById('loading-departments');
    const noDepartments = document.getElementById('no-departments');
    
    // Delete department modal elements
    const deleteDepartmentModal = document.getElementById('delete-department-modal');
    const closeDeleteDepartmentModal = document.getElementById('close-delete-department-modal');
    const cancelDeleteDepartment = document.getElementById('cancel-delete-department');
    const confirmDeleteDepartment = document.getElementById('confirm-delete-department');
    const departmentWarning = document.getElementById('department-warning');
    
    let currentDepartmentId = null;
    
    // Load departments on page load
    loadDepartments();
    
    // Add department button click - show modal
    addDepartmentBtn.addEventListener('click', function() {
        // Reset form
        departmentId.value = '';
        departmentName.value = '';
        departmentDesc.value = '';
        document.getElementById('department-modal-title').textContent = 'Add Department';
        
        // Show modal
        departmentModal.classList.remove('hidden');
        departmentName.focus();
    });
    
    // Close modal functions
    closeDepartmentModal.addEventListener('click', closeDeptModal);
    cancelDepartment.addEventListener('click', closeDeptModal);
    
    function closeDeptModal() {
        departmentModal.classList.add('hidden');
        currentDepartmentId = null;
    }
    
    // Close delete modal functions
    closeDeleteDepartmentModal.addEventListener('click', closeDeleteModal);
    cancelDeleteDepartment.addEventListener('click', closeDeleteModal);
    
    function closeDeleteModal() {
        deleteDepartmentModal.classList.add('hidden');
        currentDepartmentId = null;
    }
    
    // Save department form submission
    departmentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = departmentName.value.trim();
        const description = departmentDesc.value.trim();
        
        if (!name) {
            showNotification('Department name is required', 'error');
            departmentName.focus();
            return;
        }
        
        const isEditing = !!departmentId.value;
        
        if (isEditing) {
            // Update existing department
            updateDepartment(departmentId.value, name, description);
        } else {
            // Create new department
            createDepartment(name, description);
        }
    });
    
    // Create a new department
    function createDepartment(name, description) {
        fetch('/api/departments/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': '{{ csrf_token }}'
            },
            body: JSON.stringify({
                name: name,
                description: description
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Department created successfully');
                closeDeptModal();
                loadDepartments();
            } else {
                showNotification(data.message || 'Failed to create department', 'error');
            }
        })
        .catch(error => {
            console.error('Error creating department:', error);
            showNotification('An unexpected error occurred', 'error');
        });
    }
    
    // Update an existing department
    function updateDepartment(id, name, description) {
        fetch(`/api/departments/${id}/update/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': '{{ csrf_token }}'
            },
            body: JSON.stringify({
                name: name,
                description: description
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Department updated successfully');
                closeDeptModal();
                loadDepartments();
            } else {
                showNotification(data.message || 'Failed to update department', 'error');
            }
        })
        .catch(error => {
            console.error('Error updating department:', error);
            showNotification('An unexpected error occurred', 'error');
        });
    }
    
    // Load all departments
    function loadDepartments() {
        loadingDepartments.classList.remove('hidden');
        noDepartments.classList.add('hidden');
        
        // Clear existing departments except loading and no departments messages
        Array.from(departmentsContainer.children).forEach(child => {
            if (child.id !== 'loading-departments' && child.id !== 'no-departments') {
                departmentsContainer.removeChild(child);
            }
        });
        
        fetch('/api/departments/')
            .then(response => response.json())
            .then(data => {
                loadingDepartments.classList.add('hidden');
                
                if (data.success && data.departments && data.departments.length > 0) {
                    data.departments.forEach(dept => {
                        addDepartmentToUI(dept);
                    });
                } else {
                    noDepartments.classList.remove('hidden');
                }
            })
            .catch(error => {
                console.error('Error loading departments:', error);
                loadingDepartments.classList.add('hidden');
                noDepartments.classList.remove('hidden');
                showNotification('Failed to load departments', 'error');
            });
    }
    
    // Add a department to the UI
    function addDepartmentToUI(department) {
        const deptElement = document.createElement('div');
        deptElement.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4';
        deptElement.dataset.departmentId = department.id;
        
        deptElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-medium text-lg text-gray-800">${department.name}</h4>
                    <p class="text-gray-600 text-sm mt-1">${department.description || 'No description'}</p>
                </div>
                <div class="flex space-x-2">
                    <span class="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                        ${department.employee_count} employee${department.employee_count !== 1 ? 's' : ''}
                    </span>
                    <button class="edit-department-btn p-2 text-blue-600 hover:text-blue-800" title="Edit Department">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-department-btn p-2 text-red-600 hover:text-red-800" title="Delete Department">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        departmentsContainer.appendChild(deptElement);
        
        // Add event listeners to buttons
        deptElement.querySelector('.edit-department-btn').addEventListener('click', function() {
            editDepartment(department);
        });
        
        deptElement.querySelector('.delete-department-btn').addEventListener('click', function() {
            showDeleteConfirmation(department);
        });
    }
    
    // Edit department
    function editDepartment(department) {
        // Set form values
        departmentId.value = department.id;
        departmentName.value = department.name;
        departmentDesc.value = department.description || '';
        document.getElementById('department-modal-title').textContent = 'Edit Department';
        
        // Show modal
        departmentModal.classList.remove('hidden');
        departmentName.focus();
        
        currentDepartmentId = department.id;
    }
    
    // Show delete confirmation dialog
    function showDeleteConfirmation(department) {
        currentDepartmentId = department.id;
        
        // Check if department has employees
        if (department.employee_count > 0) {
            departmentWarning.classList.remove('hidden');
            confirmDeleteDepartment.disabled = true;
            confirmDeleteDepartment.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            departmentWarning.classList.add('hidden');
            confirmDeleteDepartment.disabled = false;
            confirmDeleteDepartment.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        deleteDepartmentModal.classList.remove('hidden');
    }
    
    // Delete department
    confirmDeleteDepartment.addEventListener('click', function() {
        if (!currentDepartmentId || this.disabled) return;
        
        fetch(`/api/departments/${currentDepartmentId}/delete/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Department deleted successfully');
                closeDeleteModal();
                loadDepartments();
            } else {
                showNotification(data.message || 'Failed to delete department', 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting department:', error);
            showNotification('An unexpected error occurred', 'error');
        });
    });
    
    // Get CSRF token from cookies
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
