// DOM elements

document.addEventListener('DOMContentLoaded', function () {
    const greetingElement = document.getElementById('greeting');
    const userInitialElement = document.getElementById('userInitial');
    const quoteElement = document.getElementById('quote');
    const authorElement = document.getElementById('author');
    const entryTypeSelect = document.getElementById('entryType');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const startNowBtn = document.getElementById('startNowBtn');
    const endNowBtn = document.getElementById('endNowBtn');
    const totalHoursElement = document.getElementById('totalHours');
    const punchBtn = document.getElementById('punchBtn');
    const weeklyHoursElement = document.getElementById('weeklyHours');
    const dailyAverageElement = document.getElementById('dailyAverage');
    
    // Variables to track time entry state
    let hasSetStartTime = false;
    let hasSetEndTime = false;
    let currentEntryStartTime = null;
    // New variables for secure time tracking
    let sessionId = ''; // Will be initialized in init function
    let currentSegmentIndex = 0;       // Track which segment of the day we're on
    let todayTotalHours = 0;           // Track total hours worked today across all segments
    let currentEntryId = null;         // Track the ID of the entry being edited
    let isEditMode = false;            // Flag to track if we're in edit mode
      // Load quotes from JSON file
    let quotes = [];

    // Function to load quotes from JSON file
    async function loadQuotes() {
        try {
            const response = await fetch('/static/punch/js/punchcard/quotes.json');
            if (!response.ok) {
                throw new Error('Failed to load quotes');
            }
            const data = await response.json();
            quotes = data.quotes;
            // Set initial quote once quotes are loaded
            setRandomQuote();
        } catch (error) {
            console.error('Error loading quotes:', error);
            // Fallback quote in case of error
            quotes = [{
                text: "Time is of the essence",
                author: "Unknown"
            }];
            setRandomQuote();
        }
    }

    // Set random quote
    function setRandomQuote() {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteElement.textContent = randomQuote.text;
        authorElement.textContent = `- ${randomQuote.author}`;
    }

    // Load time statistics
    function loadTimeStatistics() {
        fetch('/api/time/stats/')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    weeklyHoursElement.textContent = `${data.statistics.weekly_hours.toFixed(2)} hours`;
                    dailyAverageElement.textContent = `${data.statistics.daily_average.toFixed(2)} hours`;
                }
            })
            .catch(error => console.error('Error loading statistics:', error));
    }

    // Update current times
    function updateCurrentTimes() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        
        // Update start time if the "Now" button hasn't been clicked yet
        if (!hasSetStartTime) {
            startTimeInput.value = currentTime;
        }
        
        // Update end time if the "Now" button hasn't been clicked yet
        if (!hasSetEndTime) {
            endTimeInput.value = currentTime;
        }
        
        calculateTotalHours();
    }

    // Keep updating the current time for fields that haven't been set with "Now" button
    function startTimeUpdater() {
        // Update once immediately
        updateCurrentTimes();
        
        // Then update every second
        setInterval(() => {
            // Only update if not set by the "Now" button
            if (!hasSetStartTime || !hasSetEndTime) {
                updateCurrentTimes();
            }
        }, 1000);
    }

    // Show notification
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

    // Calculate total hours between start and end time
    function calculateTotalHours() {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        
        if (!startTime || !endTime) return;
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        
        const hours = totalMinutes / 60;
        
        // We don't update totalHoursElement here to avoid conflict with loadTodayTotalHours
        // totalHoursElement now only shows accumulated hours from all segments
        // The current entry hours are only used for form submission
        
        return hours;
    }

    // Load recent activities
    function loadRecentActivities(highlightNewest = false) {
        const activitiesContainer = document.getElementById('recent-activities');
        activitiesContainer.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i> Loading recent activities...
            </div>
        `;
        
        fetch('/api/time/recent/')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    activitiesContainer.innerHTML = ''; // Clear existing activities
                    
                    if (!data.entries || data.entries.length === 0) {
                        activitiesContainer.innerHTML = `
                            <div class="p-4 text-center text-gray-500">
                                No recent time entries found.
                            </div>
                        `;
                        return;
                    }
                    
                    // Today's date to filter entries
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Filter entries for today only
                    const recentEntries = data.entries.filter(entry => {
                        const entryDate = new Date(entry.date);
                        entryDate.setHours(0, 0, 0, 0);
                        return entryDate.getTime() === today.getTime();
                    });
                    
                    if (recentEntries.length === 0) {
                        activitiesContainer.innerHTML = `
                            <div class="p-4 text-center text-gray-500">
                                No time entries logged today.
                            </div>
                        `;
                        return;
                    }
                    
                    // Sort by creation time (newest first)
                    recentEntries.sort((a, b) => {
                        return new Date(b.created_at) - new Date(a.created_at);
                    });
                    
                    // Display only the 5 most recent entries
                    const entriesToShow = recentEntries.slice(0, 5);
                    
                    entriesToShow.forEach((entry, index) => {
                        const activityEl = document.createElement('div');
                        activityEl.className = `flex items-center justify-between p-3 border-b border-gray-100 ${index === 0 && highlightNewest ? 'bg-indigo-50' : ''}`;
                        activityEl.dataset.entryId = entry.id; // Store entry ID for edit/delete functionality
                        
                        const statusColors = {
                            'pending': 'yellow',
                            'approved': 'green',
                            'rejected': 'red'
                        };
                        
                        const statusColor = statusColors[entry.status] || 'yellow';
                        const entryDate = new Date(entry.date);
                        const today = new Date();
                        
                        // Format date display
                        let dateString;
                        if (entryDate.toDateString() === today.toDateString()) {
                            dateString = 'Today';
                        } else if (entryDate.toDateString() === new Date(today - 86400000).toDateString()) {
                            dateString = 'Yesterday';
                        } else {
                            dateString = entryDate.toLocaleDateString();
                        }
                        
                        // Format time for display
                        const createdTime = entry.created_at.split(' ')[1] || entry.created_at;
                        
                        // Get entry type with a fallback to 'Regular Work Hours' for existing entries
                        const entryType = entry.entry_type || 'Regular Work Hours';
                        
                        activityEl.innerHTML = `
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-full bg-${statusColor}-100 flex items-center justify-center text-${statusColor}-600 mr-3">
                                    <i class="fas ${entry.status === 'approved' ? 'fa-check' : entry.status === 'rejected' ? 'fa-times' : 'fa-clock'}"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-medium">Time ${entry.end_time ? 'submitted' : 'started'}</p>
                                    <p class="text-xs text-gray-500">${dateString}, ${createdTime}</p>
                                    <p class="text-xs text-indigo-600 mt-1">${entryType}</p>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800 mr-3">
                                    ${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                </span>                                <span class="text-sm font-medium mr-3">${parseFloat(entry.total_hours).toFixed(2)} hrs</span>
                            </div>
                        `;
                          // No edit/delete buttons for regular employees
                        
                        if (index === 0 && highlightNewest) {
                            activityEl.style.transition = 'background-color 0.5s ease';
                            setTimeout(() => {
                                activityEl.style.backgroundColor = 'transparent';
                            }, 2000);
                        }
                        
                        activitiesContainer.appendChild(activityEl);
                    });
                } else {
                    activitiesContainer.innerHTML = `
                        <div class="p-4 text-center text-gray-500">
                            Error loading recent activities. Please try again.
                        </div>
                    `;
                    console.error('API returned error:', data.message);
                }
            })
            .catch(error => {
                console.error('Error loading recent activities:', error);
                activitiesContainer.innerHTML = `
                    <div class="p-4 text-center text-gray-500">
                        Error loading recent activities. Please check your connection.
                    </div>
                `;
            });
    }

    // Check for existing time entries for today
    function checkExistingTimeEntries() {
        return fetch('/api/time/recent/')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.entries && data.entries.length > 0) {
                    // Today's date to filter entries
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Filter entries for today
                    const todayEntries = data.entries.filter(entry => {
                        const entryDate = new Date(entry.date);
                        entryDate.setHours(0, 0, 0, 0);
                        return entryDate.getTime() === today.getTime();
                    });
                    
                    // Check if there's an incomplete entry (only start time)
                    const incompleteEntry = todayEntries.find(entry => !entry.end_time);
                    
                    if (incompleteEntry) {
                        // Found an incomplete entry, set start time and disable start button
                        startTimeInput.value = incompleteEntry.start_time;
                        hasSetStartTime = true;
                        currentEntryStartTime = incompleteEntry.start_time;
                        startNowBtn.disabled = true;
                        startNowBtn.classList.add('opacity-50', 'cursor-not-allowed');
                        return true;
                    }
                }
                
                return false;
            })
            .catch(error => {
                console.error('Error checking existing time entries:', error);
                return false;
            });
    }

    // Punch button click handler
    punchBtn.addEventListener('click', () => {
        // Check if the start time is set using the "Now" button
        if (!hasSetStartTime) {
            showNotification('Please set a start time by clicking the "Now" button first', 'error');
            return;
        }
        
        // Check if the end time is set using the "Now" button
        if (!hasSetEndTime) {
            showNotification('Please set an end time by clicking the "Now" button first', 'error');
            return;
        }
        
        // Disable button and show processing state
        punchBtn.disabled = true;
        punchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
        punchBtn.classList.add('bg-indigo-800');
        punchBtn.classList.remove('hover:bg-indigo-700');
        
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        if (isEditMode && currentEntryId) {
            // Update existing entry
            editTimeEntrySubmit(currentEntryId);
        } else {
            // Create new entry
            createTimeEntry();
        }
    });    // Create a new time entry
    function createTimeEntry() {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Format times to 24-hour format (HH:MM) as expected by the server
        let startTime = startTimeInput.value;
        let endTime = endTimeInput.value;
          // Generate a unique session ID
        const sessionId = Date.now().toString();
        
        // Prepare data for API request
        const data = {
            start_time: startTime,
            end_time: endTime,
            entry_type: entryTypeSelect.value,
            session_id: sessionId,
            segment_index: 0  // Default to first segment
        };
        
        console.log('Sending time entry data:', data);
          // Make API request to punch time endpoint
        fetch('/api/time/punch/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data),
            credentials: 'same-origin' // Include credentials for CSRF
        })
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            if (data.success) {
                // Show success state briefly
                punchBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Time Recorded!';
                showNotification('Time entry saved successfully!');
                
                // Reset the time entry state
                resetForm();
                
                // Update displayed stats
                calculateTotalHours();
                loadTimeStatistics();
                loadTodayTotalHours(); 
                loadRecentActivities(true);
            } else {
                // Show error state briefly
                punchBtn.innerHTML = '<i class="fas fa-times-circle mr-2"></i> Failed!';
                showNotification(data.message || 'Failed to save time entry', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            punchBtn.innerHTML = '<i class="fas fa-times-circle mr-2"></i> Failed!';
            showNotification('Failed to connect to server', 'error');
        })
        .finally(() => {
            // Reset button state after a delay
            setTimeout(() => {
                punchBtn.innerHTML = '<i class="fas fa-fingerprint text-xl mr-3"></i> PUNCH TIME';
                punchBtn.classList.remove('bg-indigo-800');
                punchBtn.classList.add('hover:bg-indigo-700');
                punchBtn.disabled = false;
            }, 2000);
        });
    }    // Get time entry by ID
    function getTimeEntry(entryId) {
        console.log(`Fetching entry with ID: ${entryId}`);
        
        return fetch(`/api/time/entry/${entryId}/`, {
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                },
                credentials: 'same-origin' // Include credentials for CSRF
            })
            .then(response => {
                console.log('Get entry response status:', response.status);
                if (!response.ok) {
                    throw new Error(`Failed to fetch time entry: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Get entry response data:', data);
                if (data.success) {
                    return data.entry;
                } else {
                    throw new Error(data.message || 'Failed to load time entry');
                }
            })
            .catch(error => {
                console.error('Error in getTimeEntry:', error);
                throw error;
            });
    }

    // Edit time entry - loads entry data into form
    function editTimeEntry(entryId) {
        // Fetch the entry details
        getTimeEntry(entryId)
            .then(entry => {
                // Set form values
                startTimeInput.value = entry.start_time;
                endTimeInput.value = entry.end_time || '';
                entryTypeSelect.value = entry.entry_type;
                
                // Set state variables
                currentEntryId = entry.id;
                isEditMode = true;
                hasSetStartTime = true;
                hasSetEndTime = !!entry.end_time;
                
                // Update UI
                punchBtn.innerHTML = '<i class="fas fa-save text-xl mr-3"></i> UPDATE TIME';
                showNotification('Editing time entry - click UPDATE TIME when done');
                
                // Disable start now button but allow end time changes
                startNowBtn.disabled = true;
                startNowBtn.classList.add('opacity-50', 'cursor-not-allowed');
                
                if (hasSetEndTime) {
                    endNowBtn.disabled = true;
                    endNowBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
                
                // Scroll to the form
                document.querySelector('.time-card').scrollIntoView({ behavior: 'smooth' });
            })
            .catch(error => {
                console.error('Error loading time entry:', error);
                showNotification('Failed to load time entry details', 'error');
            });
    }    // Submit edited time entry
    function editTimeEntrySubmit(entryId) {
        // Get current date for the record
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Format times to 24-hour format (HH:MM) as expected by the server
        let startTime = startTimeInput.value;
        let endTime = endTimeInput.value;
        
        const data = {
            date: formattedDate, // Include date as required by the backend
            start_time: startTime,
            end_time: endTime,
            entry_type: entryTypeSelect.value,
            notes: '' // Could add a notes field to the UI later
        };
        
        console.log('Updating time entry with data:', data);
        
        fetch(`/api/time/entry/${entryId}/update/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data),
            credentials: 'same-origin' // Include credentials for CSRF
        })
        .then(response => {
            console.log('Update response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Update response data:', data);
            if (data.success) {
                // Show success state briefly
                punchBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Updated!';
                showNotification('Time entry updated successfully!');
                
                // Reset the form and state
                resetForm();
                
                // Update displays
                loadTimeStatistics();
                loadTodayTotalHours();
                loadRecentActivities(true);
            } else {
                punchBtn.innerHTML = '<i class="fas fa-times-circle mr-2"></i> Failed!';
                showNotification(data.message || 'Failed to update time entry', 'error');
            }
        })
        .catch(error => {
            console.error('Error updating time entry:', error);
            punchBtn.innerHTML = '<i class="fas fa-times-circle mr-2"></i> Failed!';
            showNotification('Failed to connect to server', 'error');
        })
        .finally(() => {
            // Reset button state after a delay
            setTimeout(() => {
                punchBtn.innerHTML = '<i class="fas fa-fingerprint text-xl mr-3"></i> PUNCH TIME';
                punchBtn.classList.remove('bg-indigo-800');
                punchBtn.classList.add('hover:bg-indigo-700');
                punchBtn.disabled = false;
            }, 2000);
        });
    }    // Delete time entry
    function deleteTimeEntry(entryId) {
        if (!confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) {
            return;
        }
        
        console.log(`Deleting entry with ID: ${entryId}`);
        
        fetch(`/api/time/entry/${entryId}/delete/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            credentials: 'same-origin' // Include credentials for CSRF
        })
        .then(response => {
            console.log('Delete response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Delete response data:', data);
            if (data.success) {
                showNotification('Time entry deleted successfully!');
                
                // If we were editing this entry, reset the form
                if (isEditMode && currentEntryId === entryId) {
                    resetForm();
                }
                
                // Update displays
                loadTimeStatistics();
                loadTodayTotalHours();
                loadRecentActivities();
            } else {
                showNotification(data.message || 'Failed to delete time entry', 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting time entry:', error);
            showNotification('Failed to connect to server', 'error');
        });
    }

    // Reset the form and state variables
    function resetForm() {
        // Reset state variables
        isEditMode = false;
        currentEntryId = null;
        hasSetStartTime = false;
        hasSetEndTime = false;
        
        // Clear localStorage items
        localStorage.removeItem('punchClockStartTime');
        localStorage.removeItem('punchClockEndTime');
        localStorage.removeItem('punchClockStartDate');
        
        // Reset form elements
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        
        startTimeInput.value = currentTime;
        endTimeInput.value = currentTime;
        entryTypeSelect.value = 'Regular Work Hours';
        
        // Re-enable buttons
        startNowBtn.disabled = false;
        startNowBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        endNowBtn.disabled = false;
        endNowBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Reset punch button text
        punchBtn.innerHTML = '<i class="fas fa-fingerprint text-xl mr-3"></i> PUNCH TIME';
    }

    // Event listeners for time inputs
    // Prevent direct editing of time inputs (require using "Now" buttons)
    startTimeInput.addEventListener('focus', function() {
        this.blur(); // Prevent focusing/editing
        showNotification('Please use the "Now" button to set the start time', 'error');
    });
    
    endTimeInput.addEventListener('focus', function() {
        this.blur(); // Prevent focusing/editing
        showNotification('Please use the "Now" button to set the end time', 'error');
    });
    
    // Calculate hours when values change
    startTimeInput.addEventListener('change', calculateTotalHours);
    endTimeInput.addEventListener('change', calculateTotalHours);

    // Now buttons
    startNowBtn.addEventListener('click', () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        
        // Fix the current time when "Now" is clicked
        startTimeInput.value = currentTime;
        currentEntryStartTime = currentTime;
        hasSetStartTime = true;
        
        // Disable the start now button for the rest of the day
        startNowBtn.disabled = true;
        startNowBtn.classList.add('opacity-50', 'cursor-not-allowed');
        
        // Store the start time in localStorage to persist across page reloads
        localStorage.setItem('punchClockStartTime', currentTime);
        localStorage.setItem('punchClockStartDate', now.toDateString());
        
        calculateTotalHours();
        showNotification(`Start time set to ${currentTime}`);
    });

    endNowBtn.addEventListener('click', () => {
        // Only allow setting end time if start time has been set
        if (!hasSetStartTime) {
            showNotification('Please set a start time first', 'error');
            return;
        }
        
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        
        // Fix the current time when "Now" is clicked
        endTimeInput.value = currentTime;
        hasSetEndTime = true;
        
        // Store the end time in localStorage to persist across page reloads
        localStorage.setItem('punchClockEndTime', currentTime);
        
        // Disable the end now button until a submission is completed
        endNowBtn.disabled = true;
        endNowBtn.classList.add('opacity-50', 'cursor-not-allowed');
        
        calculateTotalHours();
        showNotification(`End time set to ${currentTime}, ready to submit`);
    });    // Initialize everything
    async function init() {
        // Initialize session ID first
        sessionId = generateSessionId();
        console.log("Session ID initialized:", sessionId);
        
        // Load quotes first
        await loadQuotes();
        
        // Make time inputs visually read-only
        startTimeInput.readOnly = true;
        endTimeInput.readOnly = true;
        startTimeInput.classList.add('bg-gray-100', 'cursor-not-allowed');
        endTimeInput.classList.add('bg-gray-100', 'cursor-not-allowed');
        
        // Check for saved times in localStorage
        const savedStartTime = localStorage.getItem('punchClockStartTime');
        const savedEndTime = localStorage.getItem('punchClockEndTime');
        const savedStartDate = localStorage.getItem('punchClockStartDate');
        const currentDate = new Date().toDateString();
        
        if (savedStartTime && savedStartDate === currentDate) {
            // Restore the saved start time if it's from today
            startTimeInput.value = savedStartTime;
            hasSetStartTime = true;
            currentEntryStartTime = savedStartTime;
            startNowBtn.disabled = true;
            startNowBtn.classList.add('opacity-50', 'cursor-not-allowed');
            
            // Check if we have a saved end time
            if (savedEndTime) {
                endTimeInput.value = savedEndTime;
                hasSetEndTime = true;
                endNowBtn.disabled = true;
                endNowBtn.classList.add('opacity-50', 'cursor-not-allowed');
                showNotification('Restored saved time entries');
            } else {
                showNotification('Restored saved start time');
            }
        } else {
            // Start the time updater to show current time
            startTimeUpdater();
        }
        
        loadTimeStatistics();
        calculateTotalHours();
        loadRecentActivities();
        loadTodayTotalHours(); // Load total hours worked today from all segments
        
        // Check for existing time entries after other UI elements have initialized
        checkExistingTimeEntries();

        // Start continuous time updater
        startTimeUpdater();
    }
    
    // Run initialization
    init();
    
    // Generate a secure session ID for tracking time entries
    function generateSessionId() {
        // Check if we have an existing session ID in localStorage
        let storedSessionId = localStorage.getItem('punchClockSessionId');
        
        if (storedSessionId) {
            return storedSessionId;
        }
        
        // Generate a new session ID: timestamp + random string
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const newSessionId = `${timestamp}-${randomStr}`;
        
        // Store it for future use
        localStorage.setItem('punchClockSessionId', newSessionId);
        
        return newSessionId;
    }
    
    // Load today's total hours from all segments
    function loadTodayTotalHours() {
        fetch('/api/time/today-hours/')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update the total hours display
                    todayTotalHours = data.total_hours;
                    totalHoursElement.textContent = `${todayTotalHours.toFixed(2)} hours`;
                    
                    // Update the segment index for the next entry
                    if (data.segments && data.segments.length > 0) {
                        currentSegmentIndex = data.segments_count;
                    }
                }
            })
            .catch(error => console.error('Error loading today\'s hours:', error));
    }
    
    // Reset daily tracking while preserving data
    function resetDailyTracking() {
        fetch('/api/time/reset-tracking/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                session_id: sessionId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update segment index
                currentSegmentIndex = data.next_segment_index;
                
                // Clear the form for a new segment
                resetForm();
                
                // Update UI
                showNotification('Ready to start a new work segment');
                
                // Update the displayed total hours for today
                loadTodayTotalHours();
                
                // Start the time updater to show current time
                startTimeUpdater();
            }
        })
        .catch(error => console.error('Error resetting tracking:', error));
    }    // Function to get CSRF cookie
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
        
        // Debug CSRF token retrieval
        console.log(`Retrieved CSRF token: ${cookieValue ? 'Found' : 'Not found'}`);
        
        // Fallback: Check if there's a CSRF token in a meta tag
        if (!cookieValue) {
            const csrfElement = document.querySelector('meta[name="csrf-token"]') || 
                               document.querySelector('input[name="csrfmiddlewaretoken"]');
            if (csrfElement) {
                cookieValue = csrfElement.getAttribute('content') || csrfElement.value;
                console.log('Found CSRF token in DOM element');
            }
        }
        
        return cookieValue;
    }
    
    // Add animation styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(10px); }
        }
    `;
    document.head.appendChild(style);
});
