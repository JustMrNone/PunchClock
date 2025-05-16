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
    let globalNotes = {};
    let personalNotes = {};
    let weekendDays = [];

    // Load calendar settings and personal notes from backend
    Promise.all([
        fetch('/api/calendar-settings/get/'),
        fetch('/api/personal-notes/get/')
    ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([calendarData, personalData]) => {
        if (calendarData.success) {
            holidays = calendarData.holidays || {};
            globalNotes = calendarData.notes || {};
            weekendDays = (calendarData.weekendDays || []).map(day => Number(day)); // Convert to numbers
        }
        if (personalData.success) {
            personalNotes = personalData.notes || {};
        }
        renderCalendar(currentDisplayYear, currentDisplayMonth);
    })
    .catch(error => {
        console.error('Error loading calendar data:', error);
        renderCalendar(currentDisplayYear, currentDisplayMonth);
    });

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

    function savePersonalNote() {
        console.log('Saving personal note:', personalNotes);
        
        fetch('/api/personal-notes/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                notes: personalNotes
            })
        })
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Show success notification
                showNotification('Note saved successfully!');
            } else {
                console.error('Error saving personal note:', data.message);
                showNotification('Failed to save note!', 'error');
            }
        })
        .catch(error => {
            console.error('Error saving personal note:', error);
            showNotification('Failed to save note!', 'error');
        });
    }

    // Function to show notification
    function showNotification(message, type = 'success') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '4px';
            notification.style.color = 'white';
            notification.style.fontWeight = '500';
            notification.style.zIndex = '9999';
            notification.style.transition = 'transform 0.3s ease-out';
            document.body.appendChild(notification);
        }

        // Set color based on type
        notification.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
        notification.textContent = message;
        
        // Show notification
        notification.style.transform = 'translateY(0)';
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(100px)';
        }, 3000);
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
    function saveCalendarSettings() {
        fetch('/api/calendar-settings/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                holidays: holidays,
                notes: globalNotes,
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
    }    function renderCalendar(year, month) {
        calendarGrid.innerHTML = '';
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Update the month/year display
        const monthYearDisplay = document.querySelector('.date');
        const monthButton = document.getElementById('month-display-btn');
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        // Set the header month/year display
        monthYearDisplay.textContent = `${months[month]} ${year}`;
        
        // Update month button text - show "This Month" for current month, or month name otherwise
        const nowMonth = new Date().getMonth();
        const nowYear = new Date().getFullYear();
        if (month === nowMonth && year === nowYear) {
            monthButton.textContent = 'This Month';
            monthButton.classList.add('bg-indigo-100', 'text-indigo-700');
            monthButton.classList.remove('bg-gray-100', 'text-gray-700');
        } else {
            monthButton.textContent = months[month];
            monthButton.classList.add('bg-gray-100', 'text-gray-700');
            monthButton.classList.remove('bg-indigo-100', 'text-indigo-700');
        }

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
            
            // Apply weekend styling
            if (weekendDays.includes(dayOfWeek)) {
                dayCell.classList.add('bg-red-50');
            }
            
            // Apply holiday styling (same as weekends)
            if (holidays[dateString]) {
                dayCell.classList.add('bg-red-50');
            }

            // Create day number container
            const dayContent = document.createElement('div');
            dayContent.classList.add('text-sm', 'font-medium', 'mt-4', 'mr-2');
            dayContent.textContent = day;
            dayCell.appendChild(dayContent);

            // Add holiday indication if exists
            if (holidays[dateString]) {
                const holidayContent = document.createElement('div');
                holidayContent.classList.add('text-xs', 'text-red-500', 'mt-1');
                holidayContent.textContent = holidays[dateString];
                dayCell.appendChild(holidayContent);
            }

            // Add global note if exists
            if (globalNotes[dateString]) {
                const globalNoteContent = document.createElement('div');
                globalNoteContent.classList.add('text-xs', 'text-blue-500', 'mt-1');
                globalNoteContent.textContent = globalNotes[dateString];
                dayCell.appendChild(globalNoteContent);
            }

            // Add personal note if exists
            if (personalNotes[dateString]) {
                const personalNoteContent = document.createElement('div');
                personalNoteContent.classList.add('text-xs', 'text-green-500', 'mt-1');
                personalNoteContent.textContent = personalNotes[dateString];
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

    // Handle Today button click
    todayBtn.addEventListener('click', function() {
        const today = new Date();
        currentDisplayMonth = today.getMonth();
        currentDisplayYear = today.getFullYear();
        renderCalendar(currentDisplayYear, currentDisplayMonth);
    });

    // Month button handler - return to current month
    document.getElementById('month-display-btn').addEventListener('click', function() {
        const today = new Date();
        currentDisplayMonth = today.getMonth();
        currentDisplayYear = today.getFullYear();
        renderCalendar(currentDisplayYear, currentDisplayMonth);
    });

    // Handle personal note addition
    document.getElementById('add-personal-note').addEventListener('click', function() {
        hideContextMenu();
        showModal('Add Personal Note', personalNotes[selectedDate] || '', function(note) {
            if (note.trim()) {
                personalNotes[selectedDate] = note;
                savePersonalNote();
                renderCalendar(currentDisplayYear, currentDisplayMonth);
            }
        });
    });

    // Handle personal note removal
    document.getElementById('remove-personal-note').addEventListener('click', function() {
        hideContextMenu();
        if (personalNotes[selectedDate]) {
            delete personalNotes[selectedDate];
            savePersonalNote();
            showNotification('Note removed successfully!');
            renderCalendar(currentDisplayYear, currentDisplayMonth);
        } else {
            showNotification('No note to remove', 'error');
        }
    });

    // Initial render
    renderCalendar(currentDisplayYear, currentDisplayMonth);
});