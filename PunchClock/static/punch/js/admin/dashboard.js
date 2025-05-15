document.addEventListener('DOMContentLoaded', function () {        
    // Function to get CSRF token from the data attribute
    function getCsrfToken() {
        const dashboardData = document.getElementById('dashboard-data');
        return dashboardData ? dashboardData.dataset.csrfToken : '';
    }
      // Export Format Dialog Elements
    const exportBtn = document.getElementById('exportWeekBtn');
    const exportFormatDialog = document.getElementById('exportFormatDialog');
    const exportCancelBtn = document.getElementById('exportCancelBtn');
    const exportFormatBtns = document.querySelectorAll('.export-format-btn');
    const exportStatusEl = document.getElementById('exportStatus');// Set up event listeners for export dialog
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportFormatDialog.classList.remove('hidden');
            exportStatusEl.innerHTML = '';
        });
    }
    
    if (exportCancelBtn) {
        exportCancelBtn.addEventListener('click', function() {
            exportFormatDialog.classList.add('hidden');
        });
    }
    
    // Add click event to each format button
    exportFormatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const format = this.getAttribute('data-format');
            generateExport(format);
        });
    });
    
    // Function to generate export for the last week
    function generateExport(format) {
        // Show loading state
        exportStatusEl.innerHTML = `
            <div class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Generating ${format.toUpperCase()} export...
            </div>
        `;
        
        // Calculate last week's date range
        const today = new Date();
        const endDate = new Date(today);
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 7); // Get date from 7 days ago
        
        // Format dates as YYYY-MM-DD
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };
        
        // Prepare form data for the export request
        const formData = new FormData();
        formData.append('format', format);
        formData.append('start_date', formatDate(startDate));
        formData.append('end_date', formatDate(endDate));
        formData.append('group_by', 'employee');
        formData.append('filter_type', 'all');
        formData.append('include_hours', 'on');
        formData.append('include_productivity', 'on');
        formData.append('include_attendance', 'on');
        
        // Send request to generate export
        fetch('/api/export/generate/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                exportStatusEl.innerHTML = `
                    <div class="px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                        <i class="fas fa-check-circle mr-2"></i>
                        Export generated successfully!
                    </div>
                `;
                
                // Trigger download
                if (data.file_url) {
                    setTimeout(() => {
                        window.location.href = data.file_url;
                        
                        // Close the dialog after successful download
                        setTimeout(() => {
                            exportFormatDialog.classList.add('hidden');
                        }, 1500);
                    }, 500);
                }
            } else {
                // Show error message
                let errorMessage = data.message || 'Failed to generate export.';
                if (errorMessage.includes('wkhtmltopdf')) {
                    errorMessage = 'PDF export requires wkhtmltopdf to be installed. Please select a different format.';
                }
                
                exportStatusEl.innerHTML = `
                    <div class="px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        ${errorMessage}
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error generating export:', error);
            exportStatusEl.innerHTML = `
                <div class="px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    An unexpected error occurred.
                </div>
            `;
        });
    }

    // Function to load today's time entries
    function loadTodayTimeEntries() {
        fetch('/api/time/today/')
            .then(response => response.json())
            .then(data => {
                // Add debug logging
                console.log('Today time entries:', data);

                if (data.success) {
                    const tableBody = document.getElementById('timeEntryTable');
                    const noEntriesRow = document.getElementById('noEntriesRow');
                    
                    // Clear existing rows except the noEntriesRow
                    Array.from(tableBody.children).forEach(child => {
                        if (child.id !== 'noEntriesRow') {
                            tableBody.removeChild(child);
                        }
                    });
                    
                    // Show or hide the "no entries" message
                    if (data.entries.length === 0) {
                        noEntriesRow.style.display = '';
                    } else {
                        noEntriesRow.style.display = 'none';
                        displayTimeEntries(data.entries);
                    }
                    
                    // Update pending count
                    updatePendingCount(data.entries);
                }
            })
            .catch(error => {
                console.error('Error loading time entries:', error);
            });
    }
    
    // Update the pending count in the stats
    function updatePendingCount(entries) {
        const pendingCount = entries.filter(entry => entry.status === 'pending').length;
        const pendingCountElement = document.querySelector('.text-yellow-600');
        if (pendingCountElement) {
            pendingCountElement.textContent = pendingCount;
        }
    }
    
    // Function to approve a time entry
    function approveTimeEntry(entryId) {
        updateTimeEntryStatus(entryId, 'approved');
    }
    
    // Function to reject a time entry
    function rejectTimeEntry(entryId) {
        updateTimeEntryStatus(entryId, 'rejected');
    }
    
    // Function to update a time entry status
    function updateTimeEntryStatus(entryId, status) {
        const csrfToken = getCsrfToken();
        fetch('/api/time/update-status/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                entry_id: entryId,
                status: status
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadTodayTimeEntries();
                showNotification(`Time entry ${status} successfully!`);
            } else {
                showNotification(`Failed to ${status} time entry: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error updating time entry:', error);
        });
    }

    // Function to approve all pending time entries
    function approveAllPendingEntries() {
        const csrfToken = getCsrfToken();
        fetch('/api/time/approve-all/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadTodayTimeEntries();
                showNotification(`Approved ${data.count} time entries successfully!`);
            } else {
                showNotification(`Failed to approve time entries: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error approving all entries:', error);
            showNotification('Failed to approve time entries. Please try again.', 'error');
        });
    }
    
    // Function to clear all time entries
    function clearAllTimeEntries() {
        const csrfToken = getCsrfToken();
        fetch('/api/time/clear/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reload time entries to reflect changes
                loadTodayTimeEntries();
                
                // Show notification
                showNotification(`Cleared ${data.count} time entries successfully!`);
                
                // Show the undo button
                document.getElementById('undoClearTimestampsBtn').style.display = 'flex';
                
                // Hide undo button after 30 minutes
                setTimeout(() => {
                    document.getElementById('undoClearTimestampsBtn').style.display = 'none';
                }, 30 * 60 * 1000);
            } else {
                showNotification(`Failed to clear time entries: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error clearing time entries:', error);
            showNotification('Failed to clear time entries. Please try again.', 'error');
        });
    }
    
    // Function to undo clear time entries
    function undoClearTimeEntries() {
        const csrfToken = getCsrfToken();
        fetch('/api/time/undo-clear/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reload time entries to reflect changes
                loadTodayTimeEntries();
                
                // Show notification
                showNotification(`Restored ${data.count} time entries successfully!`);
                
                // Hide the undo button
                document.getElementById('undoClearTimestampsBtn').style.display = 'none';
            } else {
                showNotification(`Failed to restore time entries: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error restoring time entries:', error);
            showNotification('Failed to restore time entries. Please try again.', 'error');
        });
    }

    // Function to show notification
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white transition-all duration-300 transform translate-y-0 z-50`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateY(150%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add this helper function before displayTimeEntries
    function getEntryTypeBadgeClass(entryType) {
        switch ((entryType || '').toLowerCase()) {
            case 'regular work hours':
                return 'bg-blue-100 text-blue-800';
            case 'overtime':
                return 'bg-purple-100 text-purple-800';
            case 'meeting':
                return 'bg-green-100 text-green-800';
            case 'training':
                return 'bg-yellow-100 text-yellow-800';
            case 'other':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-blue-100 text-blue-800';
        }
    }

    // Function to display time entries in the table
    function displayTimeEntries(entries) {
        const tableBody = document.getElementById('timeEntryTable');
        tableBody.innerHTML = '';
        entries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            tr.dataset.entryId = entry.id;

            // Generate initials from name
            const nameParts = entry.employee_name.split(' ');
            const initials = nameParts.map(part => part[0]).join('').toUpperCase();

            // Generate random color for the avatar
            const colors = ['indigo', 'purple', 'blue', 'green', 'red', 'yellow'];
            const colorIndex = Math.floor(Math.random() * colors.length);
            const color = colors[colorIndex];

            const statusClass = entry.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            entry.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800';

            // Entry type badge
            const entryType = entry.entry_type || 'Regular Work Hours';
            const entryTypeClass = getEntryTypeBadgeClass(entryType);
            const entryTypeBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${entryTypeClass}">${entryType}</span>`;

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600 font-bold">${initials}</div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${entry.employee_name}</div>
                            <div class="text-sm text-gray-500">${entry.department || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.start_time}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.end_time || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${parseFloat(entry.total_hours).toFixed(2)} hours</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.timestamp || entry.created_at || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${entryTypeBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${entry.status === 'pending' ?
                        `<a href="#" class="approve-btn text-indigo-600 hover:text-indigo-900 mr-3" data-entry-id="${entry.id}">Approve</a>
                        <a href="#" class="reject-btn text-red-600 hover:text-red-900" data-entry-id="${entry.id}">Reject</a>` :
                        `<span class="text-gray-400">Already ${entry.status}</span>`
                    }
                </td>
            `;
            tableBody.appendChild(tr);
        });
        
        // Add event listeners to approve/reject buttons
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                approveTimeEntry(this.dataset.entryId);
            });
        });
        
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                rejectTimeEntry(this.dataset.entryId);
            });
        });
    }

    // Add event listener to the clear timestamps button
    const clearTimestampsBtn = document.getElementById('clearTimestampsBtn');
    if (clearTimestampsBtn) {
        clearTimestampsBtn.addEventListener('click', function() {
            showConfirmDialog(
                'Clear Time Entries',
                'Are you sure you want to clear all timestamps for today? This will remove all time entries for today.',
                clearAllTimeEntries
            );
        });
    }

    // Add event listener to the undo clear button
    const undoClearTimestampsBtn = document.getElementById('undoClearTimestampsBtn');
    if (undoClearTimestampsBtn) {
        undoClearTimestampsBtn.addEventListener('click', undoClearTimeEntries);
    }

    // Custom confirmation dialog functions
    const confirmationDialog = document.getElementById('confirmationDialog');
    const dialogTitle = document.getElementById('dialogTitle');
    const dialogMessage = document.getElementById('dialogMessage');
    const dialogConfirmBtn = document.getElementById('dialogConfirmBtn');
    const dialogCancelBtn = document.getElementById('dialogCancelBtn');
    
    // Function to show custom confirmation dialog
    function showConfirmDialog(title, message, onConfirm) {
        // Set dialog content
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        
        // Show dialog with fade-in animation
        confirmationDialog.classList.remove('hidden');
        setTimeout(() => {
            confirmationDialog.style.opacity = '1';
        }, 10);
        
        // Set up confirm button action
        dialogConfirmBtn.onclick = () => {
            hideConfirmDialog();
            onConfirm();
        };
        
        // Set up cancel button action
        dialogCancelBtn.onclick = hideConfirmDialog;
        
        // Allow clicking outside to cancel
        confirmationDialog.onclick = (e) => {
            if (e.target === confirmationDialog) {
                hideConfirmDialog();
            }
        };
        
        // Add escape key to cancel
        document.addEventListener('keydown', handleEscapeKey);
    }
    
    // Function to hide confirmation dialog
    function hideConfirmDialog() {
        confirmationDialog.style.opacity = '0';
        setTimeout(() => {
            confirmationDialog.classList.add('hidden');
        }, 300);
        
        // Remove event listener
        document.removeEventListener('keydown', handleEscapeKey);
    }
    
    // Handle escape key press
    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            hideConfirmDialog();
        }
    }

    // Function to load dashboard statistics
    function loadDashboardStats() {
        fetch('/api/dashboard/stats/')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update total employees count (admin + employees)
                    const totalEmployeesElement = document.getElementById('totalEmployees');
                    if (totalEmployeesElement) {
                        totalEmployeesElement.textContent = data.total_employees;
                    }
                    
                    // Update active employees count
                    const activeEmployeesElement = document.getElementById('activeEmployees');
                    if (activeEmployeesElement) {
                        activeEmployeesElement.textContent = data.active_today;
                    }
                    
                    // Update average hours if available
                    const avgHoursElement = document.querySelector('.text-blue-600');
                    if (avgHoursElement && data.avg_hours) {
                        avgHoursElement.textContent = data.avg_hours;
                    }
                }
            })
            .catch(error => {
                console.error('Error loading dashboard stats:', error);
            });
    }

    // Load time entries when the page loads
    loadTodayTimeEntries();
    
    // Load dashboard statistics
    loadDashboardStats();

    // Add event listener for approve all button
    const approveAllBtn = document.getElementById('approveAllBtn');
    if (approveAllBtn) {
        approveAllBtn.addEventListener('click', approveAllPendingEntries);
    }

    // Set up auto-refresh
    setInterval(loadTodayTimeEntries, 60000); // Refresh every minute
    setInterval(loadDashboardStats, 60000); // Refresh stats every minute
});
