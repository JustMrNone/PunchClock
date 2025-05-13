document.addEventListener('DOMContentLoaded', function() {
    const additionalTimezonesContainer = document.getElementById('additional-timezones');
    const addTimezoneButton = document.getElementById('add-timezone');

    addTimezoneButton.addEventListener('click', function() {
        const currentTimezones = additionalTimezonesContainer.querySelectorAll('div[data-id]').length;
        if (currentTimezones >= 3) {
            showPopupMessage('You have reached the maximum of 3 timezones. Please remove one to add another.');
            return;
        }

        const timezoneBox = createTimezoneBox();
        additionalTimezonesContainer.appendChild(timezoneBox);
        saveTimezonesState();
    });

    function showPopupMessage(message) {
        const popup = document.createElement('div');
        popup.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg';
        popup.textContent = message;

        document.body.appendChild(popup);

        setTimeout(() => {
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 500);
        }, 3000);
    }

    function createTimezoneBox(savedTimezone = null, id = Date.now()) {
        const timezoneBox = document.createElement('div');
        timezoneBox.className = 'bg-indigo-50 rounded-lg p-4 text-center shadow-md relative mt-4';
        timezoneBox.dataset.id = id;

        const dropdown = document.createElement('select');
        dropdown.className = 'mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
        dropdown.innerHTML = `
            <option value="">Select Timezone</option>
            <option value="UTC">UTC</option>
            <option value="Europe/Stockholm">Central European Time (CET - Sweden)</option>
            <option value="Asia/Tehran">Iran Standard Time (IRST)</option>
            <option value="America/Los_Angeles">Pacific Standard Time (PST)</option>
            <option value="America/New_York">Eastern Standard Time (EST)</option>
            <option value="America/Chicago">Central Standard Time (CST)</option>
            <option value="Europe/London">Greenwich Mean Time (GMT)</option>
            <option value="Asia/Kolkata">India Standard Time (IST)</option>
            <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
            <option value="Australia/Sydney">Australian Eastern Standard Time (AEST)</option>
            <option value="Pacific/Auckland">New Zealand Standard Time (NZST)</option>
            <option value="Pacific/Honolulu">Hawaii Standard Time (HST)</option>
            <option value="America/Anchorage">Alaska Standard Time (AKST)</option>
            <option value="Europe/Moscow">Moscow Standard Time (MSK)</option>
            <option value="Africa/Johannesburg">South Africa Standard Time (SAST)</option>
        `;
        dropdown.style.marginTop = '1rem';

        const timeDisplay = document.createElement('p');
        timeDisplay.className = 'text-2xl font-bold text-indigo-600 mt-2';
        timeDisplay.textContent = '--:--';

        const timezoneName = document.createElement('h3');
        timezoneName.className = 'text-lg font-semibold text-gray-800';
        timezoneName.textContent = 'Alternate Time';

        const removeButton = document.createElement('button');
        removeButton.className = 'absolute top-2 right-2 text-red-600 hover:text-red-800';
        removeButton.textContent = '×';

        const settingsButton = document.createElement('button');
        settingsButton.className = 'absolute top-2 left-2 text-gray-600 hover:text-gray-800';
        settingsButton.textContent = '⚙';

        timezoneBox.appendChild(settingsButton);
        timezoneBox.appendChild(removeButton);
        timezoneBox.appendChild(timezoneName);
        timezoneBox.appendChild(timeDisplay);

        dropdown.addEventListener('change', function() {
            const selectedTimezone = this.value;
            if (selectedTimezone) {
                timezoneName.textContent = selectedTimezone;
                updateTime(selectedTimezone, timeDisplay);
                saveTimezonesState();
            }
        });

        settingsButton.addEventListener('click', function() {
            if (timezoneBox.contains(dropdown)) {
                timezoneBox.replaceChild(timezoneName, dropdown);
            } else {
                timezoneBox.replaceChild(dropdown, timezoneName);
                const savedTimezone = dropdown.value;
                if (savedTimezone) {
                    dropdown.value = savedTimezone;
                }
            }
        });

        removeButton.addEventListener('click', function() {
            additionalTimezonesContainer.removeChild(timezoneBox);
            saveTimezonesState();
        });

        if (savedTimezone) {
            timezoneName.textContent = savedTimezone;
            dropdown.value = savedTimezone;
            updateTime(savedTimezone, timeDisplay);
        }

        return timezoneBox;
    }

    function saveTimezonesState() {
        const timezones = [];
        additionalTimezonesContainer.querySelectorAll('div[data-id]').forEach(box => {
            const id = box.dataset.id;
            const timezone = box.querySelector('select') ? box.querySelector('select').value : box.querySelector('h3').textContent;
            if (timezone) {
                timezones.push({ id, timezone });
            }
        });
        localStorage.setItem('timezones', JSON.stringify(timezones));
    }

    function restoreTimezonesState() {
        const savedTimezones = JSON.parse(localStorage.getItem('timezones') || '[]');
        savedTimezones.forEach(({ id, timezone }) => {
            const timezoneBox = createTimezoneBox(timezone, id);
            additionalTimezonesContainer.appendChild(timezoneBox);
        });
    }

    function updateTime(timezone, element) {
        const now = new Date().toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true });
        element.textContent = now;
    }

    restoreTimezonesState();

    setInterval(function() {
        const timeDisplays = additionalTimezonesContainer.querySelectorAll('p');
        timeDisplays.forEach(display => {
            const timezone = display.previousElementSibling.textContent;
            if (timezone) {
                updateTime(timezone, display);
            }
        });
    }, 60000);
});