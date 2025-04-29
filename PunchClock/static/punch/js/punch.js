document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
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
    
    // Sample user data (in a real app, this would come from authentication)
    const user = {
        name: "Shabnam",
        initial: "SH"
    };
    
    // Sample quotes
    const quotes = [
        {
            text: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
            author: "Winston Churchill"
        },
        {
            text: "The only way to do great work is to love what you do.",
            author: "Steve Jobs"
        },
        {
            text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
            author: "Steve Jobs"
        },
        {
            text: "Hard work beats talent when talent doesn't work hard.",
            author: "Tim Notke"
        },
        {
            text: "The secret of getting ahead is getting started.",
            author: "Mark Twain"
        }
    ];
    
    // Initialize
    function init() {
        // Set user info
        greetingElement.textContent = `Hi, ${user.name}!`;
        userInitialElement.textContent = user.initial;
        
        // Set random quote
        setRandomQuote();
        
        // Set current time as default
        updateCurrentTimes();
        
        // Calculate initial total hours
        calculateTotalHours();
    }
    
    // Set random inspirational quote
    function setRandomQuote() {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        quoteElement.textContent = quotes[randomIndex].text;
        authorElement.textContent = `- ${quotes[randomIndex].author}`;
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
    
    // Calculate total hours between start and end time
    function calculateTotalHours() {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        
        if (!startTime || !endTime) return;
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        
        // Handle overnight shifts (end time is next day)
        if (totalMinutes < 0) {
            totalMinutes += 24 * 60;
        }
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const totalHours = hours + (minutes / 60);
        
        totalHoursElement.textContent = `${totalHours.toFixed(2)} hours`;
    }
    
    // Event listeners
    startTimeInput.addEventListener('change', calculateTotalHours);
    endTimeInput.addEventListener('change', calculateTotalHours);
    
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
    
    punchBtn.addEventListener('click', () => {
        // Animation effect
        punchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
        punchBtn.classList.add('bg-indigo-800');
        punchBtn.classList.remove('hover:bg-indigo-700');
        
        // Simulate API call
        setTimeout(() => {
            punchBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Time Recorded!';
            
            // Reset button after 2 seconds
            setTimeout(() => {
                punchBtn.innerHTML = '<i class="fas fa-fingerprint text-xl mr-3"></i> PUNCH TIME';
                punchBtn.classList.remove('bg-indigo-800');
                punchBtn.classList.add('hover:bg-indigo-700');
                
                // Show success notification
                showNotification('Time successfully recorded!');
                
                // Add to recent activity
                addRecentActivity();
                
                // Change quote for variety
                setRandomQuote();
            }, 2000);
        }, 1000);
    });
    
    // Show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center animate-fade-in';
        notification.innerHTML = `
            <i class="fas fa-check-circle mr-2"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('animate-fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }
    
    // Add recent activity
    function addRecentActivity() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        const [startHours, startMinutes] = startTimeInput.value.split(':').map(Number);
        const [endHours, endMinutes] = endTimeInput.value.split(':').map(Number);
        
        let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const totalHours = (totalMinutes / 60).toFixed(2);
        
        const activityList = document.querySelector('.space-y-4');
        const newActivity = document.createElement('div');
        newActivity.className = 'flex items-center justify-between p-3 border-b border-gray-100';
        newActivity.innerHTML = `
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                    <i class="fas fa-check"></i>
                </div>
                <div>
                    <p class="text-sm font-medium">Time submitted</p>
                    <p class="text-xs text-gray-500">Today, ${timeString}</p>
                </div>
            </div>
            <span class="text-sm font-medium">${totalHours} hours</span>
        `;
        
        activityList.insertBefore(newActivity, activityList.firstChild);
    }
    
    // Initialize the app
    init();
});