# Django Admin Interface

This document provides information about using and customizing the Django admin interface for the Punch Clock application.

## Accessing the Admin Interface

The Django admin interface is available at `/admin/` and is separate from the application's own admin dashboard:

```
http://localhost:8000/admin/
```

You must have superuser or staff privileges to access this interface.

## Available Models

The following models can be managed through the Django admin interface:

- **Users** - User accounts for both employees and administrators
- **TimeEntry** - Records of employee clock in/out events
- **Employee** - Additional employee information linked to user accounts
- **CalendarSettings** - Calendar configurations for users
- **CompanySettings** - Organization-level settings
- **PersonalNote** - User-specific notes
- **ProfilePicture** - User profile images

## Common Admin Tasks

### Creating a New User

1. Navigate to Users > Add user
2. Enter a username and password
3. Click "Save and continue editing"
4. Fill in additional user information (name, email, etc.)
5. Set appropriate permissions
6. Click "Save"

### Creating an Employee Record

1. Navigate to Employees > Add employee
2. Select an existing user
3. Fill in department information and other details
4. Click "Save"

### Viewing Time Entries

1. Navigate to Time Entries
2. Use filters to narrow down the list:
   - By date range
   - By employee
   - By status

### Bulk Actions

Django admin supports bulk actions for many models:

1. Select multiple items using checkboxes
2. Choose an action from the dropdown
3. Click "Go"

Available actions include:
- Delete selected items
- Mark entries as approved/rejected

## Customizing the Admin Interface

The Django admin interface has been customized for Punch Clock with:

### Custom List Displays

```python
# Example from admin.py
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'start_time', 'end_time', 'total_hours', 'status')
    list_filter = ('employee', 'date', 'status')
    search_fields = ('employee__user__username', 'employee__user__email')
    date_hierarchy = 'date'
```

### Custom Filters

Time entries can be filtered by date, employee, and status.

### Custom Actions

```python
# Example from admin.py
@admin.action(description="Approve selected time entries")
def approve_entries(modeladmin, request, queryset):
    queryset.update(status='approved')
```

## Adding Custom Admin Views

To add new views to the admin interface:

1. Create a view function in `views.py`
2. Register the URL in `urls.py` with the admin site
3. Add a link to the admin index page

## Security Considerations

- Django admin should not be exposed to general users
- Consider using HTTPS for production environments
- Admin users should have strong passwords
- Consider implementing two-factor authentication for admin access

## Troubleshooting

### Common Issues

1. **Cannot access admin**: Ensure your user account has `is_staff=True` and `is_superuser=True`
2. **Missing models**: Check that models are registered in `admin.py`
3. **Changes not saving**: Check for validation errors in the form

### Advanced Customization

For more advanced customization of the Django admin interface, refer to the [Django documentation](https://docs.djangoproject.com/en/stable/ref/contrib/admin/).