# Usage Guide

This guide provides instructions on how to use the Punch Clock application and details about common operations.

## User Roles

Punch Clock has two main user roles:

1. **Administrators**: Can manage employees, view all time entries, generate reports, and configure system settings
2. **Employees**: Can clock in/out, view their time entries, manage their calendar and notes

## Employee Workflows

### Logging In

1. Navigate to the application URL
2. Enter your username and password on the login page
3. Click "Login"

### Clocking In and Out

1. From the main dashboard, click the "Punch Card" button
2. To clock in, click the "Clock In" button
3. To clock out, click the "Clock Out" button
4. Your time entries will be recorded automatically

### Viewing Your Time Entries

1. From the main dashboard, click "My Punch"
2. View a list of all your time entries
3. Filter entries by date range using the calendar controls
4. See a summary of your working hours for the selected period

### Managing Calendar Settings

1. From the main dashboard, click "Calendar"
2. Set your working days and hours
3. Mark holidays and time-off
4. Save your changes

### Adding Personal Notes

1. From the main dashboard, click "Settings"
2. Navigate to the "Notes" section
3. Add, edit, or delete personal notes
4. Click "Save" to preserve your changes

## Administrator Workflows

### Accessing the Admin Dashboard

1. Log in with an administrator account
2. Click "Admin Dashboard" from the main menu

### Adding a New Employee

1. From the admin dashboard, click "Add"
2. Enter the employee information:
   - Name
   - Email
   - Department
   - Hire date
3. Set the employee's permissions
4. Click "Create"

### Managing Team Overview

1. From the admin dashboard, click "Team Overview"
2. View all employees' attendance status
3. Filter by department or date
4. Export data as needed

### Exporting Reports

1. From the admin dashboard, click "Export"
2. Select the report type:
   - Daily attendance
   - Weekly summary
   - Monthly timesheet
3. Choose the date range
4. Select the employees or departments to include
5. Click "Generate Report"
6. Download the report in your preferred format (CSV, Excel, PDF)

### Configuring Company Settings

1. From the admin dashboard, click "Settings"
2. Set company-wide parameters:
   - Default working hours
   - Default rest hours
   - Company name
   - Time zone settings
3. Click "Save"

## CLI Commands

Punch Clock includes several management commands that can be run from the command line.

### Generate Sample Time Entries

Useful for testing or demo environments:

```bash
# Using Docker
docker-compose exec web python manage.py generate_time_entries

# Local setup
python manage.py generate_time_entries
```

### Set Exact User Statistics

Update statistics for specific users:

```bash
# Using Docker
docker-compose exec web python manage.py set_exact_stats <username> <hours>

# Local setup
python manage.py set_exact_stats <username> <hours>
```

## API Usage

If you're integrating with the Punch Clock API, please refer to the [API documentation](api/index.md) for details on endpoints and authentication.

## Troubleshooting

### Common Issues

1. **Cannot clock in/out**: Ensure your account has the correct permissions and that you're not already clocked in/out.

2. **Missing time entries**: Check your date filters to ensure you're viewing the correct date range.

3. **Admin features unavailable**: Verify that your account has administrator privileges.

### Getting Help

If you encounter issues that aren't covered in this documentation, please contact the system administrator or refer to the project's support resources.