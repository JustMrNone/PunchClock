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
    const deletePreviewImage = document.getElementById('delete-preview-image');
    const deleteStatus = document.getElementById('delete-status');
    const deleteModalContent = document.getElementById('delete-modal-content');
    const deleteBtnText = document.getElementById('delete-btn-text');
    const deleteBtnLoading = document.getElementById('delete-btn-loading');
    
    // Company logo functionality
    const uploadLogoBtn = document.getElementById('upload-logo-btn');
    const logoInput = document.getElementById('company-logo-input');
    const logoPlaceholder = document.getElementById('company-logo-placeholder');
    const logoImage = document.getElementById('company-logo-image');
    const removeLogoBtn = document.getElementById('remove-logo-btn');
    const logoCropModal = document.getElementById('logo-crop-modal');
    const logoCropContainer = document.getElementById('logo-crop-container');
    const closeLogoCropModalBtn = document.getElementById('close-logo-crop-modal-btn');
    const cancelLogoCropBtn = document.getElementById('cancel-logo-crop-btn');
    const applyLogoCropBtn = document.getElementById('apply-logo-crop-btn');
    
    // Logo delete confirmation modal elements
    const logoDeleteModal = document.getElementById('logo-delete-modal');
    const closeLogoDeleteModalBtn = document.getElementById('close-logo-delete-modal-btn');
    const cancelLogoDeleteBtn = document.getElementById('cancel-logo-delete-btn');
    const confirmLogoDeleteBtn = document.getElementById('confirm-logo-delete-btn');
    const logoDeletePreviewImage = document.getElementById('logo-delete-preview-image');
    const logoDeleteStatus = document.getElementById('logo-delete-status');
    const logoDeleteModalContent = document.getElementById('logo-delete-modal-content');
    const logoDeleteBtnText = document.getElementById('logo-delete-btn-text');
    const logoDeleteBtnLoading = document.getElementById('logo-delete-btn-loading');
    
    let cropper;
    let logoCropper;
    let currentImageUrl = null;
    let currentLogoUrl = null;

    // Handle user initial generation
    function getInitials() {
        const userInitialsElement = document.getElementById('user-initials');
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
    if (userInitials) {
        userInitials.textContent = getInitials();
    }

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
        deletePreviewImage.src = profileImage.src;
        deleteModal.classList.remove('hidden');
        deleteModalContent.classList.remove('scale-95', 'opacity-0');
        deleteModalContent.classList.add('scale-100', 'opacity-100');
    });
    
    // Close delete confirmation modal
    closeDeleteModalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // First animate the content out
        deleteModalContent.classList.remove('scale-100', 'opacity-100');
        deleteModalContent.classList.add('scale-95', 'opacity-0');
        
        // Wait for animation to complete before hiding the modal
        setTimeout(() => {
            deleteModal.classList.add('hidden');
            // Reset any error messages
            deleteStatus.classList.add('hidden');
            deleteStatus.textContent = '';
        }, 200); // 200ms matches the transition duration in the CSS
    });
    
    cancelDeleteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // First animate the content out
        deleteModalContent.classList.remove('scale-100', 'opacity-100');
        deleteModalContent.classList.add('scale-95', 'opacity-0');
        
        // Wait for animation to complete before hiding the modal
        setTimeout(() => {
            deleteModal.classList.add('hidden');
            // Reset any error messages
            deleteStatus.classList.add('hidden');
            deleteStatus.textContent = '';
        }, 200); // 200ms matches the transition duration in the CSS
    });
    
    // Also handle clicking outside the modal to close it
    deleteModal.addEventListener('click', function(e) {
        if (e.target === deleteModal) {
            // First animate the content out
            deleteModalContent.classList.remove('scale-100', 'opacity-100');
            deleteModalContent.classList.add('scale-95', 'opacity-0');
            
            // Wait for animation to complete before hiding the modal
            setTimeout(() => {
                deleteModal.classList.add('hidden');
                // Reset any error messages
                deleteStatus.classList.add('hidden');
                deleteStatus.textContent = '';
            }, 200); // 200ms matches the transition duration in the CSS
        }
    });
    
    // Handle confirm delete button
    confirmDeleteBtn.addEventListener('click', function() {
        // Show loading notification
        deleteBtnText.classList.add('hidden');
        deleteBtnLoading.classList.remove('hidden');
        
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
                // Close the modal after successful deletion
                deleteModal.classList.add('hidden');
                deleteModalContent.classList.remove('scale-100', 'opacity-100');
                deleteModalContent.classList.add('scale-95', 'opacity-0');
                
                // Update UI
                userInitials.classList.remove('hidden');
                profileImage.classList.add('hidden');
                profileImage.src = '';
                removeBtn.classList.add('hidden');
                currentImageUrl = null;
                
                showNotification('Profile picture removed successfully.');
            } else {
                deleteStatus.classList.remove('hidden');
                deleteStatus.textContent = data.message || 'Failed to remove profile picture.';
                deleteStatus.classList.add('bg-red-100', 'text-red-800');
            }
        })
        .catch(error => {
            console.error('Error removing profile picture:', error);
            deleteStatus.classList.remove('hidden');
            deleteStatus.textContent = 'An error occurred while removing the profile picture.';
            deleteStatus.classList.add('bg-red-100', 'text-red-800');
        })
        .finally(() => {
            deleteBtnText.classList.remove('hidden');
            deleteBtnLoading.classList.add('hidden');
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
    
    // Create FormData for the request
    const formData = new FormData();
    formData.append('image_data', imageData);
    
    // Send request to server
    fetch('/api/profile-picture/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server responded with status: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Profile picture uploaded successfully!', 'success');
            
            // Make sure remove button is visible
            const removeProfilePictureButton = document.getElementById('removeProfilePicture');
            if (removeProfilePictureButton) {
                removeProfilePictureButton.classList.remove('hidden');
            }
        } else {
            showNotification(data.message || 'Failed to upload profile picture', 'error');
        }
    })
    .catch(error => {
        console.error('Error uploading profile picture:', error);
        showNotification('An error occurred while uploading the profile picture', 'error');
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
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-medium text-lg text-gray-800">${department.name}</h4>
                    <p class="text-gray-600 text-sm mt-1">${department.description || 'No description'}</p>
                </div>
                <div class="flex items-center space-x-2">
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
    
    // Employee Profile Picture Management
    const employeeDepartmentFilter = document.getElementById('employee-department-filter');
    const employeeSelectFilter = document.getElementById('employee-select-filter');
    const employeeProfileSection = document.getElementById('employee-profile-section');
    const employeeNameDisplay = document.getElementById('employee-name-display');
    const employeePicContainer = document.getElementById('employee-pic-container');
    const employeeInitials = document.getElementById('employee-initials'); // Define the missing variable
    const employeeProfileImage = document.getElementById('employee-profile-image'); // Define the missing variable
    const employeePicInput = document.getElementById('employee-pic-input');
    const uploadEmployeePicBtn = document.getElementById('upload-employee-pic-btn');
    const removeEmployeePicBtn = document.getElementById('remove-employee-pic-btn');
    
    // Employee crop modal elements
    const employeeCropModal = document.getElementById('employee-crop-modal');
    const employeeCropContainer = document.getElementById('employee-crop-container');
    const closeEmployeeCropModalBtn = document.getElementById('close-employee-crop-modal-btn');
    const cancelEmployeeCropBtn = document.getElementById('cancel-employee-crop-btn');
    const applyEmployeeCropBtn = document.getElementById('apply-employee-crop-btn');
    
    // Employee delete modal elements
    const employeeDeleteModal = document.getElementById('employee-delete-modal');
    const closeEmployeeDeleteModalBtn = document.getElementById('close-employee-delete-modal-btn');
    const cancelEmployeeDeleteBtn = document.getElementById('cancel-employee-delete-btn');
    const confirmEmployeeDeleteBtn = document.getElementById('confirm-employee-delete-btn');
    const employeeDeletePreviewImage = document.getElementById('employee-delete-preview-image');
    const employeeDeleteStatus = document.getElementById('employee-delete-status');
    const employeeDeleteBtnText = document.getElementById('employee-delete-btn-text');
    const employeeDeleteBtnLoading = document.getElementById('employee-delete-btn-loading');
    
    let employeeCropper;
    let currentEmployeeId = null;
    let currentEmployeeName = '';
    
    // Load departments for filter dropdown
    function loadDepartmentsForFilter() {
        fetch('/api/departments/')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.departments) {
                    // Clear existing options except the first one
                    employeeDepartmentFilter.innerHTML = '<option value="">-- Select Department --</option>';
                    
                    // Add department options
                    data.departments.forEach(dept => {
                        if (dept.employee_count > 0) {  // Only show departments with employees
                            const option = document.createElement('option');
                            option.value = dept.id;
                            option.textContent = dept.name;
                            employeeDepartmentFilter.appendChild(option);
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Error loading departments:', error);
                showNotification('Failed to load departments for filtering.', 'error');
            });
    }
    
    // Handle department selection change
    employeeDepartmentFilter.addEventListener('change', function() {
        const departmentId = this.value;
        
        // Reset and disable employee select
        employeeSelectFilter.innerHTML = '<option value="">-- Select Employee --</option>';
        employeeSelectFilter.disabled = !departmentId;
        
        // Hide employee profile section
        employeeProfileSection.classList.add('hidden');
        
        if (departmentId) {
            // Load employees for the selected department
            fetch(`/api/departments/${departmentId}/employees/`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.employees) {
                        // Add employee options
                        data.employees.forEach(employee => {
                            const option = document.createElement('option');
                            option.value = employee.id;
                            option.textContent = employee.name;
                            employeeSelectFilter.appendChild(option);
                        });
                        
                        if (data.employees.length === 0) {
                            const option = document.createElement('option');
                            option.value = "";
                            option.textContent = "No employees in this department";
                            employeeSelectFilter.appendChild(option);
                        }
                    } else {
                        showNotification('Failed to load employees.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error loading employees:', error);
                    showNotification('Failed to load employees. Please try again.', 'error');
                });
        }
    });
    
    // Handle employee selection change
    employeeSelectFilter.addEventListener('change', function() {
        const employeeId = this.value;
        
        if (!employeeId) {
            employeeProfileSection.classList.add('hidden');
            return;
        }
        
        currentEmployeeId = employeeId;
        currentEmployeeName = employeeSelectFilter.options[employeeSelectFilter.selectedIndex].text;
        
        // Set employee name display
        employeeNameDisplay.textContent = currentEmployeeName;
        
        // Show employee profile section
        employeeProfileSection.classList.remove('hidden');
        
        // Get employee initials
        const nameParts = currentEmployeeName.split(' ');
        let initials = '';
        if (nameParts.length >= 2) {
            initials = (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
        } else if (nameParts.length === 1) {
            initials = nameParts[0].charAt(0).toUpperCase();
        } else {
            initials = '??';
        }
        
        employeeInitials.textContent = initials;
        
        // Fetch employee's profile picture
        fetchEmployeeProfilePicture(employeeId);
    });
    
    // Fetch employee profile picture
    function fetchEmployeeProfilePicture(employeeId) {
        fetch(`/api/employees/${employeeId}/profile-picture/`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.has_image) {
                    // Show profile image
                    employeeInitials.classList.add('hidden');
                    employeeProfileImage.classList.remove('hidden');
                    employeeProfileImage.src = data.image_url;
                    removeEmployeePicBtn.classList.remove('hidden');
                } else {
                    // Show initials
                    employeeInitials.classList.remove('hidden');
                    employeeProfileImage.classList.add('hidden');
                    employeeProfileImage.src = '';
                    removeEmployeePicBtn.classList.add('hidden');
                }
            })
            .catch(error => {
                console.error('Error fetching employee profile picture:', error);
                // Show initials on error
                employeeInitials.classList.remove('hidden');
                employeeProfileImage.classList.add('hidden');
                employeeProfileImage.src = '';
                removeEmployeePicBtn.classList.add('hidden');
            });
    }
    
    // Trigger file input when upload button is clicked
    uploadEmployeePicBtn.addEventListener('click', function() {
        employeePicInput.click();
    });
    
    // Handle file selection for employee
    employeePicInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                employeeCropContainer.innerHTML = `<img id="employee-crop-image" src="${e.target.result}" class="max-w-full">`;
                const cropImage = document.getElementById('employee-crop-image');
                
                employeeCropModal.classList.remove('hidden');
                
                // Initialize cropper after image is loaded
                cropImage.onload = function() {
                    employeeCropper = new Cropper(cropImage, {
                        aspectRatio: 1,
                        viewMode: 2,
                        ready: function() {
                            // Set initial crop box size to be square
                            const containerData = employeeCropper.getContainerData();
                            const minSize = Math.min(containerData.width, containerData.height);
                            employeeCropper.setCropBoxData({
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
    
    // Close employee crop modal
    closeEmployeeCropModalBtn.addEventListener('click', closeEmployeeCropModal);
    cancelEmployeeCropBtn.addEventListener('click', closeEmployeeCropModal);
    
    function closeEmployeeCropModal() {
        employeeCropModal.classList.add('hidden');
        if (employeeCropper) {
            employeeCropper.destroy();
            employeeCropper = null;
        }
        employeePicInput.value = ''; // Reset file input
    }
    
    // Apply employee crop
    applyEmployeeCropBtn.addEventListener('click', function() {
        if (employeeCropper) {
            const croppedCanvas = employeeCropper.getCroppedCanvas({
                width: 256,
                height: 256,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            const croppedImage = croppedCanvas.toDataURL('image/png');
            
            // Update UI first for better user experience
            employeeInitials.classList.add('hidden');
            employeeProfileImage.classList.remove('hidden');
            employeeProfileImage.src = croppedImage;
            removeEmployeePicBtn.classList.remove('hidden');
            
            // Close modal
            closeEmployeeCropModal();
            
            // Upload to server
            uploadEmployeeProfilePicture(croppedImage);
        }
    });
      // Upload employee profile picture to server
    function uploadEmployeeProfilePicture(imageData) {
        if (!currentEmployeeId) {
            showNotification('No employee selected', 'error');
            return;
        }
        
        // Show loading notification
        showNotification('Uploading employee profile picture...', 'info');
        
        // Create form data for the upload
        const formData = new FormData();
        formData.append('employee_id', currentEmployeeId);
        formData.append('image_data', imageData);
        
        // Send to server using FormData (which sets the correct Content-Type automatically)
        fetch('/api/employee-profile-picture/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                employeeProfileImage.src = data.image_url; // Use the server URL
                showNotification('Employee profile picture uploaded successfully.');
            } else {
                showNotification(data.message || 'Failed to upload employee profile picture.', 'error');
            }
        })
        .catch(error => {
            console.error('Error uploading employee profile picture:', error);
            showNotification('An error occurred while uploading the employee profile picture.', 'error');
        });
    }
    
    // Handle remove employee picture button click
    removeEmployeePicBtn.addEventListener('click', function() {
        if (!currentEmployeeId) return;
        
        employeeDeletePreviewImage.src = employeeProfileImage.src;
        employeeDeleteModal.classList.remove('hidden');
    });
    
    // Close employee delete modal
    closeEmployeeDeleteModalBtn.addEventListener('click', closeEmployeeDeleteModal);
    cancelEmployeeDeleteBtn.addEventListener('click', closeEmployeeDeleteModal);
    
    function closeEmployeeDeleteModal() {
        employeeDeleteModal.classList.add('hidden');
        employeeDeleteStatus.classList.add('hidden');
        employeeDeleteStatus.textContent = '';
    }
    
    // Confirm employee picture delete
    confirmEmployeeDeleteBtn.addEventListener('click', function() {
        if (!currentEmployeeId) return;
        
        // Show loading
        employeeDeleteBtnText.classList.add('hidden');
        employeeDeleteBtnLoading.classList.remove('hidden');
        
        // Call server to delete the employee's profile picture
        fetch(`/api/employees/${currentEmployeeId}/profile-picture/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal
                closeEmployeeDeleteModal();
                
                // Update UI
                employeeInitials.classList.remove('hidden');
                employeeProfileImage.classList.add('hidden');
                employeeProfileImage.src = '';
                removeEmployeePicBtn.classList.add('hidden');
                
                showNotification('Employee profile picture removed successfully.');
            } else {
                employeeDeleteStatus.classList.remove('hidden');
                employeeDeleteStatus.textContent = data.message || 'Failed to remove employee profile picture.';
                employeeDeleteStatus.classList.add('bg-red-100', 'text-red-800', 'p-3', 'rounded-md');
            }
        })
        .catch(error => {
            console.error('Error removing employee profile picture:', error);
            employeeDeleteStatus.classList.remove('hidden');
            employeeDeleteStatus.textContent = 'An error occurred while removing the employee profile picture.';
            employeeDeleteStatus.classList.add('bg-red-100', 'text-red-800', 'p-3', 'rounded-md');
        })
        .finally(() => {
            employeeDeleteBtnText.classList.remove('hidden');
            employeeDeleteBtnLoading.classList.add('hidden');
        });
    });
    
    // Load departments for filter on page load
    loadDepartmentsForFilter();
    
    // --- Company Logo Functionality ---
    
    // Fetch existing company logo from server
    fetchCompanyLogo();
    
    // Function to fetch company logo
    function fetchCompanyLogo() {
        fetch('/api/company-logo/')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.has_logo) {
                    // Show logo image
                    logoPlaceholder.classList.add('hidden');
                    logoImage.classList.remove('hidden');
                    logoImage.src = data.logo_url + '?t=' + new Date().getTime(); // Prevent caching
                    removeLogoBtn.classList.remove('hidden');
                    currentLogoUrl = data.logo_url;
                } else {
                    // Show placeholder
                    logoPlaceholder.classList.remove('hidden');
                    logoImage.classList.add('hidden');
                    logoImage.src = '';
                    removeLogoBtn.classList.add('hidden');
                    currentLogoUrl = null;
                }
            })
            .catch(error => {
                console.error('Error fetching company logo:', error);
                // Show placeholder on error
                logoPlaceholder.classList.remove('hidden');
                logoImage.classList.add('hidden');
                logoImage.src = '';
                removeLogoBtn.classList.add('hidden');
            });
    }
    
    // Trigger file input when upload button is clicked
    uploadLogoBtn.addEventListener('click', function() {
        logoInput.click();
    });
    
    // Handle logo file selection
    logoInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                logoCropContainer.innerHTML = `<img id="logo-crop-image" src="${e.target.result}" class="max-w-full">`;                const logoCropImage = document.getElementById('logo-crop-image');
                
                // Show the crop modal
                logoCropModal.classList.remove('hidden');
                
                // Initialize cropper after image is loaded
                logoCropImage.onload = function() {
                    logoCropper = new Cropper(logoCropImage, {
                        // No fixed aspect ratio for logo
                        aspectRatio: NaN,
                        viewMode: 2,
                        ready: function() {
                            // Set initial crop box size
                            const containerData = logoCropper.getContainerData();
                            const minSize = Math.min(containerData.width, containerData.height);
                            logoCropper.setCropBoxData({
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
      // Close logo crop modal
    closeLogoCropModalBtn.addEventListener('click', closeLogoCropModal);
    cancelLogoCropBtn.addEventListener('click', closeLogoCropModal);
    
    function closeLogoCropModal() {
        logoCropModal.classList.add('hidden');
        if (logoCropper) {
            logoCropper.destroy();
            logoCropper = null;
        }
        logoInput.value = ''; // Reset file input
    }
    
    // Apply logo crop
    applyLogoCropBtn.addEventListener('click', function() {
        if (logoCropper) {
            const croppedCanvas = logoCropper.getCroppedCanvas({
                minWidth: 256,
                minHeight: 256,
                maxWidth: 1024,
                maxHeight: 1024,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            const croppedImage = croppedCanvas.toDataURL('image/png');
            
            // Update UI first for better user experience
            logoPlaceholder.classList.add('hidden');
            logoImage.classList.remove('hidden');
            logoImage.src = croppedImage;
            removeLogoBtn.classList.remove('hidden');
            
            // Close modal
            closeLogoCropModal();
            
            // Upload to server
            uploadCompanyLogo(croppedImage);
        }
    });    // Upload company logo to server
    function uploadCompanyLogo(imageData) {
        // Show loading notification
        showNotification('Uploading company logo...', 'info');
        
        // Create form data for the upload
        const formData = new FormData();
        formData.append('image_data', imageData);
        
        fetch('/api/company-logo/upload/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
                // Important: Do not set Content-Type header for FormData
                // The browser will set it automatically with the proper boundary
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Company logo uploaded successfully.');
                currentLogoUrl = data.logo_url;
            } else {
                showNotification(data.message || 'Failed to upload company logo.', 'error');
                // Revert UI if upload failed
                fetchCompanyLogo();
            }
        })
        .catch(error => {
            console.error('Error uploading company logo:', error);
            showNotification('An error occurred while uploading the company logo.', 'error');            // Revert UI if upload failed
            fetchCompanyLogo();
        });
    }
      // Handle remove logo button click
    removeLogoBtn.addEventListener('click', function() {
        logoDeletePreviewImage.src = logoImage.src;
        logoDeleteModal.classList.remove('hidden');
        logoDeleteModalContent.classList.remove('scale-95', 'opacity-0');
        logoDeleteModalContent.classList.add('scale-100', 'opacity-100');
    });
    
    // Close logo delete modal
    closeLogoDeleteModalBtn.addEventListener('click', closeLogoDeleteModal);
    cancelLogoDeleteBtn.addEventListener('click', closeLogoDeleteModal);
    
    function closeLogoDeleteModal() {
        // First animate the content out
        logoDeleteModalContent.classList.remove('scale-100', 'opacity-100');
        logoDeleteModalContent.classList.add('scale-95', 'opacity-0');
        
        // Wait for animation to complete before hiding the modal
        setTimeout(() => {
            logoDeleteModal.classList.add('hidden');
            // Reset any error messages
            logoDeleteStatus.classList.add('hidden');
            logoDeleteStatus.textContent = '';
        }, 200); // 200ms matches the transition duration in the CSS
    }
    
    // Confirm logo delete
    confirmLogoDeleteBtn.addEventListener('click', function() {
        // Show loading
        logoDeleteBtnText.classList.add('hidden');
        logoDeleteBtnLoading.classList.remove('hidden');
        
        // Call server to delete the company logo
        fetch('/api/company-logo/delete/', {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal
                closeLogoDeleteModal();
                
                // Update UI
                logoPlaceholder.classList.remove('hidden');
                logoImage.classList.add('hidden');
                logoImage.src = '';
                removeLogoBtn.classList.add('hidden');
                
                showNotification('Company logo removed successfully.');
                currentLogoUrl = null;
            } else {
                logoDeleteStatus.classList.remove('hidden');
                logoDeleteStatus.textContent = data.message || 'Failed to remove company logo.';
                logoDeleteStatus.classList.add('bg-red-100', 'text-red-800', 'p-3', 'rounded-md');
            }
        })
        .catch(error => {
            console.error('Error removing company logo:', error);
            logoDeleteStatus.classList.remove('hidden');
            logoDeleteStatus.textContent = 'An error occurred while removing the company logo.';
            logoDeleteStatus.classList.add('bg-red-100', 'text-red-800', 'p-3', 'rounded-md');
        })
        .finally(() => {
            logoDeleteBtnText.classList.remove('hidden');
            logoDeleteBtnLoading.classList.add('hidden');
        });
    });
});