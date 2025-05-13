document.addEventListener('DOMContentLoaded', function () {       
            // Function to get CSRF token
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

        // Function to load today's time entries
        function loadTodayTimeEntries() {
            fetch('/api/time/today/')
                .then(response => response.json())
                .then(data => {
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
                            
                            // Add the time entries to the table
                            data.entries.forEach(entry => {
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

                                const statusClass = entry.status === 'approved' ? 
                                    'bg-green-100 text-green-800' : 
                                    entry.status === 'rejected' ? 
                                        'bg-red-100 text-red-800' : 
                                        'bg-yellow-100 text-yellow-800';

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
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Today</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.start_time}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.end_time || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.total_hours.toFixed(2)} hours</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.timestamp || entry.created_at || 'N/A'}</td>
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
            fetch('/api/time/update-status/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    entry_id: entryId,
                    status: status
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Reload time entries to reflect changes
                    loadTodayTimeEntries();
                    
                    // Show notification
                    showNotification(`Time entry ${status} successfully!`);
                } else {
                    showNotification(`Failed to ${status} time entry: ${data.message}`, 'error');
                }
            })
            .catch(error => {
                console.error('Error updating time entry:', error);
                showNotification(`Failed to ${status} time entry. Please try again.`, 'error');
            });
        }
        
        // Function to approve all pending time entries
        function approveAllPendingEntries() {
            fetch('/api/time/approve-all/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Reload time entries to reflect changes
                    loadTodayTimeEntries();
                    
                    // Show notification
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
            confirmationDialog.style.opacity = '0';
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
        
        // Add event listener to the approve all button
        document.getElementById('approveAllBtn').addEventListener('click', function() {
            approveAllPendingEntries();
        });
        
        // Add event listener to the clear timestamps button next to Today's Time Entries
        document.getElementById('clearTimestampsBtn').addEventListener('click', function() {
            if (confirm('Are you sure you want to clear all timestamps for today? This will remove all time entries for today.')) {
                clearAllTimeEntries();
            }
        });
        
        // Add event listener to the undo clear button next to Today's Time Entries
        document.getElementById('undoClearTimestampsBtn').addEventListener('click', function() {
            undoClearTimeEntries();
        });
        
        // Function to clear all time entries
        function clearAllTimeEntries() {
            fetch('/api/time/clear/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
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
            fetch('/api/time/undo-clear/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
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
        
        // Load time entries when the document is ready
        document.addEventListener('DOMContentLoaded', function() {
            loadTodayTimeEntries();
            loadEmployeeStats();
            
            // Set up employee search functionality
            setupEmployeeSearch();
            
            // Set up auto-refresh every minute
            setInterval(function() {
                loadTodayTimeEntries();
                loadEmployeeStats();
            }, 60000);
        });
        
        // Setup search functionality for employees
        function setupEmployeeSearch() {
            const searchInput = document.getElementById('employee-search');
            let allEntries = []; // Store all time entries
            let allEmployees = []; // Store all employees for checking existence
            
            // Load all employees for reference
            fetch('/api/employees/get/')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.employees) {
                        allEmployees = data.employees;
                    }
                })
                .catch(error => {
                    console.error('Error loading employees for search:', error);
                });
                
            // Load initial entries
            fetch('/api/time/today/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        allEntries = data.entries;
                    }
                });
            
            // Add search input event handler
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                
                if (!searchTerm) {
                    // If search is cleared, just reload all entries
                    loadTodayTimeEntries();
                    return;
                }
                
                // Get the time entries table and message row
                const tableBody = document.getElementById('timeEntryTable');
                const noEntriesRow = document.getElementById('noEntriesRow');
                
                // Clear existing rows except the noEntriesRow
                Array.from(tableBody.children).forEach(child => {
                    if (child.id !== 'noEntriesRow') {
                        tableBody.removeChild(child);
                    }
                });
                
                // Filter entries by employee name that exactly matches the search term
                // or has the search term as a complete word within the name
                const matchedEntries = allEntries.filter(entry => {
                    // Check for exact match of full name (case insensitive)
                    if (entry.employee_name.toLowerCase() === searchTerm) {
                        return true;
                    }
                    
                    // Check if it's a complete word in the name
                    const nameWords = entry.employee_name.toLowerCase().split(' ');
                    return nameWords.includes(searchTerm);
                });
                
                // Find if there's an employee match in the full employee list
                const matchedEmployee = allEmployees.find(emp => {
                    // Check for exact match of full name (case insensitive)
                    if (emp.full_name.toLowerCase() === searchTerm) {
                        return true;
                    }
                    
                    // Check if it's a complete word/name in the employee name
                    const nameWords = emp.full_name.toLowerCase().split(' ');
                    return nameWords.includes(searchTerm);
                });
                
                // Display entries or appropriate message
                if (matchedEntries.length > 0) {
                    // We found matching entries
                    noEntriesRow.style.display = 'none';
                    
                    // Add the time entries to the table
                    displayTimeEntries(matchedEntries);
                } else if (matchedEmployee) {
                    // Employee exists but no time entries today
                    noEntriesRow.style.display = '';
                    noEntriesRow.querySelector('td').innerHTML = 
                        `<div class="flex items-center justify-center py-3">
                            <div class="mr-2 text-yellow-500"><i class="fas fa-exclamation-circle"></i></div>
                            <span>${matchedEmployee.full_name} has not submitted any time entries today.</span>
                        </div>`;
                } else {
                    // Check if the search term is potentially a partial match
                    const potentialMatches = allEmployees.filter(emp => 
                        emp.full_name.toLowerCase().includes(searchTerm)
                    );
                    
                    if (potentialMatches.length > 0) {
                        // There are partial matches, suggest them
                        noEntriesRow.style.display = '';
                        const matchList = potentialMatches.map(emp => 
                            `<span class="font-medium cursor-pointer hover:text-indigo-600" onclick="document.getElementById('employee-search').value='${emp.full_name}'; document.getElementById('employee-search').dispatchEvent(new Event('input'));">${emp.full_name}</span>`
                        ).join(', ');
                        
                        noEntriesRow.querySelector('td').innerHTML = 
                            `<div class="flex flex-col items-center justify-center py-3">
                                <div class="flex items-center mb-2">
                                    <div class="mr-2 text-blue-500"><i class="fas fa-info-circle"></i></div>
                                    <span>No exact match found. Did you mean:</span>
                                </div>
                                <div>${matchList}</div>
                            </div>`;
                    } else {
                        // No match at all
                        noEntriesRow.style.display = '';
                        noEntriesRow.querySelector('td').innerHTML = 
                            `<div class="flex items-center justify-center py-3">
                                <div class="mr-2 text-red-500"><i class="fas fa-times-circle"></i></div>
                                <span>"${searchTerm}" is not a registered employee.</span>
                            </div>`;
                    }
                }
            });
            
            // Handle search on Enter key
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const searchTerm = this.value.toLowerCase().trim();
                    
                    // Refresh all entries first to get the latest data
                    fetch('/api/time/today/')
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                allEntries = data.entries;
                                
                                // Trigger search again with refreshed data
                                this.dispatchEvent(new Event('input'));
                            }
                        });
                }
            });
        }
        
        // Function to display time entries in the table
        function displayTimeEntries(entries) {
            const tableBody = document.getElementById('timeEntryTable');
            
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

                const statusClass = entry.status === 'approved' ? 
                    'bg-green-100 text-green-800' : 
                    entry.status === 'rejected' ? 
                        'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800';

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
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Today</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.start_time}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.end_time || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.total_hours.toFixed(2)} hours</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.timestamp || entry.created_at || 'N/A'}</td>
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
        
        // Function to load employee statistics
        function loadEmployeeStats() {
            // First try to get data from the stats endpoint
            fetch('/api/employees/stats/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update total employees count from API stats
                        document.getElementById('totalEmployees').textContent = data.stats.total_employees;
                        
                        // Update active employees count
                        document.getElementById('activeEmployees').textContent = data.stats.active_employees;
                        
                        // Update pending approval count
                        const pendingCountElement = document.querySelector('.text-yellow-600');
                        if (pendingCountElement) {
                            pendingCountElement.textContent = data.stats.pending_approval;
                        }
                        
                        // Update average hours
                        const avgHoursElement = document.querySelector('.text-blue-600');
                        if (avgHoursElement) {
                            avgHoursElement.textContent = data.stats.avg_hours;
                        }
                    } else {
                        // If stats endpoint fails, fetch employees directly
                        fetchEmployeeCount();
                    }
                })
                .catch(error => {
                    console.error('Error loading employee statistics:', error);
                    // Fallback to direct employee count if stats API fails
                    fetchEmployeeCount();
                });
        }
        
        // Fallback function to fetch employee count directly
        function fetchEmployeeCount() {
            fetch('/api/employees/get/')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.employees) {
                        // Set the actual count of employees from the API response
                        document.getElementById('totalEmployees').textContent = data.employees.length;
                        
                        // After getting total employees, fetch active employees
                        fetchActiveEmployees();
                    } else {
                        console.error('Failed to load employees');
                    }
                })
                .catch(error => {
                    console.error('Error fetching employees:', error);
                });
        }
        
        // Function to fetch active employees (those with approval activity in the last 24 hours)
        function fetchActiveEmployees() {
            fetch('/api/time/active-employees/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update active employees count
                        document.getElementById('activeEmployees').textContent = data.active_count;
                    } else {
                        console.error('Failed to load active employees');
                    }
                })
                .catch(error => {
                    console.error('Error fetching active employees:', error);
                });
        }
        
});// Function to get initials from a name
