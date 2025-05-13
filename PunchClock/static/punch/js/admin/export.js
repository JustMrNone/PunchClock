    document.addEventListener('DOMContentLoaded', function() {
        const dateRangePreset = document.getElementById('date-range-preset');
        const customDateFields = document.getElementById('custom-date-fields');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const filterTypeRadios = document.querySelectorAll('input[name="filter_type"]');
        const departmentFilter = document.getElementById('department-filter');
        const employeeFilter = document.getElementById('employee-filter');
        const exportForm = document.getElementById('export-form');
        const previewBtn = document.getElementById('preview-btn');
        const exportBtn = document.getElementById('export-btn');
        const previewContainer = document.getElementById('preview-container');
        const closePreviewBtn = document.getElementById('close-preview');
        const previewContent = document.getElementById('preview-content');
        const exportStatus = document.getElementById('export-status');
        const departmentSelect = document.getElementById('department-select');
        const employeeSelect = document.getElementById('employee-select');
        const recentExportsList = document.getElementById('recent-exports-list');
        
        // Set default date values (Last Week)
        setDefaultDates();
        
        // Initialize form elements
        loadDepartments();
        loadEmployees();
        loadRecentExports();
        
        // Set up event listeners
        dateRangePreset.addEventListener('change', handleDateRangeChange);
        
        filterTypeRadios.forEach(radio => {
            radio.addEventListener('change', handleFilterTypeChange);
        });
        
        departmentSelect.addEventListener('change', () => {
            if (document.getElementById('filter-department').checked) {
                loadEmployeesByDepartment(departmentSelect.value);
            }
        });
        
        previewBtn.addEventListener('click', handlePreviewData);
        closePreviewBtn.addEventListener('click', () => {
            previewContainer.classList.add('hidden');
        });
        
        exportForm.addEventListener('submit', handleExportSubmit);
        
        // Load initial data
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
        
        function handleDateRangeChange() {
            const selectedValue = dateRangePreset.value;
            
            if (selectedValue === 'custom') {
                customDateFields.classList.remove('hidden');
                return;
            }
            
            customDateFields.classList.add('hidden');
            
            const today = new Date();
            let startDate, endDate;
            
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
    });