document.addEventListener('DOMContentLoaded', function () {        function getInitials(name) {
            // Check for invalid names
            if (!name || name === "Choose Employee" || name === "Select an employee" || name === "Loading...") {
                return "--";
            }
            
            // Split name and filter out empty parts
            const parts = name.trim().split(' ').filter(part => part.length > 0);
            if (parts.length === 0) {
                return "--";
            }
            
            // Get first letter of each part
            return parts.map(n => n[0]).join('').toUpperCase();
        }

        // Storage key constants
        const EMPLOYEE_STORAGE_KEY = "selectedEmployeeId";
        let employeesLoadedAndSelected = false;

        document.addEventListener('DOMContentLoaded', function() {
            // Set up the delete confirmation dialog
            const deleteConfirmDialog = document.getElementById('delete-confirm-dialog');
            const deleteCancelBtn = document.getElementById('delete-cancel-btn');
            const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
            let entryToDeleteId = null;
            
            // Cancel button click handler for delete dialog
            deleteCancelBtn.addEventListener('click', function() {
                deleteConfirmDialog.classList.add('hidden');
                entryToDeleteId = null;
            });
            
            // Confirm delete button click handler
            deleteConfirmBtn.addEventListener('click', function() {
                if (entryToDeleteId) {
                    // Use the existing delete function from the time entries logic
                    deleteTimeEntry(entryToDeleteId);
                    deleteConfirmDialog.classList.add('hidden');
                    entryToDeleteId = null;
                }
            });
            
            // Expose a global function to show the delete confirmation dialog
            window.showDeleteConfirmation = function(entryId) {
                entryToDeleteId = entryId;
                deleteConfirmDialog.classList.remove('hidden');
            };
            
            // Immediately check for saved employee to update UI
            const savedEmployeeId = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
            if (savedEmployeeId) {
                // Show loading state in name field
                const nameElement = document.getElementById('employee-name');
                if (nameElement) {
                    nameElement.textContent = 'Loading...';
                    nameElement.classList.add('animate-pulse');
                }
            }
            
            // Focus on getting the NEW dropdown working
            loadEmployeesForNewDropdown();
            
            // Listen for tab activation
            document.querySelectorAll('[data-tab="employee-view"]').forEach(tab => {
                tab.addEventListener('click', function() {
                    setTimeout(loadEmployeesForNewDropdown, 100);
                });
            });
            
            // Custom event for admin.html to trigger
            document.getElementById('employee-view').addEventListener('tabActivated', function() {
                console.log('Tab activated event received');
                loadEmployeesForNewDropdown();
            });
            
            // Initialize time entries functionality
            initializeTimeEntries();
        });

        // Function specifically for the new dropdown
        function loadEmployeesForNewDropdown() {
            // Don't reload if we've already loaded and selected the employee
            if (employeesLoadedAndSelected) {
                console.log("Employees already loaded and selected, skipping reload");
                return;
            }
            
            console.log("Loading employees for dropdown");
            var newDropdown = document.getElementById('new-employee-select');
            
            if (!newDropdown) {
                console.error("Dropdown not found in DOM");
                return;
            }
            
            // Keep the placeholder showing "Loading..." during API fetch
            // Don't change the dropdown content yet
            
            // Clear any animations or transitions
            newDropdown.style.transition = 'none';
            
            // Get previously selected employee ID from localStorage
            const savedEmployeeId = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
            console.log("Found saved employee ID:", savedEmployeeId);
              // If we have a saved employee ID, preload the employee details first
            if (savedEmployeeId) {
                // Show loading states immediately for better UX
                const nameElement = document.getElementById('employee-name');
                const initialsElement = document.getElementById('employee-initials');
                
                if (nameElement) {
                    nameElement.textContent = 'Loading...';
                    nameElement.classList.add('animate-pulse');
                }
                
                if (initialsElement) {
                    initialsElement.textContent = '...';
                }
                
                loadEmployeeDetailsFromNewDropdown(savedEmployeeId);
            }
            
            // Make an API request
            fetch('/api/employees/get/')
                .then(function(response) {
                    console.log("Dropdown API response status:", response.status);
                    return response.json();
                })
                .then(function(data) {
                    console.log("Dropdown received data:", data);
                    
                    if (data.success && data.employees && data.employees.length > 0) {
                        // Only now reset dropdown content
                        let hasSelected = false;
                        
                        // First create the options without adding to the DOM
                        let options = document.createDocumentFragment();
                        
                        // Add default option
                        let defaultOption = document.createElement('option');
                        defaultOption.value = "";
                        defaultOption.textContent = "Choose Employee";
                        options.appendChild(defaultOption);
                        
                        // Add each employee
                        data.employees.forEach(function(emp) {
                            var opt = document.createElement('option');
                            opt.value = emp.id;
                            opt.textContent = emp.full_name;
                            // If this is the saved employee, mark it as selected
                            if (savedEmployeeId && emp.id == savedEmployeeId) {
                                opt.selected = true;
                                hasSelected = true;
                            }
                            options.appendChild(opt);
                        });
                        
                        // Now replace all options at once
                        newDropdown.innerHTML = '';
                        newDropdown.appendChild(options);
                        
                        // Flash the dropdown to draw attention
                        newDropdown.style.backgroundColor = '#ffec99';
                        setTimeout(function() {
                            newDropdown.style.transition = 'background-color 1s';
                            newDropdown.style.backgroundColor = '#f3f4ff';
                        }, 500);
                        
                        // Add change event
                        newDropdown.onchange = function() {                            if (this.value) {
                                // Save the selected employee ID to localStorage
                                localStorage.setItem(EMPLOYEE_STORAGE_KEY, this.value);
                                console.log("Saved employee ID to localStorage:", this.value);
                                
                                // Get the selected employee name directly from the dropdown option
                                const selectedText = this.options[this.selectedIndex].text;
                                
                                // Only proceed if a valid employee is selected
                                if (selectedText !== "Choose Employee") {
                                    // Update the employee name and department display immediately for better UX
                                    const nameElement = document.getElementById('employee-name');
                                    const deptElement = document.getElementById('dep');
                                    const initialsElement = document.getElementById('employee-initials');
                                    
                                    // Update name with loading animation
                                    if (nameElement) {
                                        nameElement.textContent = selectedText;
                                        nameElement.classList.add('animate-pulse');
                                        console.log("Updated employee name to:", selectedText);
                                    }
                                    
                                    // Show loading state for department
                                    if (deptElement) {
                                        deptElement.textContent = "Loading...";
                                    }
                                    
                                    // Update initials immediately if we have a valid name
                                    if (initialsElement && selectedText.trim()) {
                                        const initials = getInitials(selectedText);
                                        initialsElement.textContent = initials;
                                        console.log("Updated initials to:", initials);
                                    }
                                    
                                    // Then load full details
                                    loadEmployeeDetailsFromNewDropdown(this.value);
                                }
                            } else {
                                // Clear saved employee ID when "Choose Employee" is selected
                                localStorage.removeItem(EMPLOYEE_STORAGE_KEY);
                                console.log("Cleared saved employee ID from localStorage");
                                
                                // Reset when "Choose Employee" is selected
                                resetEmployeeDisplay();
                            }
                                                };
                        
                        // If we have a selected value, mark that we've loaded and selected
                        if (hasSelected) {
                            employeesLoadedAndSelected = true;
                            
                            // Manually trigger a change event to ensure the selected employee's details are loaded
                            setTimeout(function() {
                                const event = new Event('change');
                                newDropdown.dispatchEvent(event);
                            }, 100);
                        }
                        
                        console.log("Dropdown setup complete. Current value:", newDropdown.value);
                    } else {
                        console.error("Dropdown: No employees found in API response");
                        // If no employees, change placeholder
                        newDropdown.innerHTML = '<option value="">No employees found</option>';
                    }
                })
                .catch(function(error) {
                    console.error("Dropdown error:", error);
                    // On error, change placeholder
                    newDropdown.innerHTML = '<option value="">Error loading employees</option>';
                });
        }        function loadEmployeeDetailsFromNewDropdown(employeeId) {
            if (!employeeId) {
                console.error("No employee ID provided");
                resetEmployeeDisplay();
                return;
            }
            
            console.log("Loading details for employee ID:", employeeId);
            
            // First fetch employee basic details
            fetch('/api/employees/' + employeeId + '/')
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(function(data) {
                    if (data.success && data.employee) {
                        console.log("Employee details received:", data.employee);
                        
                        var emp = data.employee;
                        
                        // Update the name display
                        const nameElement = document.getElementById('employee-name');
                        if (nameElement && emp.full_name) {
                            nameElement.classList.remove('animate-pulse');
                            nameElement.textContent = emp.full_name;
                            console.log("Updated name display to:", emp.full_name);
                        }
                        
                        // Update department display
                        const departmentText = emp.department && emp.department.name ? emp.department.name : '--';
                        const depElement = document.getElementById('dep');
                        if (depElement) {
                            depElement.textContent = departmentText;
                        }
                        
                        // Update the initials
                        const initialsElement = document.getElementById('employee-initials');
                        if (initialsElement) {
                            const initials = getInitials(emp.full_name);
                            initialsElement.textContent = initials;
                            console.log("Updated initials to:", initials);
                        }
                        
                        // Update the page title to include employee name
                        document.querySelector('#employee-view h1.text-2xl').textContent = 'Employee Time Tracking';
                        
                        // Then fetch time statistics separately
                        return fetch('/api/time/stats/' + employeeId + '/');
                    } else {
                        console.error("Failed to load employee details");
                        throw new Error("Failed to load employee details");
                    }
                })
                .then(response => response.json())
                .then(statsData => {
                    console.log("Time statistics received:", statsData);
                    
                    if (statsData.success) {
                        const weeklyHours = statsData.statistics.weekly_hours || 0;
                        const dailyAverage = statsData.statistics.daily_average || 0;
                        
                        // Format to one decimal place and add "hours" text
                        const weeklyHoursFormatted = parseFloat(weeklyHours).toFixed(1) + " hours";
                        const dailyAverageFormatted = parseFloat(dailyAverage).toFixed(1) + " hours";
                        
                        // Update the UI
                        document.getElementById('weekly-hours').textContent = weeklyHoursFormatted;
                        document.getElementById('daily-average').textContent = dailyAverageFormatted;
                        console.log("Updated statistics - Weekly hours:", weeklyHoursFormatted);
                        console.log("Updated statistics - Daily average:", dailyAverageFormatted);
                    } else {
                        console.error("Failed to load time statistics:", statsData.message);
                        // Set default values
                        document.getElementById('weekly-hours').textContent = "0.0 hours";
                        document.getElementById('daily-average').textContent = "0.0 hours";
                    }
                    
                    // Dispatch event for calendar to update
                    document.dispatchEvent(new CustomEvent('employeeSelected', { 
                        detail: { employeeId: employeeId }
                    }));
                    console.log("Dispatched employeeSelected event with ID:", employeeId);
                    
                    // Visual feedback of successful data load
                    var initialsElement = document.getElementById('employee-initials');
                    initialsElement.style.transition = 'background-color 0.5s';
                    initialsElement.style.backgroundColor = '#c7f9cc';
                    setTimeout(function() {
                        initialsElement.style.backgroundColor = '';
                    }, 1000);
                })
                .catch(function(error) {
                    console.error("Error loading employee details or statistics:", error);
                    // Set default values on error
                    document.getElementById('weekly-hours').textContent = "0.0 hours";
                    document.getElementById('daily-average').textContent = "0.0 hours";
                });
        }        function resetEmployeeDisplay() {
            const nameElement = document.getElementById('employee-name');
            const depElement = document.getElementById('dep');
            const initialsElement = document.getElementById('employee-initials');
            const weeklyHoursElement = document.getElementById('weekly-hours');
            const dailyAverageElement = document.getElementById('daily-average');

            if (nameElement) {
                nameElement.textContent = 'Select an employee';
                nameElement.classList.remove('animate-pulse');
            }
            if (depElement) depElement.textContent = '--';
            if (initialsElement) {
                initialsElement.textContent = '--';
                initialsElement.style.backgroundColor = '';
            }
            if (weeklyHoursElement) weeklyHoursElement.textContent = '0 hours';
            if (dailyAverageElement) dailyAverageElement.textContent = '0 hours';
            
            // Dispatch a custom event to notify the calendar to reset
            document.dispatchEvent(new CustomEvent('employeeReset'));
            console.log("Dispatched employeeReset event");
        }

        // Time entries functionality
        function initializeTimeEntries() {
            const timeEntriesContainer = document.getElementById('time-entries-container');
            const noEntriesMessage = document.getElementById('no-entries-message');
            const timeEntriesDate = document.getElementById('time-entries-date');
            const addEntryBtn = document.getElementById('add-entry-btn');
            const entryModal = document.getElementById('entry-modal');
            const entryForm = document.getElementById('entry-form');
            const closeModalBtn = document.getElementById('close-modal-btn');
            const cancelEntryBtn = document.getElementById('cancel-entry-btn');
            const confirmDialog = document.getElementById('confirm-dialog');
            const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
            const okConfirmBtn = document.getElementById('ok-confirm-btn');
            
            let selectedDate = new Date().toISOString().split('T')[0]; // Default to today
            let currentEmployeeId = null;
            let editingEntryId = null;

            // Set initial date text
            timeEntriesDate.textContent = formatDateForDisplay(selectedDate);
            
            // Disable Add Entry button initially (no employee selected)
            addEntryBtn.classList.add('opacity-50', 'cursor-not-allowed');
            addEntryBtn.disabled = true;

            // Listen for date selection in calendar
            document.addEventListener('click', function(e) {
                // Check if clicked element is a calendar day with date attribute
                if (e.target.closest('.calendar-day') && e.target.closest('.calendar-day').dataset.date) {
                    const newDate = e.target.closest('.calendar-day').dataset.date;
                    if (newDate && newDate !== selectedDate) {
                        selectedDate = newDate;
                        timeEntriesDate.textContent = formatDateForDisplay(selectedDate);
                        if (currentEmployeeId) {
                            loadTimeEntries(currentEmployeeId, selectedDate);
                        }
                    }
                }
            });

            // Listen for employee selection
            document.addEventListener('employeeSelected', function(e) {
                currentEmployeeId = e.detail.employeeId;
                loadTimeEntries(currentEmployeeId, selectedDate);
                
                // Enable the Add Entry button when an employee is selected
                addEntryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                addEntryBtn.disabled = false;
            });

            // Listen for employee reset
            document.addEventListener('employeeReset', function() {
                currentEmployeeId = null;
                timeEntriesContainer.innerHTML = '';
                noEntriesMessage.textContent = 'Select an employee to view time entries';
                noEntriesMessage.style.display = 'block';
                
                // Disable Add Entry button when no employee is selected
                addEntryBtn.classList.add('opacity-50', 'cursor-not-allowed');
                addEntryBtn.disabled = true;
            });

            // Check if there's already a selected employee in localStorage
            const savedEmployeeId = localStorage.getItem('selectedEmployeeId');
            if (savedEmployeeId) {
                currentEmployeeId = savedEmployeeId;
                loadTimeEntries(currentEmployeeId, selectedDate);
                addEntryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                addEntryBtn.disabled = false;
            }

            // Add Entry button click
            addEntryBtn.addEventListener('click', function() {
                if (!currentEmployeeId) return;
                
                // Reset form
                editingEntryId = null;
                document.getElementById('entry-id').value = '';
                document.getElementById('entry-modal-title').textContent = 'Add Time Entry';
                document.getElementById('entry-date').value = selectedDate;
                document.getElementById('entry-type').value = 'Regular';
                document.getElementById('start-time').value = '09:00';
                document.getElementById('end-time').value = '17:00';
                document.getElementById('entry-notes').value = '';
                
                // Show modal
                entryModal.classList.remove('hidden');
            });

            // Close modal buttons
            closeModalBtn.addEventListener('click', closeModal);
            cancelEntryBtn.addEventListener('click', closeModal);

            function closeModal() {
                entryModal.classList.add('hidden');
            }

            // Close confirm dialog
            cancelConfirmBtn.addEventListener('click', function() {
                confirmDialog.classList.add('hidden');
            });

            // Handle form submission
            entryForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const entryId = document.getElementById('entry-id').value;
                const entryType = document.getElementById('entry-type').value;
                const startTime = document.getElementById('start-time').value;
                const endTime = document.getElementById('end-time').value;
                const notes = document.getElementById('entry-notes').value;
                const entryDate = document.getElementById('entry-date').value || selectedDate;
                
                const isEditing = !!entryId;
                
                // Calculate hours for display
                const startHour = parseInt(startTime.split(':')[0]);
                const startMinute = parseInt(startTime.split(':')[1]);
                const endHour = parseInt(endTime.split(':')[0]);
                const endMinute = parseInt(endTime.split(':')[1]);
                
                const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
                const totalHours = (totalMinutes / 60).toFixed(2);
                
                // In a real app, this would make an API call to save the entry
                // For now, we'll just update the UI for demonstration
                
                const entryData = {
                    id: isEditing ? entryId : Date.now().toString(),
                    type: entryType,
                    start_time: formatTimeForDisplay(startTime),
                    end_time: formatTimeForDisplay(endTime),
                    total_hours: totalHours,
                    status: 'pending',
                    notes: notes,
                    date: entryDate,
                    created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                
                if (isEditing) {
                    updateTimeEntryInUI(entryData);
                    showNotification('Time entry updated successfully', 'success');
                } else {
                    addTimeEntryToUI(entryData);
                    showNotification('Time entry added successfully', 'success');
                }
                
                closeModal();
            });

            // Load time entries for an employee on a specific date
            function loadTimeEntries(employeeId, date) {
                // Clear container except for the no entries message
                const entries = timeEntriesContainer.querySelectorAll('.time-entry');
                entries.forEach(entry => entry.remove());
                
                // Show loading state
                noEntriesMessage.textContent = 'Loading time entries...';
                noEntriesMessage.style.display = 'block';
                
                // Format date for API (YYYY-MM-DD)
                const formattedDate = date;
                
                // Fetch time entries from the API
                fetch(`/api/time/entries/${employeeId}/?date=${formattedDate}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.entries && data.entries.length > 0) {
                            noEntriesMessage.style.display = 'none';
                            
                            // Sort entries by creation time (newest first)
                            data.entries.sort((a, b) => {
                                return new Date(b.created_at) - new Date(a.created_at);
                            });
                            
                            // Add entries to the UI
                            data.entries.forEach(entry => {
                                const entryData = {
                                    id: entry.id,
                                    type: entry.type || 'Regular Work Hours',
                                    start_time: formatTimeForDisplay(entry.start_time),
                                    end_time: entry.end_time ? formatTimeForDisplay(entry.end_time) : 'N/A',
                                    total_hours: entry.total_hours,
                                    status: entry.status,
                                    notes: entry.notes || '',
                                    date: entry.date,
                                    created_at: formatTimeForDisplay(entry.created_at.split(' ')[1]) // Extract time part
                                };
                                addTimeEntryToUI(entryData);
                            });
                        } else {
                            noEntriesMessage.textContent = 'No time entries for selected date';
                            noEntriesMessage.style.display = 'block';
                        }
                    })
                    .catch(error => {
                        console.error('Error loading time entries:', error);
                        noEntriesMessage.textContent = 'Error loading time entries. Please try again.';
                        noEntriesMessage.style.display = 'block';
                    });
            }

            // Add a time entry to the UI
            function addTimeEntryToUI(entry) {
                noEntriesMessage.style.display = 'none';
                
                const entryElement = document.createElement('div');
                entryElement.className = 'time-entry bg-gray-50 rounded-lg p-4';
                entryElement.dataset.entryId = entry.id;
                
                const statusClass = entry.status === 'approved' ? 
                    'bg-green-100 text-green-800' : 
                    entry.status === 'rejected' ? 
                        'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800';
                
                entryElement.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="font-medium">${entry.type}</p>
                            <p class="text-sm text-gray-500">Submitted at ${entry.created_at}</p>
                        </div>
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p class="text-xs text-gray-500">Start Time</p>
                            <p class="font-medium">${entry.start_time}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">End Time</p>
                            <p class="font-medium">${entry.end_time}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Total Hours</p>
                            <p class="font-medium">${entry.total_hours} hours</p>
                        </div>
                    </div>
                    ${entry.notes ? `
                        <div class="mt-3 pt-3 border-t border-gray-200">
                            <p class="text-xs text-gray-500">Notes</p>
                            <p class="text-sm">${entry.notes}</p>
                        </div>
                    ` : ''}
                    <div class="mt-3 pt-3 border-t border-gray-200 flex justify-end space-x-2">
                        ${entry.status === 'pending' ? `
                            <button class="approve-entry-btn text-sm text-green-600 hover:text-green-800 font-medium">Approve</button>
                            <button class="reject-entry-btn text-sm text-red-600 hover:text-red-800 font-medium">Reject</button>
                        ` : ''}
                        <button class="edit-entry-btn text-sm text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                        <button class="delete-entry-btn text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                    </div>
                `;
                
                // Add event listeners for action buttons
                const approveBtn = entryElement.querySelector('.approve-entry-btn');
                if (approveBtn) {
                    approveBtn.addEventListener('click', function() {
                        updateEntryStatus(entry.id, 'approved');
                    });
                }
                
                const rejectBtn = entryElement.querySelector('.reject-entry-btn');
                if (rejectBtn) {
                    rejectBtn.addEventListener('click', function() {
                        updateEntryStatus(entry.id, 'rejected');
                    });
                }
                
                const editBtn = entryElement.querySelector('.edit-entry-btn');
                editBtn.addEventListener('click', function() {
                    editTimeEntry(entry.id);
                });
                
                const deleteBtn = entryElement.querySelector('.delete-entry-btn');
                deleteBtn.addEventListener('click', function() {
                    showDeleteConfirmation(entry.id);
                });
                
                timeEntriesContainer.prepend(entryElement);
            }

            // Update existing time entry in UI
            function updateTimeEntryInUI(entry) {
                const entryElement = document.querySelector(`.time-entry[data-entry-id="${entry.id}"]`);
                if (!entryElement) return;
                
                const typeElement = entryElement.querySelector('.font-medium');
                typeElement.textContent = entry.type;
                
                const startTimeElement = entryElement.querySelectorAll('.font-medium')[1];
                startTimeElement.textContent = entry.start_time;
                
                const endTimeElement = entryElement.querySelectorAll('.font-medium')[2];
                endTimeElement.textContent = entry.end_time;
                
                const totalHoursElement = entryElement.querySelectorAll('.font-medium')[3];
                totalHoursElement.textContent = `${entry.total_hours} hours`;
                
                // Handle notes section
                const notesContainer = entryElement.querySelector('.mt-3.pt-3:not(.flex)');
                const actionsRow = entryElement.querySelector('.mt-3.pt-3.flex');
                
                // Remove existing notes container if it exists
                if (notesContainer) {
                    notesContainer.remove();
                }
                
                // Add new notes section only if notes exist and are not empty
                if (entry.notes && entry.notes.trim()) {
                    const newNotesSection = document.createElement('div');
                    newNotesSection.className = 'mt-3 pt-3 border-t border-gray-200';
                    newNotesSection.innerHTML = `
                        <p class="text-xs text-gray-500">Notes</p>
                        <p class="text-sm">${entry.notes}</p>
                    `;
                    entryElement.insertBefore(newNotesSection, actionsRow);
                }
            }

            // Update the status of a time entry
            function updateEntryStatus(entryId, status) {
                const entryElement = document.querySelector(`.time-entry[data-entry-id="${entryId}"]`);
                if (!entryElement) return;
                
                // Update status badge
                const statusBadge = entryElement.querySelector('.rounded-full');
                statusBadge.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`;
                statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                
                // Remove action buttons for pending status
                const actionsRow = entryElement.querySelector('.mt-3.pt-3.flex');
                const approveBtn = entryElement.querySelector('.approve-entry-btn');
                const rejectBtn = entryElement.querySelector('.reject-entry-btn');
                
                if (approveBtn) approveBtn.remove();
                if (rejectBtn) rejectBtn.remove();
                
                showNotification(`Time entry ${status} successfully`, 'success');
            }

            // Edit a time entry
            function editTimeEntry(entryId) {
                const entryElement = document.querySelector(`.time-entry[data-entry-id="${entryId}"]`);
                if (!entryElement) return;
                
                // Populate form with existing entry data
                document.getElementById('entry-id').value = entryId;
                document.getElementById('entry-modal-title').textContent = 'Edit Time Entry';
                document.getElementById('entry-date').value = selectedDate;
                
                const typeText = entryElement.querySelector('.font-medium').textContent;
                document.getElementById('entry-type').value = 
                    ['Regular', 'Overtime', 'Meeting', 'Training', 'Other'].includes(typeText) ? typeText : 'Other';
                
                const startTimeText = entryElement.querySelectorAll('.font-medium')[1].textContent;
                document.getElementById('start-time').value = formatTimeForInput(startTimeText);
                
                const endTimeText = entryElement.querySelectorAll('.font-medium')[2].textContent;
                document.getElementById('end-time').value = formatTimeForInput(endTimeText);
                
                // Check for notes
                const notesElement = entryElement.querySelector('.mt-3.pt-3:not(.flex) .text-sm');
                document.getElementById('entry-notes').value = notesElement ? notesElement.textContent : '';
                
                // Show modal
                entryModal.classList.remove('hidden');
            }

            // Confirm delete entry
            function confirmDeleteEntry(entryId) {
                document.getElementById('confirm-title').textContent = 'Delete Time Entry';
                document.getElementById('confirm-message').textContent = 'Are you sure you want to delete this time entry? This action cannot be undone.';
                
                // Show confirm dialog
                confirmDialog.classList.remove('hidden');
                
                // Set up confirm action
                okConfirmBtn.onclick = function() {
                    deleteTimeEntry(entryId);
                    confirmDialog.classList.add('hidden');
                };
            }

            // Delete a time entry
            function deleteTimeEntry(entryId) {
                const entryElement = document.querySelector(`.time-entry[data-entry-id="${entryId}"]`);
                if (!entryElement) return;
                
                entryElement.remove();
                
                // Check if there are any entries left
                const entries = timeEntriesContainer.querySelectorAll('.time-entry');
                if (entries.length === 0) {
                    noEntriesMessage.style.display = 'block';
                }
                
                showNotification('Time entry deleted successfully', 'success');
            }

            // Helper function to format date for display
            function formatDateForDisplay(dateString) {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }

            // Helper function to format time for display (12-hour format)
            function formatTimeForDisplay(timeString) {
                const [hours, minutes] = timeString.split(':');
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const hour12 = hour % 12 || 12;
                return `${hour12}:${minutes} ${ampm}`;
            }

            // Helper function to format time from display (12h) to input (24h) format
            function formatTimeForInput(displayTime) {
                // Example: Convert "9:00 AM" to "09:00"
                const [time, ampm] = displayTime.split(' ');
                let [hours, minutes] = time.split(':');
                
                hours = parseInt(hours);
                
                // Convert to 24-hour format
                if (ampm === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (ampm === 'AM' && hours === 12) {
                    hours = 0;
                }
                
                return `${hours.toString().padStart(2, '0')}:${minutes}`;
            }

            // Show notification
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
        }

        // Run immediately to populate the dropdown
        setTimeout(loadEmployeesForNewDropdown, 100);
        
});// Function to get initials from a name
