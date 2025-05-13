    // DOM elements

document.addEventListener('DOMContentLoaded', function () {
    const greetingElement = document.getElementById('greeting');
    const userInitialElement = document.getElementById('userInitial');
    const quoteElement = document.getElementById('quote');
    const authorElement = document.getElementById('author');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const startNowBtn = document.getElementById('startNowBtn');
    const endNowBtn = document.getElementById('endNowBtn');
    const totalHoursElement = document.getElementById('totalHours');
    const punchBtn = document.getElementById('punchBtn');
    const weeklyHoursElement = document.getElementById('weeklyHours');
    const dailyAverageElement = document.getElementById('dailyAverage');
    
    // Sample quotes
    const quotes = [
        {
            text: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
            author: "Winston Churchill"
        },
        {
            text: "The way to get started is to quit talking and begin doing.",
            author: "Walt Disney"
        },
        {
            text: "The future depends on what you do today.",
            author: "Mahatma Gandhi"
        },
        {
            text: "Don't watch the clock; do what it does. Keep going.",
            author: "Sam Levenson"
        }
    ];

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
        
        // Only update if input is empty or has default value
        if (!startTimeInput.value || startTimeInput.value === "09:00") {
            startTimeInput.value = currentTime;
        }
        
        if (!endTimeInput.value || endTimeInput.value === "17:00") {
            endTimeInput.value = currentTime;
        }
        
        calculateTotalHours();
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
        totalHoursElement.textContent = `${hours.toFixed(2)} hours`;
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
                    
                    // Last 4 days for recent activity
                    const fourDaysAgo = new Date();
                    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
                    fourDaysAgo.setHours(0, 0, 0, 0);
                    
                    // Filter entries for recent days
                    const recentEntries = data.entries.filter(entry => {
                        const entryDate = new Date(entry.date);
                        entryDate.setHours(0, 0, 0, 0);
                        return entryDate.getTime() >= fourDaysAgo.getTime();
                    });
                    
                    if (recentEntries.length === 0) {
                        activitiesContainer.innerHTML = `
                            <div class="p-4 text-center text-gray-500">
                                No time entries in the last 4 days.
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
                        
                        activityEl.innerHTML = `
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-full bg-${statusColor}-100 flex items-center justify-center text-${statusColor}-600 mr-3">
                                    <i class="fas ${entry.status === 'approved' ? 'fa-check' : entry.status === 'rejected' ? 'fa-times' : 'fa-clock'}"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-medium">Time ${entry.end_time ? 'submitted' : 'started'}</p>
                                    <p class="text-xs text-gray-500">${dateString}, ${createdTime}</p>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800 mr-3">
                                    ${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                </span>
                                <span class="text-sm font-medium">${parseFloat(entry.total_hours).toFixed(2)} hrs</span>
                            </div>
                        `;
                        
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

    // Punch button click handler
    punchBtn.addEventListener('click', () => {
        // Disable button and show processing state
        punchBtn.disabled = true;
        punchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
        punchBtn.classList.add('bg-indigo-800');
        punchBtn.classList.remove('hover:bg-indigo-700');
        
        // Submit the time entry
        fetch('/api/time/punch/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                start_time: startTimeInput.value,
                end_time: endTimeInput.value
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success state briefly
                punchBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Time Recorded!';
                showNotification('Time entry saved successfully!');
                
                // Reset time inputs to current time
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                startTimeInput.value = `${hours}:${minutes}`;
                endTimeInput.value = `${hours}:${minutes}`;
                
                // Update displayed stats
                calculateTotalHours();
                loadTimeStatistics();
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
    });
    
    // Event listeners for time inputs
    startTimeInput.addEventListener('change', calculateTotalHours);
    endTimeInput.addEventListener('change', calculateTotalHours);
    
    // Now buttons
    startNowBtn.addEventListener('click', () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        startTimeInput.value = `${hours}:${minutes}`;
        calculateTotalHours();
    });

    endNowBtn.addEventListener('click', () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        endTimeInput.value = `${hours}:${minutes}`;
        calculateTotalHours();
    });

    // Initialize everything
    function init() {
        setRandomQuote();
        updateCurrentTimes();
        loadTimeStatistics();
        calculateTotalHours();
        loadRecentActivities();
    }
    
    // Run initialization
    init();
    
    // Function to get CSRF cookie
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
        
        .animate-fade-in {
            animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-fade-out {
            animation: fadeOut 0.3s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
});
