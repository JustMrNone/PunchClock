document.addEventListener('DOMContentLoaded', function () {        
    // Function to get CSRF token from the data attribute
    function getCsrfToken() {
        const dashboardData = document.getElementById('dashboard-data');
        return dashboardData ? dashboardData.dataset.csrfToken : '';
    }
    
    // Export Format Dialog Elements
    const exportFormatDialog = document.getElementById('exportFormatDialog');
    const exportCancelBtn = document.getElementById('exportCancelBtn');
    const exportFormatBtns = document.querySelectorAll('.export-format-btn');
    const exportStatusEl = document.getElementById('exportStatus');

    // Function to show export format dialog
    function showExportDialog() {
        exportFormatDialog.classList.remove('hidden');
        exportFormatDialog.classList.add('flex');
        exportStatusEl.innerHTML = ''; // Clear any previous status messages
    }

    // Set up click handlers for export format buttons and cancel
    exportFormatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const format = this.dataset.format;
            generateExport(format);
        });
    });

    exportCancelBtn.addEventListener('click', function() {
        exportFormatDialog.classList.add('hidden');
        exportFormatDialog.classList.remove('flex');
        exportStatusEl.innerHTML = '';
    });

    // Function to close export format dialog if clicked outside
    exportFormatDialog.addEventListener('click', function(e) {
        if (e.target === this) {
            exportFormatDialog.classList.add('hidden');
            exportFormatDialog.classList.remove('flex');
            exportStatusEl.innerHTML = '';
        }
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
        formData.append('export_all_employees', 'on');

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
        // Clear any existing refresh timer
        if (window.timeEntriesRefreshTimer) {
            clearTimeout(window.timeEntriesRefreshTimer);
            window.timeEntriesRefreshTimer = null;
        }

        // Clear any existing error retry timer
        if (window.timeEntriesErrorRetryTimer) {
            clearTimeout(window.timeEntriesErrorRetryTimer);
            window.timeEntriesErrorRetryTimer = null;
        }

        // Store previous entries in case of error
        const tableBody = document.getElementById('timeEntryTable');
        const previousEntries = tableBody.innerHTML;
        const noEntriesRow = document.getElementById('noEntriesRow');

        // Add a loading class if not already present
        if (!tableBody.classList.contains('loading')) {
            tableBody.classList.add('loading');
        }

        fetch('/api/time/today/')
            .then(response => {
                console.log('Time entries response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                  // Get content type to check if it's JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.warn('Response is not JSON, content-type:', contentType);
                    // If we get HTML instead of JSON (like a login page), it's an error
                    if (contentType && contentType.includes('text/html')) {
                        throw new Error('Received HTML instead of JSON - you may need to log in');
                    }
                }
                
                // Always try to parse as JSON regardless of content-type header
                // This handles cases where server returns JSON with incorrect content-type
                return response.text().then(text => {
                    try {
                        // Try to parse as JSON first
                        if (text.trim()) {
                            return JSON.parse(text);
                        } else {
                            console.warn('Empty response from server, treating as empty array');
                            return []; // Return empty array for empty responses
                        }
                    } catch(e) {
                        console.error('Error parsing JSON response:', e);
                        console.log('Response text:', text.substring(0, 200) + '...'); // Show first 200 chars
                        throw new Error('Invalid JSON response from server');
                    }
                });
            })
            .then(data => {                // Enhanced debug logging
                console.log('Today time entries raw response:', data);

                // Try to find entries array in common places
                let entries = null;
                if (Array.isArray(data)) {
                    entries = data;
                } else if (data && Array.isArray(data.entries)) {
                    entries = data.entries;
                } else if (data && Array.isArray(data.results)) {
                    entries = data.results;
                } else if (data && typeof data === 'object') {
                    // Try to extract any array from the response
                    const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
                    if (possibleArrays.length > 0) {
                        // Use the first array found in the response
                        entries = possibleArrays[0];
                        console.log('Found entries array in response:', entries);
                    } else {
                        // If we can't find an array but got a valid object, create empty array
                        // This prevents errors when the response is valid but doesn't match expected format
                        console.log('No entry arrays found in response, using empty array');
                        entries = [];
                    }
                }

                // Fallback: treat as success for ANY valid response
                // This prevents errors when the server returns valid data but not in the expected format
                const isSuccess = true; // Always treat valid responses as success
                
                // Make sure entries is at least an empty array
                entries = Array.isArray(entries) ? entries : [];
                
                // Clear existing rows except the noEntriesRow
                Array.from(tableBody.children).forEach(child => {
                    if (child.id !== 'noEntriesRow') {
                        tableBody.removeChild(child);
                    }
                });
                
                // Show or hide the "no entries" message
                if (!entries || entries.length === 0) {
                    noEntriesRow.style.display = '';
                } else {
                    noEntriesRow.style.display = 'none';
                    displayTimeEntries(entries);
                }
                
                // Update pending count
                updatePendingCount(entries || []);
                
                // Schedule next refresh in 60 seconds only on success
                window.timeEntriesRefreshTimer = setTimeout(loadTodayTimeEntries, 60000);
            })            .catch(error => {
                console.error('Error loading time entries:', error);

                // Check if the error is caused by unexpected but valid JSON structure
                // If so, we can treat it as a valid response with empty entries
                if (error.message && error.message.includes('Unexpected response structure')) {
                    console.log('Treating unexpected structure as valid empty response');
                    
                    // Use empty entries array but don't show error
                    Array.from(tableBody.children).forEach(child => {
                        if (child.id !== 'noEntriesRow') {
                            tableBody.removeChild(child);
                        }
                    });
                    
                    noEntriesRow.style.display = '';
                    updatePendingCount([]);
                    
                    // Still schedule next refresh but with normal interval
                    window.timeEntriesRefreshTimer = setTimeout(loadTodayTimeEntries, 60000);
                    return; // Exit early without showing error
                }
                
                // For real errors, restore previous entries
                if (previousEntries) {
                    tableBody.innerHTML = previousEntries;
                }

                // Show error notification only if not already shown recently
                // Increase to 60 seconds to reduce notification frequency
                const now = Date.now();
                if (!window.lastErrorNotification || (now - window.lastErrorNotification) > 60000) {
                    let errorMessage = 'Failed to refresh time entries. Will try again shortly.';
                    
                    // Add more descriptive messages for common errors
                    if (error.message && (error.message.includes('HTML instead of JSON') || 
                        error.message.includes('login'))) {
                        errorMessage = 'Authentication required. Please ensure you are logged in.';
                    }
                    
                    window.lastErrorNotification = now;
                }

                // Set up error retry timer (increased to 30 seconds to reduce retry frequency)
                window.timeEntriesErrorRetryTimer = setTimeout(loadTodayTimeEntries, 30000);
            })
            .finally(() => {
                tableBody.classList.remove('loading');
            });
    }
      // Update the pending count in the stats and notification badge
    function updatePendingCount(entries) {
        const pendingCount = entries.filter(entry => entry.status === 'pending').length;
        
        // Update stats card
        const pendingCountElement = document.querySelector('.text-yellow-600');
        if (pendingCountElement) {
            pendingCountElement.textContent = pendingCount;
        }
        
        // Update notification badge
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            if (pendingCount > 0) {
                notificationBadge.textContent = pendingCount;
                notificationBadge.classList.remove('hidden');
            } else {
                notificationBadge.classList.add('hidden');
            }
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
                // Update UI instead of reloading all entries
                updateEntryInTable(entryId, status);
                
                // Update pending count in the stats
                updatePendingCountAdjust(status === 'approved' || status === 'rejected' ? -1 : 0);
                
                showNotification(`Time entry ${status} successfully!`);
            } else {
                showNotification(`Failed to ${status} time entry: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error updating time entry:', error);
        });
    }    // Function to approve all pending time entries
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
                // Update all pending entries in the UI
                updateAllPendingEntries('approved');
                
                // Update the pending count
                updatePendingCountReset(0);
                
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
                </td>                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex items-center justify-between">
                        <div>
                            ${entry.status === 'pending' ?
                                `<a href="#" class="approve-btn text-indigo-600 hover:text-indigo-900 mr-3" data-entry-id="${entry.id}">Approve</a>
                                <a href="#" class="reject-btn text-red-600 hover:text-red-900" data-entry-id="${entry.id}">Reject</a>` :
                                `<span class="text-gray-400">Already ${entry.status}</span>`
                            }
                        </div>
                        <a href="#" class="delete-btn text-red-500 hover:text-red-700 hover:bg-red-50 ml-4 p-2 rounded-full transition-colors duration-200" data-entry-id="${entry.id}" title="Delete entry">
                            <i class="fas fa-trash"></i>
                        </a>
                    </div>
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
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                showConfirmDialog(
                    'Delete Time Entry',
                    'Are you sure you want to delete this time entry? This action cannot be undone.',
                    () => deleteTimeEntry(this.dataset.entryId)
                );
            });
        });
    }    // Function to update a specific entry in the table
    function updateEntryInTable(entryId, newStatus) {
        const row = document.querySelector(`tr[data-entry-id="${entryId}"]`);
        if (!row) return; // Entry not found in table
        
        // Update status badge
        const statusBadge = row.querySelector('td:nth-child(8) span');
        if (statusBadge) {
            // Remove previous status classes
            statusBadge.classList.remove('bg-yellow-100', 'text-yellow-800', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
            
            // Add new status classes
            if (newStatus === 'approved') {
                statusBadge.classList.add('bg-green-100', 'text-green-800');
                statusBadge.textContent = 'Approved';
            } else if (newStatus === 'rejected') {
                statusBadge.classList.add('bg-red-100', 'text-red-800');
                statusBadge.textContent = 'Rejected';
            }
        }
        
        // Update action buttons
        const actionsCell = row.querySelector('td:last-child div.flex');
        if (actionsCell) {
            // Create action buttons container
            const actionButtonsHtml = `
                <div>
                    ${newStatus === 'pending' ?
                        `<a href="#" class="approve-btn text-indigo-600 hover:text-indigo-900 mr-3" data-entry-id="${entryId}">Approve</a>
                        <a href="#" class="reject-btn text-red-600 hover:text-red-900" data-entry-id="${entryId}">Reject</a>` :
                        `<span class="text-gray-400">Already ${newStatus}</span>`
                    }
                </div>
                <a href="#" class="delete-btn text-red-500 hover:text-red-700 hover:bg-red-50 ml-4 p-2 rounded-full transition-colors duration-200" data-entry-id="${entryId}" title="Delete entry">
                    <i class="fas fa-trash"></i>
                </a>
            `;
            actionsCell.innerHTML = actionButtonsHtml;

            // Reattach event listeners if the entry is still pending
            if (newStatus === 'pending') {
                const approveBtn = actionsCell.querySelector('.approve-btn');
                const rejectBtn = actionsCell.querySelector('.reject-btn');
                if (approveBtn) {
                    approveBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        approveTimeEntry(entryId);
                    });
                }
                if (rejectBtn) {
                    rejectBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        rejectTimeEntry(entryId);
                    });
                }
            }

            // Reattach delete button event listener
            const deleteBtn = actionsCell.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    showConfirmDialog(
                        'Delete Time Entry',
                        'Are you sure you want to delete this time entry? This action cannot be undone.',
                        () => deleteTimeEntry(this.dataset.entryId)
                    );
                });
            }
        }
    }
    
    // Function to update all pending entries in the table
    function updateAllPendingEntries(newStatus) {
        const pendingRows = document.querySelectorAll('tr[data-entry-id]');
        let updatedCount = 0;
        
        pendingRows.forEach(row => {
            const statusBadge = row.querySelector('td:nth-child(8) span');
            if (statusBadge && statusBadge.textContent.trim().toLowerCase() === 'pending') {
                const entryId = row.dataset.entryId;
                updateEntryInTable(entryId, newStatus);
                updatedCount++;
            }
        });
        
        return updatedCount;
    }
      // Function to adjust pending count by a delta
    function updatePendingCountAdjust(delta) {
        // Update stats card
        const pendingCountElement = document.querySelector('.text-yellow-600');
        let newCount = 0;
        if (pendingCountElement) {
            const currentCount = parseInt(pendingCountElement.textContent) || 0;
            newCount = Math.max(0, currentCount + delta);
            pendingCountElement.textContent = newCount;
        }
        
        // Update notification badge
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            if (newCount > 0) {
                notificationBadge.textContent = newCount;
                notificationBadge.classList.remove('hidden');
            } else {
                notificationBadge.classList.add('hidden');
            }
        }
    }
      // Function to set pending count directly
    function updatePendingCountReset(newCount) {
        // Update stats card
        const pendingCountElement = document.querySelector('.text-yellow-600');
        if (pendingCountElement) {
            pendingCountElement.textContent = newCount;
        }
        
        // Update notification badge
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            if (newCount > 0) {
                notificationBadge.textContent = newCount;
                notificationBadge.classList.remove('hidden');
            } else {
                notificationBadge.classList.add('hidden');
            }
        }
    }
    
    // Add styles for loading state
    const style = document.createElement('style');
    style.textContent = `
        #timeEntryTable.loading {
            position: relative;
            opacity: 0.7;
            transition: opacity 0.3s;
        }
        #timeEntryTable.loading::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Font Awesome 5 Free';
            font-weight: 900;
            font-size: 24px;
            color: #4f46e5;
        }
    `;
    document.head.appendChild(style);

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

    // Initialize everything
    loadDashboardStats();
    loadTodayTimeEntries();

    // Set up click handlers for buttons
    const exportBtn = document.getElementById('exportWeekBtn');
    const approveAllBtn = document.getElementById('approveAllBtn');

    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            showExportDialog();
        });
    }

    if (approveAllBtn) {
        approveAllBtn.addEventListener('click', approveAllPendingEntries);
    }

    // Initialize dashboard stats auto-refresh
    setInterval(loadDashboardStats, 60000); // Refresh stats every minute
});
