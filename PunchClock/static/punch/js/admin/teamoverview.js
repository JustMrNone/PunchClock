document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let allEmployees = [];
    let filteredEmployees = [];
    let departmentData = [];
    let currentPage = 1;
    let itemsPerPage = 5;
    let sortDirection = 'desc'; // 'asc' for ascending, 'desc' for descending
    let showAllDepartments = false; // Track whether to show all departments or just top 4

    // Load departments for the filter dropdown and get all employees
    loadDepartments();
    loadAllEmployees();
    
    // Add event listener for View All/Show Less button in department stats
    document.getElementById('view-all-departments').addEventListener('click', function() {
        showAllDepartments = !showAllDepartments; // Toggle the state
        if (window.departmentHoursData) {
            displayDepartmentStats(window.departmentHoursData, showAllDepartments);
        }
    });

    // Add event listener for department filter
    document.getElementById('department-filter').addEventListener('change', function() {
        console.log("Department filter changed to:", this.value);
        filterEmployeesByDepartment(this.value);
    });

    // Add event listener for employee search
    document.getElementById('team-employee-search').addEventListener('input', function() {
        searchEmployees(this.value);
    });

    // Add event listener for sorting by hours
    document.getElementById('sort-by-hours').addEventListener('click', function() {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        this.querySelector('i').className = sortDirection === 'asc' ? 
            'fas fa-sort-amount-up text-gray-600' : 
            'fas fa-sort-amount-down text-gray-600';
        
        sortEmployees();
    });

    // Add event listeners for pagination
    document.getElementById('prev-page').addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            displayEmployees();
        }
    });

    document.getElementById('next-page').addEventListener('click', function() {
        const maxPage = Math.ceil(filteredEmployees.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            displayEmployees();
        }
    });

    // Function to get CSRF token for POST requests
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

    // Function to load departments into the filter dropdown
    function loadDepartments() {
        fetch('/api/departments/')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.departments) {
                    departmentData = data.departments;
                    const departmentFilter = document.getElementById('department-filter');
                    
                    // Clear existing options except the first one (All Departments)
                    while (departmentFilter.options.length > 1) {
                        departmentFilter.remove(1);
                    }
                    
                    // Add department options
                    data.departments.forEach(dept => {
                        const option = document.createElement('option');
                        option.value = dept.id;
                        option.textContent = dept.name;
                        departmentFilter.appendChild(option);
                    });

                    // Load department statistics
                    loadDepartmentStatistics(data.departments);
                }
            })
            .catch(error => {
                console.error('Error loading departments:', error);
            });
    }    // Function to load all employees
    function loadAllEmployees() {
    // Get the current month's start date and today's date for month-to-date calculation
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);  // Start of first day of month
    
    const today = new Date();  // Use new Date() to ensure we get current time
    today.setHours(23, 59, 59, 999);  // End of current day
    
    // Format dates as YYYY-MM-DD
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
        
        // Debug logging
        console.log('Calculating month-to-date hours:', {
            monthStart: monthStartStr,
            today: todayStr,
            timeRange: `${monthStart.toLocaleString()} to ${today.toLocaleString()}`
        });
        
        fetch('/api/employees/get/')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.employees) {
                    // Debug log total number of employees
                    console.log(`Found ${data.employees.length} employees to process`);
                    
                    const fetchPromises = data.employees.map(emp => {
                        // Fetch all entries between start of month and today
                        const url = `/api/time/entries/${emp.id}/?start_date=${monthStartStr}&end_date=${todayStr}`;
                        console.log(`Fetching hours for ${emp.full_name}:`, url);
                        
                        return fetch(url)
                            .then(response => response.json())
                            .then(hoursData => {
                                let totalHours = 0;
                                let regularHours = 0;
                                let overtimeHours = 0;                                if (hoursData.success && hoursData.entries) {
                                    // Debug log raw entries
                                    console.log(`Raw entries for ${emp.full_name}:`, hoursData.entries);
                                    
                                    // Calculate total hours
                                    hoursData.entries.forEach(entry => {
                                        const hours = parseFloat(entry.total_hours || 0);
                                        if (isNaN(hours)) {
                                            console.warn(`Invalid hours value for entry:`, entry);
                                            return;
                                        }
                                        
                                        totalHours += hours;
                                        
                                        console.log(`Adding ${hours} hours from entry on ${entry.date}`);
                                    });
                                    
                                    // Log detailed hours breakdown
                                    console.log(`Hours calculated for ${emp.full_name}:`, {
                                        totalHours,
                                        regularHours,
                                        overtimeHours,
                                        entriesCount: hoursData.entries.length,
                                        dateRange: `${monthStartStr} to ${todayStr}`
                                    });
                                } else {
                                    console.warn(`No entries or error for ${emp.full_name}:`, hoursData);
                                }
                                
                                return {
                                    ...emp,
                                    total_hours: totalHours,
                                    regular_hours: regularHours,
                                    overtime_hours: overtimeHours
                                };
                            })
                            .catch(error => {
                                console.error(`Error fetching hours for ${emp.full_name}:`, error);
                                return {
                                    ...emp,
                                    total_hours: 0,
                                    regular_hours: 0,
                                    overtime_hours: 0
                                };
                            });
                    });

                    // Wait for all hour calculations
                    return Promise.all(fetchPromises)
                        .then(employeesWithHours => {
                            // Debug log final results
                            console.log('Final hours calculation results:', employeesWithHours.map(e => ({
                                name: e.full_name,
                                total: e.total_hours,
                                regular: e.regular_hours,
                                overtime: e.overtime_hours
                            })));
                            
                            allEmployees = employeesWithHours;
                            filteredEmployees = [...allEmployees];
                            displayEmployees();
                            // After loading employees, update department statistics
                            if (departmentData.length > 0) {
                                loadDepartmentStatistics(departmentData);
                            }
                        });
                } else {
                    console.error('Failed to fetch employees:', data);
                    throw new Error('Failed to fetch employees');
                }
            })
            .catch(error => {
                console.error('Error loading employees:', error);
                document.getElementById('no-employees-row').querySelector('td').textContent = 
                    'Error loading employee data. Please try again.';
            });
    }
      // Function to load department statistics
    function loadDepartmentStatistics(departments) {
        // Use the pre-calculated hours from loadAllEmployees
        const deptHours = {};
        let totalHours = 0;
        
        // Sum hours by department
        allEmployees.forEach(emp => {
            if (emp.department_id && emp.total_hours) {
                deptHours[emp.department_id] = (deptHours[emp.department_id] || 0) + emp.total_hours;
                totalHours += emp.total_hours;
            }
        });

        // Convert to array format for display
        const departmentHours = departments.map(dept => ({
            id: dept.id,
            name: dept.name,
            total_hours: deptHours[dept.id] || 0,
            percentage: totalHours ? ((deptHours[dept.id] || 0) / totalHours * 100) : 0
        }));

        // Store department hours data for later use
        window.departmentHoursData = departmentHours;
        displayDepartmentStats(departmentHours, showAllDepartments);
    }

    // Function to generate dummy department stats if API fails
    function generateDummyDepartmentStats(departments) {
        // Calculate hours from our employee data
        const deptHours = {};
        let totalHours = 0;
        
        // Sum hours by department
        allEmployees.forEach(emp => {
            const deptId = emp.department_id || 'unknown';
            deptHours[deptId] = (deptHours[deptId] || 0) + (emp.total_hours || 0);
            totalHours += (emp.total_hours || 0);
        });

        // Convert to array format for display
        const departmentHours = departments.map(dept => ({
            id: dept.id,
            name: dept.name,
            total_hours: deptHours[dept.id] || Math.floor(Math.random() * 100) + 30, // Fallback to random
            percentage: totalHours ? ((deptHours[dept.id] || 0) / totalHours * 100) : Math.floor(Math.random() * 40) + 10 // Fallback to random
        }));
        
        // Store department hours data for later use with the "View All" button
        window.departmentHoursData = departmentHours;
        
        // Initially display only top 4 departments
        displayDepartmentStats(departmentHours, showAllDepartments);    }
      // Function to display department statistics
    function displayDepartmentStats(departmentHours, showAll = false) {
        const container = document.getElementById('department-stats-container');
        container.innerHTML = ''; // Clear loading message

        // Colors for department bars
        const colors = ['indigo', 'green', 'yellow', 'purple', 'blue', 'red', 'pink', 'teal'];
        
        // Sort departments by hours
        const sortedDepts = [...departmentHours].sort((a, b) => b.total_hours - a.total_hours);
        
        // Determine how many departments to show
        const deptsToShow = showAll ? sortedDepts.length : Math.min(4, sortedDepts.length);
        
        // Display departments
        sortedDepts.slice(0, deptsToShow).forEach((dept, index) => {
            const colorIndex = index % colors.length;
            const color = colors[colorIndex];
            
            const deptDiv = document.createElement('div');
            deptDiv.innerHTML = `
                <div class="flex justify-between mb-1">
                    <div>
                        <span class="text-sm font-medium text-gray-700">${dept.name}</span>
                        <span class="text-xs text-gray-500 ml-2">(${dept.percentage.toFixed(1)}%)</span>
                    </div>
                    <span class="text-sm font-medium text-gray-700">${dept.total_hours.toFixed(1)}h</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-${color}-500 h-2.5 rounded-full" style="width: ${Math.min(100, dept.percentage)}%"></div>
                </div>
            `;
            container.appendChild(deptDiv);
        });

        // If no departments, show a message
        if (sortedDepts.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">No department data available</p>';
        }
        
        // Update the View All / Show Less button text
        const viewAllBtn = document.getElementById('view-all-departments');
        if (viewAllBtn) {
            viewAllBtn.textContent = showAll ? "Show Less" : "View All";
        }
    }

    // Function to filter employees by department
    function filterEmployeesByDepartment(departmentId) {
        const searchTerm = document.getElementById('team-employee-search').value.toLowerCase().trim();
        
        // If no department selected, show all employees (possibly filtered by search)
        if (!departmentId) {
            if (searchTerm) {
                // Filter by search term only
                filteredEmployees = allEmployees.filter(emp => {
                    return emp.full_name.toLowerCase().includes(searchTerm) || 
                            (emp.email && emp.email.toLowerCase().includes(searchTerm));
                });
            } else {
                // No filters at all
                filteredEmployees = [...allEmployees];
            }
        } else {
            // Filter by department
            filteredEmployees = allEmployees.filter(emp => {
                // Important: Make proper comparison of department ID
                const deptMatch = emp.department_id == departmentId;
                
                // If there's also a search term, check that too
                if (searchTerm) {
                    return deptMatch && (
                        emp.full_name.toLowerCase().includes(searchTerm) || 
                        (emp.email && emp.email.toLowerCase().includes(searchTerm))
                    );
                }
                return deptMatch;
            });
        }
        
        // Reset to first page and update display
        currentPage = 1;
        displayEmployees();
    }

    // Function to search employees
    function searchEmployees(searchTerm) {
        searchTerm = searchTerm.toLowerCase().trim();
        const departmentId = document.getElementById('department-filter').value;
        
        if (!searchTerm && !departmentId) {
            // No filters, show all employees
            filteredEmployees = [...allEmployees];
        } else {
            // Apply filters
            filteredEmployees = allEmployees.filter(emp => {
                const nameMatch = emp.full_name.toLowerCase().includes(searchTerm);
                const emailMatch = emp.email && emp.email.toLowerCase().includes(searchTerm);
                const searchMatch = !searchTerm || nameMatch || emailMatch;
                
                const deptMatch = !departmentId || emp.department_id == departmentId;
                
                return searchMatch && deptMatch;
            });
        }
        
        // Reset to first page and update display
        currentPage = 1;
        displayEmployees();
    }

    // Function to sort employees by total hours
    function sortEmployees() {
        filteredEmployees.sort((a, b) => {
            const hoursA = a.total_hours || 0;
            const hoursB = b.total_hours || 0;
            return sortDirection === 'asc' ? hoursA - hoursB : hoursB - hoursA;
        });
        
        displayEmployees();
    }

    // Function to display employees with pagination
    function displayEmployees() {
        const tableBody = document.getElementById('employee-table').querySelector('tbody');
        tableBody.innerHTML = ''; // Clear existing rows
        
        // Check if there are any employees to display
        if (filteredEmployees.length === 0) {
            const tr = document.createElement('tr');
            tr.id = 'no-employees-row';
            tr.innerHTML = `
                <td colspan="3" class="px-6 py-4 text-center text-gray-500">
                    No employees match your criteria
                </td>
            `;
            tableBody.appendChild(tr);
            
            // Update pagination info
            document.getElementById('pagination-info').textContent = 'No results to display';
            
            // Hide pagination controls
            document.getElementById('pagination-controls').style.display = 'none';
            return;
        }
        
        // Show pagination controls
        document.getElementById('pagination-controls').style.display = 'flex';
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredEmployees.length);
        const pageEmployees = filteredEmployees.slice(startIndex, endIndex);
        
        // Display current page of employees
        pageEmployees.forEach(emp => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            
            // Generate initials from name
            const nameParts = emp.full_name.split(' ');
            const initials = nameParts.map(part => part[0]).join('').toUpperCase();
            
            // Generate color for the avatar
            const colors = ['indigo', 'purple', 'blue', 'green', 'red', 'yellow', 'pink'];
            const colorIndex = emp.id % colors.length;
            const color = colors[colorIndex];
            
            // Get the department name
            let deptName = 'N/A';
            if (emp.department_id && departmentData.length > 0) {
                const dept = departmentData.find(d => d.id == emp.department_id);
                deptName = dept ? dept.name : deptName;
            } else if (emp.department) {
                deptName = emp.department;
            }

            // Format hours display
            const totalHours = (emp.total_hours || 0).toFixed(1);
            const regularHours = (emp.regular_hours || 0).toFixed(1);
            const overtimeHours = (emp.overtime_hours || 0).toFixed(1);
            
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            ${emp.profile_picture ? 
                                `<img class="h-10 w-10 rounded-full" src="${emp.profile_picture}" alt="${emp.full_name}">` :
                                `<div class="h-10 w-10 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600 font-bold">${initials}</div>`
                            }
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${emp.full_name}</div>
                            <div class="text-sm text-gray-500">${emp.email || ''}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${deptName}</td>                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm">
                        <span class="font-medium text-gray-900">${totalHours}h</span>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(tr);
        });
        
        // Update pagination info
        document.getElementById('pagination-info').textContent = 
            `Showing ${startIndex + 1} to ${endIndex} of ${filteredEmployees.length} employees`;
        
        // Update pagination controls
        updatePaginationControls();
    }

    // Function to update pagination controls
    function updatePaginationControls() {
        const maxPage = Math.ceil(filteredEmployees.length / itemsPerPage);
        const paginationControls = document.getElementById('pagination-controls');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        // Enable/disable previous and next buttons
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === maxPage;
        
        // Remove existing page buttons
        const existingPageButtons = paginationControls.querySelectorAll('.page-btn');
        existingPageButtons.forEach(btn => btn.remove());
        
        // Add page buttons
        const maxVisiblePages = 3; // Number of page buttons to show
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(maxPage, startPage + maxVisiblePages - 1);
        
        // Adjust if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Insert page buttons between prev and next
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn px-3 py-1 border border-gray-300 rounded-md text-sm font-medium 
                ${i === currentPage ? 'text-white bg-indigo-600 hover:bg-indigo-700' : 'text-gray-700 bg-white hover:bg-gray-50'}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', function() {
                currentPage = i;
                displayEmployees();
            });
            
            nextBtn.insertAdjacentElement('beforebegin', pageBtn);
        }
        
        // Add ellipsis if needed
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'page-btn px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50';
            firstPageBtn.textContent = '1';
            firstPageBtn.addEventListener('click', function() {
                currentPage = 1;
                displayEmployees();
            });
            
            const ellipsisStart = document.createElement('span');
            ellipsisStart.className = 'px-2 py-1 text-gray-500';
            ellipsisStart.textContent = '...';
            
            nextBtn.insertAdjacentElement('beforebegin', ellipsisStart);
            nextBtn.insertAdjacentElement('beforebegin', firstPageBtn);
        }
        
        if (endPage < maxPage) {
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'page-btn px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50';
            lastPageBtn.textContent = maxPage;
            lastPageBtn.addEventListener('click', function() {
                currentPage = maxPage;
                displayEmployees();
            });
            
            const ellipsisEnd = document.createElement('span');
            ellipsisEnd.className = 'px-2 py-1 text-gray-500';
            ellipsisEnd.textContent = '...';
            
            nextBtn.insertAdjacentElement('beforebegin', ellipsisEnd);
            nextBtn.insertAdjacentElement('beforebegin', lastPageBtn);
        }
    }

    // Export employee hours to CSV
    document.getElementById('export-employee-hours').addEventListener('click', function() {
        // Create CSV content
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Name,Department,Total Hours,Regular Hours,Overtime Hours,Status\n';
        
        filteredEmployees.forEach(emp => {
            // Get department name
            let deptName = 'N/A';
            if (emp.department_id && departmentData.length > 0) {
                const dept = departmentData.find(d => d.id == emp.department_id);
                deptName = dept ? dept.name : deptName;
            } else if (emp.department) {
                deptName = emp.department;
            }
            
            const row = [
                `"${emp.full_name}"`,
                `"${deptName}"`,
                (emp.total_hours || 0).toFixed(1),
                emp.regular_hours.toFixed(1),
                emp.overtime_hours.toFixed(1),
                `"${emp.status || 'Pending'}"`
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `employee-hours-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        document.body.removeChild(link);
    });
});