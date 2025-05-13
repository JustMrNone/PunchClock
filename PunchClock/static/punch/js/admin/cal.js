document.addEventListener('DOMContentLoaded', function () {
    const calendarGrid = document.getElementById('calendar-grid');
    const contextMenu = document.getElementById('context-menu');
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalInput = document.getElementById('modal-input');
    const modalForm = document.getElementById('modal-form');
    const modalCancel = document.getElementById('modal-cancel');
    const todayBtn = document.querySelector('.fa-calendar-alt').parentElement;
    const dateDisplay = document.querySelector('.date');
    let selectedDate = null;
    let currentDisplayMonth = new Date().getMonth();
    let currentDisplayYear = new Date().getFullYear();

    // Initialize state
    let holidays = {};
    let notes = {};
    let weekendDays = [];
    let personalNotes = {}; // Added to store employee personal notes
    let currentEmployeeId = null; // Track the currently selected employee

    // Function to load calendar settings for a specific employee or for admin
    function loadCalendarSettings(employeeId = null) {
        let url = '/api/calendar-settings/get/';
        if (employeeId) {
            url = `/api/calendar-settings/get/?employee_id=${employeeId}`;
            currentEmployeeId = employeeId;
        } else {
            currentEmployeeId = null;
        }

        // Reset all data
        holidays = {};
        notes = {};
        weekendDays = [];
        personalNotes = {};

        // Check if "Select an employee" is selected
        const employeeName = document.getElementById('employee-name');
        const isNoEmployeeSelected = employeeName && (employeeName.textContent === 'Select an employee');
        
        if (isNoEmployeeSelected) {
            console.log('No employee selected, showing empty calendar with global settings only');
            
            // Load only global holidays and weekend settings
            fetch('/api/calendar-settings/get/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Only take holidays and weekend days, ignore notes
                        holidays = data.holidays || {};
                        weekendDays = (data.weekendDays || []).map(day => Number(day)); // Ensure numbers
                        
                        console.log('Loaded global settings:', {
                            holidays,
                            weekendDays
                        });
                        
                        renderCalendar(currentDisplayYear, currentDisplayMonth);
                    }
                })
                .catch(error => {
                    console.error('Error loading global calendar settings:', error);
                    renderCalendar(currentDisplayYear, currentDisplayMonth);
                });
            return;
        }

        // Load the admin or employee calendar settings
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    holidays = data.holidays || {};
                    notes = data.notes || {};
                    weekendDays = (data.weekendDays || []).map(day => Number(day)); // Ensure numbers
                    
                    // If we have an employee ID, also load their personal notes
                    if (employeeId) {
                        return fetch(`/api/personal-notes/get/?employee_id=${employeeId}`)
                            .then(response => response.json());
                    }
                }
                return { success: false, notes: {} };
            })
            .then(personalData => {
                if (personalData && personalData.success) {
                    personalNotes = personalData.notes || {};
                    console.log('Loaded personal notes for employee:', currentEmployeeId, personalNotes);
                } else {
                    console.log('No personal notes found or request failed');
                }
                renderCalendar(currentDisplayYear, currentDisplayMonth);
            })
            .catch(error => {
                console.error('Error loading calendar settings:', error);
                renderCalendar(currentDisplayYear, currentDisplayMonth);
            });
    }

    // Check if we're in the employee view (inside employeeview.html)
    const isEmployeeView = document.getElementById('employee-view') !== null;

    // Listen for employee changes if we're in the employee view
    if (isEmployeeView) {
        // This event will be triggered when an employee is selected in the dropdown
        document.addEventListener('employeeSelected', function(e) {
            const employeeId = e.detail.employeeId;
            console.log('Calendar received employee change event:', employeeId);
            loadCalendarSettings(employeeId);
        });
        
        // Listen for employee reset event (when "Choose Employee" is selected)
        document.addEventListener('employeeReset', function() {
            console.log('Calendar received employee reset event');
            // Reset to showing only global settings
            loadCalendarSettings(null);
        });

        // Check if there's a saved employee ID in localStorage
        const savedEmployeeId = localStorage.getItem('selectedEmployeeId');
        if (savedEmployeeId) {
            console.log('Calendar loading saved employee:', savedEmployeeId);
            loadCalendarSettings(savedEmployeeId);
        } else {
            // Default to admin settings if no employee selected
            loadCalendarSettings();
        }
    } else {
        // If not in employee view, just load the admin's settings
        loadCalendarSettings();
    }

    document.addEventListener('click', function(e) {
        if (!e.target.closest('#context-menu') && !e.target.closest('#custom-modal')) {
            hideContextMenu();
        }
    });

    document.addEventListener('contextmenu', function (e) {
        if (e.target.closest('.calendar-day')) {
            e.preventDefault();
            const dayCell = e.target.closest('.calendar-day');
            selectedDate = dayCell.dataset.date;
            const rect = dayCell.getBoundingClientRect();
            showContextMenu(rect.left + window.scrollX, rect.top + window.scrollY);
        } else {
            hideContextMenu();
        }
    });

    function showContextMenu(x, y) {
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        
        // Show or hide the employee note removal button based on context
        const removeEmployeeNoteBtn = document.getElementById('remove-employee-note');
        if (currentEmployeeId && personalNotes[selectedDate]) {
            removeEmployeeNoteBtn.classList.remove('hidden');
        } else {
            removeEmployeeNoteBtn.classList.add('hidden');
        }
        
        // Show or hide the note removal button based on context
        const removeNoteBtn = document.getElementById('remove-note');
        if (notes[selectedDate]) {
            removeNoteBtn.classList.remove('hidden');
        } else {
            removeNoteBtn.classList.add('hidden');
        }
    }

    function hideContextMenu() {
        contextMenu.style.display = 'none';
    }

    function showModal(title, placeholder, callback) {
        modalTitle.textContent = title;
        modalInput.value = placeholder || '';
        modal.style.display = 'flex';

        const handleSubmit = function(e) {
            e.preventDefault();
            callback(modalInput.value);
            modal.style.display = 'none';
            modalForm.removeEventListener('submit', handleSubmit);
        };

        const handleCancel = function() {
            modal.style.display = 'none';
            modalForm.removeEventListener('submit', handleSubmit);
            modalCancel.removeEventListener('click', handleCancel);
        };

        modalForm.addEventListener('submit', handleSubmit);
        modalCancel.addEventListener('click', handleCancel);
    }

    function updateDateDisplay(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = date.toLocaleDateString('en-US', options);
    }

    function saveCalendarSettings() {
        let url = '/api/calendar-settings/update/';
        if (currentEmployeeId) {
            url = `/api/calendar-settings/update/?employee_id=${currentEmployeeId}`;
        }

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                holidays: holidays,
                notes: notes,
                weekendDays: weekendDays
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Error saving calendar settings:', data.message);
            }
        })
        .catch(error => console.error('Error saving calendar settings:', error));
    }

    // Helper function to get CSRF token
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

    function renderCalendar(year, month) {
        calendarGrid.innerHTML = '';
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Update the month/year display
        const monthYearDisplay = document.querySelector('.date');
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        monthYearDisplay.textContent = `${months[month]} ${year}`;

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('h-20', 'p-1', 'text-right');
            calendarGrid.appendChild(emptyCell);
        }

        // Create calendar days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('h-20', 'p-1', 'text-right', 'calendar-day', 'cursor-pointer', 'border', 'border-gray-200', 'relative', 'rounded-lg', 'transition-all', 'duration-200');

            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            const dayOfWeek = date.getDay();
            
            dayCell.dataset.date = dateString;
            dayCell.dataset.dayOfWeek = dayOfWeek;

            // Add day of week label
            const dayLabel = document.createElement('div');
            dayLabel.classList.add('text-xs', 'text-gray-500', 'absolute', 'top-1', 'left-2');
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayLabel.textContent = days[dayOfWeek];
            dayCell.appendChild(dayLabel);

            // Add click handler for date selection
            dayCell.addEventListener('click', function() {
                document.querySelectorAll('.calendar-day').forEach(d => {
                    d.classList.remove('selected');
                    d.classList.remove('bg-indigo-50');
                    d.classList.remove('ring-2');
                    d.classList.remove('ring-indigo-600');
                    d.classList.remove('ring-offset-2');
                });
                this.classList.add('selected', 'bg-indigo-50', 'ring-2', 'ring-indigo-600', 'ring-offset-2');
                selectedDate = dateString;
                updateDateDisplay(new Date(dateString));
            });

            // Highlight today's date
            if (date.getTime() === today.getTime()) {
                dayCell.classList.add('ring-2', 'ring-indigo-600', 'ring-offset-2', 'bg-indigo-50');
                dayCell.classList.add('selected');
                selectedDate = dateString;
                updateDateDisplay(today);
            }

            // Apply weekend styling if this day is marked as a weekend day
            if (weekendDays.includes(dayOfWeek)) {
                dayCell.classList.add('bg-red-50');
            }

            // Apply holiday styling
            if (holidays[dateString]) {
                dayCell.classList.add('bg-red-50');
            }

            // Create day number container
            const dayContent = document.createElement('div');
            dayContent.classList.add('text-sm', 'font-medium', 'mt-4', 'mr-2');
            dayContent.textContent = day;
            dayCell.appendChild(dayContent);

            // Add holiday reason if exists
            if (holidays[dateString]) {
                const holidayContent = document.createElement('div');
                holidayContent.classList.add('text-xs', 'text-red-500', 'mt-1');
                holidayContent.textContent = holidays[dateString];
                dayCell.appendChild(holidayContent);
            }

            // Add admin note if exists
            if (notes[dateString]) {
                const noteContent = document.createElement('div');
                noteContent.classList.add('text-xs', 'text-blue-500', 'mt-1');
                noteContent.textContent = notes[dateString];
                dayCell.appendChild(noteContent);
            }

            // Add employee's personal note if exists and we're in employee view
            if (currentEmployeeId && personalNotes[dateString]) {
                const personalNoteContent = document.createElement('div');
                personalNoteContent.classList.add('text-xs', 'text-green-500', 'mt-1');
                personalNoteContent.textContent = `Employee note: ${personalNotes[dateString]}`;
                dayCell.appendChild(personalNoteContent);
            }

            calendarGrid.appendChild(dayCell);
        }
    }

    // Handle month navigation
    document.querySelector('.fa-chevron-left').parentElement.addEventListener('click', function() {
        currentDisplayMonth--;
        if (currentDisplayMonth < 0) {
            currentDisplayMonth = 11;
            currentDisplayYear--;
        }
        renderCalendar(currentDisplayYear, currentDisplayMonth);
    });

    document.querySelector('.fa-chevron-right').parentElement.addEventListener('click', function() {
        currentDisplayMonth++;
        if (currentDisplayMonth > 11) {
            currentDisplayMonth = 0;
            currentDisplayYear++;
        }
        renderCalendar(currentDisplayYear, currentDisplayMonth);
    });

    // Today button handler
    todayBtn.addEventListener('click', function() {
        const today = new Date();
        currentDisplayMonth = today.getMonth();
        currentDisplayYear = today.getFullYear();
        renderCalendar(currentDisplayYear, currentDisplayMonth);
    });

    document.getElementById('add-note').addEventListener('click', function() {
        hideContextMenu();
        showModal('Add Note', notes[selectedDate] || '', function(note) {
            if (note.trim()) {
                notes[selectedDate] = note;
                saveCalendarSettings();
                renderCalendar(currentDisplayYear, currentDisplayMonth);
            }
        });
    });

    document.getElementById('mark-holiday').addEventListener('click', function() {
        hideContextMenu();
        showModal('Holiday Reason', holidays[selectedDate] || '', function(reason) {
            if (reason.trim()) {
                holidays[selectedDate] = reason;
                saveCalendarSettings();
                renderCalendar(currentDisplayYear, currentDisplayMonth);
            }
        });
    });

    document.getElementById('remove-holiday').addEventListener('click', function() {
        hideContextMenu();
        if (holidays[selectedDate]) {
            delete holidays[selectedDate];
            saveCalendarSettings();
            renderCalendar(currentDisplayYear, currentDisplayMonth);
        }
    });

    document.getElementById('mark-weekend').addEventListener('click', function() {
        hideContextMenu();
        const dayCell = document.querySelector(`[data-date="${selectedDate}"]`);
        if (!dayCell) return;
        
        const dayOfWeek = Number(dayCell.dataset.dayOfWeek); // Convert to number
        
        if (!weekendDays.includes(dayOfWeek)) {
            weekendDays.push(dayOfWeek);
        } else {
            const index = weekendDays.indexOf(dayOfWeek);
            if (index > -1) {
                weekendDays.splice(index, 1);
            }
        }
        
        saveCalendarSettings();
        renderCalendar(currentDisplayYear, currentDisplayMonth);
    });
    
    // Add Global Holiday handler
    document.getElementById('add-global-holiday').addEventListener('click', function() {
        hideContextMenu();
        showModal('Global Holiday Reason', holidays[selectedDate] || '', function(reason) {
            if (reason.trim()) {
                // Save to global holidays endpoint
                fetch('/api/calendar-settings/update-global-holiday/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        date: selectedDate,
                        reason: reason
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update local state
                        holidays[selectedDate] = reason;
                        renderCalendar(currentDisplayYear, currentDisplayMonth);
                        
                        // Show success notification if possible
                        if (typeof showNotification === 'function') {
                            showNotification('Global holiday added successfully!');
                        } else {
                            alert('Global holiday added successfully!');
                        }
                    } else {
                        console.error('Error adding global holiday:', data.message);
                        alert('Failed to add global holiday: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error adding global holiday:', error);
                    alert('Failed to add global holiday. Please try again.');
                });
            }
        });
    });

    // Remove Note handler
    document.getElementById('remove-note').addEventListener('click', function() {
        hideContextMenu();
        if (notes[selectedDate]) {
            delete notes[selectedDate];
            saveCalendarSettings();
            renderCalendar(currentDisplayYear, currentDisplayMonth);
        }
    });

    // Remove Employee Note handler
    document.getElementById('remove-employee-note').addEventListener('click', function() {
        hideContextMenu();
        if (currentEmployeeId && personalNotes[selectedDate]) {
            fetch(`/api/personal-notes/delete/?employee_id=${currentEmployeeId}&date=${selectedDate}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    delete personalNotes[selectedDate];
                    renderCalendar(currentDisplayYear, currentDisplayMonth);
                } else {
                    console.error('Error removing employee note:', data.message);
                }
            })
            .catch(error => console.error('Error removing employee note:', error));
        }
    });
});