// Department modal elements and variables
let deleteDepartmentModal;
let closeDeleteDepartmentModal;
let cancelDeleteDepartment;
let confirmDeleteDepartment;
let departmentWarning;

// Employee modal elements and variables  
let deleteEmployeeModal;
let closeDeleteEmployeeModal;
let cancelDeleteEmployee;
let confirmDeleteEmployee;

let departmentToDeleteId = null;
let employeeToDeleteId = null;
let cropper;
let croppedImageData = null;

// Initialize all DOM elements when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Department modal elements
    deleteDepartmentModal = document.getElementById('add-page-delete-department-modal');
    closeDeleteDepartmentModal = document.getElementById('add-page-close-delete-department-modal');
    cancelDeleteDepartment = document.getElementById('add-page-cancel-delete-department');
    confirmDeleteDepartment = document.getElementById('add-page-confirm-delete-department');
    departmentWarning = document.getElementById('add-page-department-warning');
    
    // Employee modal elements
    deleteEmployeeModal = document.getElementById('add-page-delete-employee-modal');
    closeDeleteEmployeeModal = document.getElementById('add-page-close-delete-employee-modal');
    cancelDeleteEmployee = document.getElementById('add-page-cancel-delete-employee');
    confirmDeleteEmployee = document.getElementById('add-page-confirm-delete-employee');
    
    // Close department modal functions
    closeDeleteDepartmentModal.addEventListener('click', closeDepartmentModal);
    cancelDeleteDepartment.addEventListener('click', closeDepartmentModal);
    
    // Close employee modal functions
    closeDeleteEmployeeModal.addEventListener('click', closeEmployeeModal);
    cancelDeleteEmployee.addEventListener('click', closeEmployeeModal);

    // Add department form submission
    document.getElementById('add-department-form').addEventListener('submit', handleAddDepartment);

    // Remove department form submission
    document.getElementById('remove-department-form').addEventListener('submit', handleRemoveDepartment);
    
    // Department delete confirmation
    confirmDeleteDepartment.addEventListener('click', handleDeleteDepartment);
    
    // Handle department selection for employee removal
    document.getElementById('department-select').addEventListener('change', handleDepartmentSelection);
    
    // Enable/disable delete button based on employee selection
    document.getElementById('employee-select').addEventListener('change', handleEmployeeSelection);
    
    // Handle employee deletion button click
    document.getElementById('delete-employee-btn').addEventListener('click', handleDeleteEmployeeClick);
    
    // Handle employee delete confirmation
    confirmDeleteEmployee.addEventListener('click', handleDeleteEmployeeConfirm);

    // Ensure the department toast close button is properly attached
    const deptToastCloseBtn = document.querySelector('#dept-toast button');
    if (deptToastCloseBtn) {
        deptToastCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideDeptToast();
        });
    }

    // Initialize profile picture functionality
    initializeProfilePicture();
    
    // Load departments when the page loads
    loadDepartments();
});

// Toast functions
function showToast(message, isSuccess = true) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
    toast.classList.add(isSuccess ? 'bg-green-100' : 'bg-red-100');
    toast.classList.add(isSuccess ? 'text-green-800' : 'text-red-800');
    toast.classList.add('border', isSuccess ? 'border-green-200' : 'border-red-200');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}

function showDeptToast(message, isSuccess = true) {
    const toast = document.getElementById('dept-toast');
    const toastMessage = document.getElementById('dept-toast-message');
    
    // Clear any existing timers
    if (window.deptToastTimer) {
        clearTimeout(window.deptToastTimer);
    }
    
    // Reset classes and show toast
    toast.classList.remove('hidden');
    toast.classList.remove('bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
    
    // Apply appropriate styling
    if (isSuccess) {
        toast.classList.add('bg-green-100', 'text-green-800');
    } else {
        toast.classList.add('bg-red-100', 'text-red-800');
    }
    
    toastMessage.textContent = message;
    
    // Only auto-hide success messages
    if (isSuccess) {
        window.deptToastTimer = setTimeout(hideDeptToast, 3000);
    }
}

function hideDeptToast() {
    const toast = document.getElementById('dept-toast');
    if (toast) {
        // Add fade-out animation
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.style.opacity = '1';
            // Clear any existing timers
            if (window.deptToastTimer) {
                clearTimeout(window.deptToastTimer);
                window.deptToastTimer = null;
            }
        }, 200);
    }
}

// Modal functions
function closeDepartmentModal() {
    deleteDepartmentModal.classList.add('hidden');
    departmentToDeleteId = null;
}

function closeEmployeeModal() {
    deleteEmployeeModal.classList.add('hidden');
    employeeToDeleteId = null;
}

// Department functions
function loadDepartments() {
    fetch('/api/departments/')
        .then(response => response.json())
        .then(data => {
            // Check if we have departments data in the expected format
            const departments = data.departments || [];
            
            // Populate all department dropdowns
            const dropdowns = [
                document.getElementById('employee-department'),
                document.getElementById('remove-department-select'),
                document.getElementById('department-select')
            ];
            
            dropdowns.forEach(dropdown => {
                if (dropdown) {
                    // Clear existing options except the first one
                    dropdown.innerHTML = '<option value="">-- Select Department --</option>';
                    
                    // Add department options
                    departments.forEach(dept => {
                        const option = document.createElement('option');
                        option.value = dept.id; // Use the department ID as value
                        option.textContent = dept.name;
                        dropdown.appendChild(option);
                    });
                }
            });
            
            // Update department list
            updateDepartmentList(departments);
        })
        .catch(error => {
            console.error('Error loading departments:', error);
            showDeptToast('Failed to load departments. Please try again.', false);
        });
}

function updateDepartmentList(departments) {
    const departmentList = document.getElementById('department-list');
    if (departmentList) {
        departmentList.innerHTML = '';
        
        if (departments.length === 0) {
            departmentList.innerHTML = '<div class="p-4 text-center text-gray-500">No departments found</div>';
            return;
        }
        
        departments.forEach(dept => {
            const deptItem = document.createElement('div');
            deptItem.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center';
            deptItem.innerHTML = `
                <div>
                    <h5 class="font-medium text-gray-800">${dept.name}</h5>
                    <p class="text-sm text-gray-500">${dept.employee_count || 0} employees</p>
                </div>
                <button onclick="showDepartmentDeleteConfirmation(${dept.id})" class="text-red-600 hover:text-red-800 focus:outline-none">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            departmentList.appendChild(deptItem);
        });
    }
}

function showDepartmentDeleteConfirmation(deptId) {
    departmentToDeleteId = deptId;
    
    // Get department details for better messaging
    fetch(`/api/departments/${deptId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.department) {
                const dept = data.department;
                
                // Check if department has employees
                if (dept.employee_count > 0) {
                    const warningEl = document.getElementById('add-page-department-warning');
                    if (warningEl) {
                        warningEl.classList.remove('hidden');
                    }
                    confirmDeleteDepartment.disabled = true;
                    confirmDeleteDepartment.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    const warningEl = document.getElementById('add-page-department-warning');
                    if (warningEl) {
                        warningEl.classList.add('hidden');
                    }
                    confirmDeleteDepartment.disabled = false;
                    confirmDeleteDepartment.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        })
        .catch(error => {
            console.error('Error fetching department details:', error);
        });
    
    // Show the modal
    deleteDepartmentModal.classList.remove('hidden');
}

// Make function available globally for HTML onclick
window.showDepartmentDeleteConfirmation = showDepartmentDeleteConfirmation;

async function handleAddDepartment(e) {
    e.preventDefault();
    
    const departmentName = document.getElementById('add-department-name').value.trim();
    const departmentDescription = document.getElementById('add-department-description').value.trim();
    
    if (!departmentName) {
        showDeptToast('Department name is required', false);
        const input = document.getElementById('add-department-name');
        input.classList.add('border-red-500', 'bg-red-50');
        input.focus();
        return;
    }
    
    try {
        const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
        const response = await fetch('/api/departments/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                name: departmentName,
                description: departmentDescription
            }),
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to create department');
        }
        
        if (data.success) {
            showDeptToast('Department added successfully', true);
            
            // Clear form
            document.getElementById('add-department-name').value = '';
            document.getElementById('add-department-description').value = '';
            
            // Clear any error styling
            document.getElementById('add-department-name').classList.remove('border-red-500', 'bg-red-50');
            
            // Reload departments list
            loadDepartments();
        } else {
            throw new Error(data.message || 'Failed to create department');
        }
    } catch (error) {
        console.error('Error creating department:', error);
        showDeptToast(error.message || 'An error occurred while creating the department', false);
    }
}

function handleRemoveDepartment(e) {
    e.preventDefault();
    
    const departmentId = document.getElementById('remove-department-select').value;
    
    if (!departmentId) {
        showDeptToast('Please select a department to remove', false);
        return;
    }
    
    departmentToDeleteId = departmentId;
    deleteDepartmentModal.classList.remove('hidden');
}

function handleDeleteDepartment() {
    if (!departmentToDeleteId) return;
    
    fetch(`/api/departments/${departmentToDeleteId}/delete/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showDeptToast('Department removed successfully', true);
            loadDepartments();
        } else {
            showDeptToast(data.message || 'Failed to remove department', false);
        }
        closeDepartmentModal();
    })
    .catch(error => {
        console.error('Error removing department:', error);
        showDeptToast('An error occurred while removing the department', false);
        closeDepartmentModal();
    });
}

// Employee functions
function handleDepartmentSelection() {
    const departmentId = this.value;
    const employeeSelect = document.getElementById('employee-select');
    const deleteButton = document.getElementById('delete-employee-btn');
    
    // Reset employee dropdown
    employeeSelect.innerHTML = '<option value="">-- Select Employee --</option>';
    employeeSelect.disabled = !departmentId;
    deleteButton.disabled = true;
    
    if (departmentId) {
        // Load employees for the selected department
        fetch(`/api/departments/${departmentId}/employees/`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.employees) {
                    data.employees.forEach(employee => {
                        const option = document.createElement('option');
                        option.value = employee.id;
                        option.textContent = employee.name;
                        employeeSelect.appendChild(option);
                    });
                    
                    if (data.employees.length === 0) {
                        const option = document.createElement('option');
                        option.value = "";
                        option.textContent = "No employees in this department";
                        employeeSelect.appendChild(option);
                    }
                } else {
                    showToast('Failed to load employees.', false);
                }
            })
            .catch(error => {
                console.error('Error loading employees:', error);
                showToast('Failed to load employees. Please try again.', false);
            });
    }
}

function handleEmployeeSelection() {
    const deleteButton = document.getElementById('delete-employee-btn');
    deleteButton.disabled = !this.value;
}

function handleDeleteEmployeeClick() {
    const employeeId = document.getElementById('employee-select').value;
    
    if (!employeeId) return;
    
    employeeToDeleteId = employeeId;
    deleteEmployeeModal.classList.remove('hidden');
}

function handleDeleteEmployeeConfirm() {
    if (!employeeToDeleteId) return;
    
    fetch(`/api/employees/${employeeToDeleteId}/delete/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value,
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete employee');
        }
        return response.json();
    })
    .then(data => {
        showToast('Employee deleted successfully', true);
        
        // Reset selection
        document.getElementById('employee-select').innerHTML = '<option value="">-- Select Employee --</option>';
        document.getElementById('employee-select').disabled = true;
        document.getElementById('delete-employee-btn').disabled = true;
        
        // Refresh employee list
        const departmentId = document.getElementById('department-select').value;
        if (departmentId) {
            // Trigger the change event to reload employees
            document.getElementById('department-select').dispatchEvent(new Event('change'));
        }
        closeEmployeeModal();
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Failed to delete employee. Please try again.', false);
        closeEmployeeModal();
    });
}

// Profile picture functionality
function initializeProfilePicture() {
    // Profile picture elements with unique add-page prefix
    const uploadBtn = document.getElementById('add-page-upload-pic-btn');
    const fileInput = document.getElementById('add-page-profile-pic-input');
    const userInitials = document.getElementById('add-page-user-initials');
    const profileImage = document.getElementById('add-page-profile-image');
    const cropModal = document.getElementById('add-page-crop-modal');
    const cropContainer = document.getElementById('add-page-crop-container');
    const closeCropModalBtn = document.getElementById('add-page-close-crop-modal-btn');
    const cancelCropBtn = document.getElementById('add-page-cancel-crop-btn');
    const applyCropBtn = document.getElementById('add-page-apply-crop-btn');

    // Trigger file input when upload button is clicked
    uploadBtn.addEventListener('click', function() {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                cropContainer.innerHTML = `<img id="add-page-crop-image" src="${e.target.result}" class="max-w-full">`;
                const cropImage = document.getElementById('add-page-crop-image');
                
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
        fileInput.value = ''; // Reset file input
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
            
            croppedImageData = croppedCanvas.toDataURL('image/png');
            
            // Update UI
            userInitials.classList.add('hidden');
            profileImage.classList.remove('hidden');
            profileImage.src = croppedImageData;
            
            // Close modal
            closeCropModal();
        }
    });

    // Update the form submission to include profile picture
    const addEmployeeForm = document.getElementById('add-employee-form');
    addEmployeeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        
        // Add the cropped image data if it exists
        if (croppedImageData) {
            formData.append('profile_picture', croppedImageData);
        }
        
        try {
            const response = await fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Employee created successfully', true);
                // Reset form and profile picture
                this.reset();
                userInitials.classList.remove('hidden');
                profileImage.classList.add('hidden');
                profileImage.src = '';
                croppedImageData = null;
                // Reload departments if needed
                loadDepartments();
            } else {
                showToast(data.error || 'Failed to create employee', false);
            }
        } catch (error) {
            console.error('Error creating employee:', error);
            showToast('An error occurred while creating the employee', false);
        }
    });
}
