document.addEventListener('DOMContentLoaded', function() {
        const dateRangePreset = document.getElementById('date-range-preset');
        const customDateFields = document.getElementById('custom-date-fields');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const exportAllEmployeesCheckbox = document.getElementById('export-all-employees');
        const selectEmployeesBtn = document.getElementById('select-employees-btn');
        const selectedEmployeesSummary = document.getElementById('selected-employees-summary');
        const selectedEmployeeIdsInput = document.getElementById('selected-employee-ids');
        const exportForm = document.getElementById('export-form');
        const previewBtn = document.getElementById('preview-btn');
        const exportBtn = document.getElementById('export-btn');
        const previewContainer = document.getElementById('preview-container');
        const closePreviewBtn = document.getElementById('close-preview');
        const previewContent = document.getElementById('preview-content');
        const exportStatus = document.getElementById('export-status');
        const employeeSelectionModal = document.getElementById('employee-selection-modal');
        const closeEmployeeModalBtn = document.getElementById('close-employee-modal');
        const employeeSearch = document.getElementById('employee-search');
        const selectAllEmployeesCheckbox = document.getElementById('select-all-employees');
        const departmentFilterSelect = document.getElementById('department-filter-select');
        const employeeList = document.getElementById('employee-list');
        const selectedCountDisplay = document.getElementById('selected-count');
        const cancelEmployeeSelectionBtn = document.getElementById('cancel-employee-selection');
        const applyEmployeeSelectionBtn = document.getElementById('apply-employee-selection');
        const recentExportsList = document.getElementById('recent-exports-list');
        
        // Set default date values (Last Week)
        setDefaultDates();
        
        // Check initial state of export all employees checkbox and show/hide buttons accordingly
        if (!exportAllEmployeesCheckbox.checked) {
            selectEmployeesBtn.classList.remove('hidden');
            if (selectedEmployeeIdsInput.value) {
                selectedEmployeesSummary.classList.remove('hidden');
                updateSelectedEmployeesSummary();
            }
        }
        
        // Initialize form elements
        loadDepartments();
        loadEmployees();
        loadRecentExports();
          // Set up event listeners for data range
        dateRangePreset.addEventListener('change', handleDateRangeChange);
        
        // Set up employee selection
        exportAllEmployeesCheckbox.addEventListener('change', function() {
            if (this.checked) {
                selectEmployeesBtn.classList.add('hidden');
                selectedEmployeesSummary.classList.add('hidden');
                selectedEmployeeIdsInput.value = '';
            } else {
                selectEmployeesBtn.classList.remove('hidden');
                if (selectedEmployeeIdsInput.value) {
                    selectedEmployeesSummary.classList.remove('hidden');
                }
            }
        });
        
        // Employee selection modal controls
        selectEmployeesBtn.addEventListener('click', openEmployeeSelectionModal);
        closeEmployeeModalBtn.addEventListener('click', closeEmployeeSelectionModal);
        cancelEmployeeSelectionBtn.addEventListener('click', closeEmployeeSelectionModal);
        applyEmployeeSelectionBtn.addEventListener('click', applyEmployeeSelection);
        
        // Employee search and filter
        employeeSearch.addEventListener('input', filterEmployeeList);
        departmentFilterSelect.addEventListener('change', filterEmployeeList);
        selectAllEmployeesCheckbox.addEventListener('change', toggleSelectAllEmployees);
          // Data preview and export
        closePreviewBtn.addEventListener('click', () => {
            previewContainer.classList.add('hidden');
        });
        
        exportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!validateEmployeeSelection()) {
                return;
            }
            handleExportSubmit(e);
        });
        
        // Validate form to ensure at least one include checkbox is checked
        document.querySelectorAll('input[name^="include_"]').forEach(checkbox => {
            checkbox.addEventListener('change', validateIncludeCheckboxes);
        });
          // Load initial data and set up the form
        function setDefaultDates() {
            const today = new Date();
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
            
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            
            startDateInput.value = formatDate(lastWeekStart);
            endDateInput.value = formatDate(lastWeekEnd);
        }
        
        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Employee selection modal functions
        let allEmployees = [];
        let selectedEmployees = new Set();
          function openEmployeeSelectionModal() {
            // Reset search and filter
            employeeSearch.value = '';
            departmentFilterSelect.value = '';
            
            // Show modal with animation
            employeeSelectionModal.classList.remove('hidden');
            employeeSelectionModal.classList.add('flex');
            employeeSelectionModal.style.opacity = '0';
            setTimeout(() => {
                employeeSelectionModal.style.opacity = '1';
                employeeSelectionModal.style.transition = 'opacity 0.3s ease-out';
            }, 10);
            
            // Initialize selected employees from the hidden input
            if (selectedEmployeeIdsInput.value && selectedEmployees.size === 0) {
                const ids = selectedEmployeeIdsInput.value.split(',').filter(id => id.trim());
                ids.forEach(id => selectedEmployees.add(parseInt(id)));
            }
            
            // Load employees if not already loaded
            if (allEmployees.length === 0) {
                loadAllEmployeesForSelection();
            } else {
                updateEmployeeSelectionList();
            }
            
            // Update select all checkbox state
            updateSelectAllCheckboxState();
        }
          function closeEmployeeSelectionModal() {
            // Hide with animation
            employeeSelectionModal.style.opacity = '0';
            setTimeout(() => {
                employeeSelectionModal.classList.add('hidden');
                employeeSelectionModal.classList.remove('flex');
                employeeSelectionModal.style.transition = '';
            }, 300);
        }
        
        function loadAllEmployeesForSelection() {
            // Show loading state
            employeeList.innerHTML = '<div class="text-center py-8 text-gray-500">Loading employees...</div>';
            
            // Fetch all employees
            fetch('/api/employees/get/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        allEmployees = data.employees;
                        
                        // Also populate departments filter
                        populateDepartmentFilter(allEmployees);
                        
                        // Display employees
                        updateEmployeeSelectionList();
                    } else {
                        employeeList.innerHTML = '<div class="text-center py-8 text-red-500">Failed to load employees</div>';
                    }
                })
                .catch(error => {
                    console.error('Error loading employees:', error);
                    employeeList.innerHTML = '<div class="text-center py-8 text-red-500">Failed to load employees</div>';
                });
        }
        
        function populateDepartmentFilter(employees) {
            // Extract unique departments
            const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
            
            // Sort departments alphabetically
            departments.sort();
            
            // Clear existing options except the first "All Departments"
            while (departmentFilterSelect.childElementCount > 1) {
                departmentFilterSelect.removeChild(departmentFilterSelect.lastChild);
            }
            
            // Add department options
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                departmentFilterSelect.appendChild(option);
            });
        }
        
        function updateEmployeeSelectionList() {
            // Get current filter values
            const searchText = employeeSearch.value.toLowerCase();
            const departmentFilter = departmentFilterSelect.value;
            
            // Filter employees based on search and department
            const filteredEmployees = allEmployees.filter(emp => {
                const matchesSearch = !searchText || emp.full_name.toLowerCase().includes(searchText) || 
                                     emp.email.toLowerCase().includes(searchText);
                const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
                return matchesSearch && matchesDepartment;
            });
            
            // Clear existing list
            employeeList.innerHTML = '';
            
            // Handle no results
            if (filteredEmployees.length === 0) {
                employeeList.innerHTML = '<div class="text-center py-8 text-gray-500">No employees match your filters</div>';
                return;
            }
            
            // Create employee items with checkboxes
            filteredEmployees.forEach(emp => {
                const item = document.createElement('div');
                item.className = 'flex items-center p-4 hover:bg-gray-50';
                
                const isSelected = selectedEmployees.has(emp.id);
                
                item.innerHTML = `
                    <input type="checkbox" data-employee-id="${emp.id}" class="employee-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded" ${isSelected ? 'checked' : ''}>
                    <div class="ml-3">
                        <div class="font-medium text-gray-800">${emp.full_name}</div>
                        <div class="text-sm text-gray-500">${emp.email}</div>
                    </div>
                    <div class="ml-auto text-sm text-gray-600">${emp.department || 'No Department'}</div>
                `;
                
                // Add event listener for checkbox
                const checkbox = item.querySelector('.employee-checkbox');
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        selectedEmployees.add(emp.id);
                    } else {
                        selectedEmployees.delete(emp.id);
                    }
                    
                    // Update selected count
                    updateSelectedCount();
                    
                    // Update select all checkbox state
                    updateSelectAllCheckboxState();
                });
                
                employeeList.appendChild(item);
            });
            
            // Update selected count
            updateSelectedCount();
        }
        
        function updateSelectedCount() {
            const count = selectedEmployees.size;
            selectedCountDisplay.textContent = `${count} employee${count !== 1 ? 's' : ''} selected`;
        }
        
        function filterEmployeeList() {
            updateEmployeeSelectionList();
        }
        
        function toggleSelectAllEmployees() {
            const selectAll = selectAllEmployeesCheckbox.checked;
            
            // Get all visible employee checkboxes
            const checkboxes = document.querySelectorAll('.employee-checkbox');
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = selectAll;
                const employeeId = parseInt(checkbox.getAttribute('data-employee-id'));
                
                if (selectAll) {
                    selectedEmployees.add(employeeId);
                } else {
                    selectedEmployees.delete(employeeId);
                }
            });
            
            // Update selected count
            updateSelectedCount();
        }
        
        function updateSelectAllCheckboxState() {
            const visibleCheckboxes = document.querySelectorAll('.employee-checkbox');
            
            if (visibleCheckboxes.length === 0) {
                selectAllEmployeesCheckbox.checked = false;
                selectAllEmployeesCheckbox.indeterminate = false;
                return;
            }
            
            const checkedCount = [...visibleCheckboxes].filter(cb => cb.checked).length;
            
            if (checkedCount === 0) {
                selectAllEmployeesCheckbox.checked = false;
                selectAllEmployeesCheckbox.indeterminate = false;
            } else if (checkedCount === visibleCheckboxes.length) {
                selectAllEmployeesCheckbox.checked = true;
                selectAllEmployeesCheckbox.indeterminate = false;
            } else {
                selectAllEmployeesCheckbox.checked = false;
                selectAllEmployeesCheckbox.indeterminate = true;
            }
        }
          function applyEmployeeSelection() {
            const selectedIds = Array.from(selectedEmployees);
            
            // Set the hidden input value
            selectedEmployeeIdsInput.value = selectedIds.join(',');
            
            // Update the summary text
            if (selectedIds.length > 0) {
                selectedEmployeesSummary.classList.remove('hidden');
                updateSelectedEmployeesSummary();
            } else {
                selectedEmployeesSummary.classList.add('hidden');
            }
            
            // Close the modal
            closeEmployeeSelectionModal();
        }
        
        function updateSelectedEmployeesSummary() {
            const selectedIds = selectedEmployeeIdsInput.value.split(',').filter(id => id.trim());
            if (selectedIds.length > 0) {
                selectedEmployeesSummary.querySelector('span').textContent = 
                    `${selectedIds.length} employee${selectedIds.length !== 1 ? 's' : ''} selected`;
            }
        }
        
        // Validation function to ensure at least one include checkbox is checked
        function validateIncludeCheckboxes() {
            const includeCheckboxes = document.querySelectorAll('input[name^="include_"]');
            const checkedCount = [...includeCheckboxes].filter(cb => cb.checked).length;
            
            // If none are checked, re-check the first one
            if (checkedCount === 0) {
                includeCheckboxes[0].checked = true;
                alert('At least one data type must be selected for export.');
            }
        }
          function handleDateRangeChange() {
            const selectedValue = dateRangePreset.value;
            
            const today = new Date();
            let startDate, endDate;
            
            // If custom range is selected, don't overwrite the existing dates
            if (selectedValue === 'custom') {
                // If the date fields are empty, set them to a default (current week)
                if (!startDateInput.value || !endDateInput.value) {
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay()); // Start of current week
                    endDate = today;
                    
                    startDateInput.value = formatDate(startDate);
                    endDateInput.value = formatDate(endDate);
                }
                return;
            }
            
            switch (selectedValue) {
                case 'this-week':
                    // Start of current week (Sunday) to today
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay());
                    endDate = today;
                    break;
                    
                case 'last-week':
                    // Last week (Sunday to Saturday)
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay() - 7);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                    break;
                    
                case 'this-month':
                    // Start of current month to today
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = today;
                    break;
                    
                case 'last-month':
                    // Last month (1st to last day)
                    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                    break;
                    
                case 'this-quarter':
                    // Start of current quarter to today
                    const currentQuarter = Math.floor(today.getMonth() / 3);
                    startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
                    endDate = today;
                    break;
                    
                case 'last-quarter':
                    // Last quarter (full)
                    const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
                    const year = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
                    const quarter = lastQuarter < 0 ? 3 : lastQuarter;
                    startDate = new Date(year, quarter * 3, 1);
                    endDate = new Date(year, (quarter + 1) * 3, 0);
                    break;
            }            
            startDateInput.value = formatDate(startDate);
            endDateInput.value = formatDate(endDate);
        }
        
        function handleFilterTypeChange() {
            const filterType = document.querySelector('input[name="filter_type"]:checked').value;
            
            departmentFilter.classList.add('hidden');
            employeeFilter.classList.add('hidden');
            
            if (filterType === 'department') {
                departmentFilter.classList.remove('hidden');
            } else if (filterType === 'employee') {
                employeeFilter.classList.remove('hidden');
            }
        }
        
        function loadDepartments() {
            fetch('/api/departments/list/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        departmentSelect.innerHTML = '<option value="">Select Department</option>';
                        data.departments.forEach(dept => {
                            const option = document.createElement('option');
                            option.value = dept.id;
                            option.textContent = dept.name;
                            departmentSelect.appendChild(option);
                        });
                    }
                })
                .catch(error => console.error('Error loading departments:', error));
        }
        
        function loadEmployees() {
            fetch('/api/employees/list/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
                        data.employees.forEach(emp => {
                            const option = document.createElement('option');
                            option.value = emp.id;
                            option.textContent = `${emp.first_name} ${emp.last_name}`;
                            employeeSelect.appendChild(option);
                        });
                    }
                })
                .catch(error => console.error('Error loading employees:', error));
        }
        
        function loadEmployeesByDepartment(departmentId) {
            if (!departmentId) {
                loadEmployees();
                return;
            }
            
            fetch(`/api/employees/by-department/${departmentId}/`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
                        data.employees.forEach(emp => {
                            const option = document.createElement('option');
                            option.value = emp.id;
                            option.textContent = `${emp.first_name} ${emp.last_name}`;
                            employeeSelect.appendChild(option);
                        });
                    }
                })
                .catch(error => console.error('Error loading department employees:', error));
        }
        
        function loadRecentExports() {
            fetch('/api/export/recent/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        recentExportsList.innerHTML = '';
                        
                        if (data.exports.length === 0) {
                            const emptyRow = document.createElement('tr');
                            emptyRow.innerHTML = `
                                <td colspan="5" class="px-6 py-4 text-sm text-gray-500 text-center">
                                    No recent exports found
                                </td>
                            `;
                            recentExportsList.appendChild(emptyRow);
                            return;
                        }
                        
                        data.exports.forEach(exp => {
                            const row = document.createElement('tr');
                            const dateObj = new Date(exp.created_at);
                            
                            row.innerHTML = `
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${dateObj.toLocaleString()}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${exp.format.toUpperCase()}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${exp.report_type}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${exp.start_date} to ${exp.end_date}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <a href="${exp.file_url}" class="text-indigo-600 hover:text-indigo-900 mr-3" download>
                                        Download
                                    </a>
                                    <button class="text-red-600 hover:text-red-900 delete-export" data-id="${exp.id}">
                                        Delete
                                    </button>
                                </td>
                            `;
                            
                            recentExportsList.appendChild(row);
                        });
                        
                        // Add event listeners for delete buttons
                        document.querySelectorAll('.delete-export').forEach(button => {
                            button.addEventListener('click', function() {
                                deleteExport(this.dataset.id);
                            });
                        });
                    }
                })
                .catch(error => console.error('Error loading recent exports:', error));
        }
          function handlePreviewData(e) {
            e.preventDefault();
            
            // Validate employee selection
            if (!exportAllEmployeesCheckbox.checked && !selectedEmployeeIdsInput.value.trim()) {
                alert('Please select at least one employee or check "Export All Employees"');
                return;
            }
            
            // Show loading state
            previewContent.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-indigo-500 text-3xl mb-4"></i>
                    <p class="text-gray-600">Loading preview data...</p>
                </div>
            `;
            previewContainer.classList.remove('hidden');
              // Collect form data
            const formData = new FormData(exportForm);
            formData.append('preview', 'true');
            
            // Add export type info
            const exportType = exportAllEmployeesCheckbox.checked ? 'all' : 'selected';
            formData.append('export_type', exportType);
            
            // If specific employees are selected, ensure their IDs are included
            if (!exportAllEmployeesCheckbox.checked && selectedEmployeeIdsInput.value) {
                formData.append('employee_ids', selectedEmployeeIdsInput.value);
            }
            
            // Use fetch to get preview data
            fetch('/api/export/preview/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        renderPreviewTable(data.data);
                    } else {
                        previewContent.innerHTML = `
                            <div class="text-center py-8">
                                <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-4"></i>
                                <p class="text-red-600">${data.message || 'Failed to generate preview.'}</p>
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('Error generating preview:', error);
                    previewContent.innerHTML = `
                        <div class="text-center py-8">
                            <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-4"></i>
                            <p class="text-red-600">An unexpected error occurred.</p>
                        </div>
                    `;
                });
        }
        
        function renderPreviewTable(data) {
            if (!data || data.length === 0) {
                previewContent.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-gray-600">No data found for the selected criteria.</p>
                    </div>
                `;
                return;
            }
            
            // Get headers from the first item
            const headers = Object.keys(data[0]);
            
            // Build table HTML
            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
            `;
            
            // Add headers
            headers.forEach(header => {
                tableHTML += `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${formatHeader(header)}</th>`;
            });
            
            tableHTML += `
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;
            
            // Add rows (limit to 10 for preview)
            const previewData = data.slice(0, 10);
            previewData.forEach(row => {
                tableHTML += `<tr>`;
                headers.forEach(header => {
                    const value = row[header] !== null ? row[header] : '—';
                    tableHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${value}</td>`;
                });
                tableHTML += `</tr>`;
            });
            
            tableHTML += `
                    </tbody>
                </table>
            `;
            
            // If we have more than 10 rows, add a note
            if (data.length > 10) {
                tableHTML += `
                    <div class="text-center py-4 text-sm text-gray-500">
                        Showing 10 of ${data.length} rows. Export to see all data.
                    </div>
                `;
            }
            
            previewContent.innerHTML = tableHTML;
        }
        
        function formatHeader(header) {
            // Convert snake_case to Title Case
            return header.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
          function handleExportSubmit(e) {
            e.preventDefault();
            
            // Validate employee selection
            if (!exportAllEmployeesCheckbox.checked && !selectedEmployeeIdsInput.value.trim()) {
                alert('Please select at least one employee or check "Export All Employees"');
                return;
            }
            
            // Validate that at least one include option is checked
            const includeCheckboxes = document.querySelectorAll('input[name^="include_"]');
            const checkedCount = [...includeCheckboxes].filter(cb => cb.checked).length;
            if (checkedCount === 0) {
                alert('Please select at least one data type to include in the export');
                return;
            }
            
            // Show loading state
            const originalBtnContent = exportBtn.innerHTML;
            exportBtn.disabled = true;
            exportBtn.querySelector('span:first-child').classList.add('hidden');
            exportBtn.querySelector('span:last-child').classList.remove('hidden');
            
            exportStatus.innerHTML = `
                <div class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg">
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                    Generating export...
                </div>
            `;
              // Collect form data
            const formData = new FormData(exportForm);
            
            // Add export type info
            const exportType = exportAllEmployeesCheckbox.checked ? 'all' : 'selected';
            formData.append('export_type', exportType);
            
            // If specific employees are selected, ensure their IDs are included
            if (!exportAllEmployeesCheckbox.checked && selectedEmployeeIdsInput.value) {
                formData.append('employee_ids', selectedEmployeeIdsInput.value);
            }
            
            // Use fetch to submit the export request
            fetch('/api/export/generate/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Show success message
                        exportStatus.innerHTML = `
                            <div class="px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                                <i class="fas fa-check-circle mr-2"></i>
                                ${data.message || 'Export generated successfully!'}
                            </div>
                        `;
                        
                        // Reload recent exports
                        loadRecentExports();
                        
                        // If file URL is provided, trigger download
                        if (data.file_url) {
                            setTimeout(() => {
                                window.location.href = data.file_url;
                            }, 500);
                        }
                    } else {
                        // Show error message
                        let errorMessage = data.message || 'Failed to generate export.';
                        if (errorMessage.includes('wkhtmltopdf')) {
                            errorMessage = 'PDF export requires wkhtmltopdf to be installed. Please select a different format or contact your administrator.';
                            // Disable PDF option
                            const pdfOption = document.getElementById('pdf-option');
                            if (pdfOption) {
                                pdfOption.disabled = true;
                                pdfOption.title = 'PDF export is currently unavailable';
                            }
                            document.getElementById('pdf-warning').classList.remove('hidden');
                        }
                        exportStatus.innerHTML = `
                            <div class="px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                                <i class="fas fa-exclamation-circle mr-2"></i>
                                ${errorMessage}
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('Error generating export:', error);
                    exportStatus.innerHTML = `
                        <div class="px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                            <i class="fas fa-exclamation-circle mr-2"></i>
                            An unexpected error occurred.
                        </div>
                    `;
                })
                .finally(() => {
                    // Reset button state
                    exportBtn.innerHTML = originalBtnContent;
                    exportBtn.disabled = false;
                    
                    // Clear status message after 5 seconds
                    setTimeout(() => {
                        exportStatus.innerHTML = '';
                    }, 5000);
                });
        }
        
        function deleteExport(exportId) {
            if (!confirm('Are you sure you want to delete this export?')) {
                return;
            }
            
            fetch(`/api/export/delete/${exportId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Reload recent exports
                        loadRecentExports();
                        
                        // Show success message
                        showNotification('Export deleted successfully.', 'success');
                    } else {
                        showNotification(data.message || 'Failed to delete export.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error deleting export:', error);
                    showNotification('An unexpected error occurred.', 'error');
                });
        }
        
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
        
        // Function to validate employee selection
    function validateEmployeeSelection() {
        if (!exportAllEmployeesCheckbox.checked && !selectedEmployeeIdsInput.value.trim()) {
            showNotification('Please select at least one employee or check "Export All Employees"', 'error');
            return false;
        }
        return true;
    }

    // Add validation before preview or export
    previewBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!validateEmployeeSelection()) {
            return;
        }
        handlePreviewData(e);
    });

    exportBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!validateEmployeeSelection()) {
            return;
        }
        handleExportSubmit(e);
    });
    });