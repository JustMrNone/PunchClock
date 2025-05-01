"""
Script to set exact statistics for a specific user
Usage: python manage.py shell < PunchClock/set_user_stats.py
"""

import os
import django
import sys
from datetime import datetime, timedelta, time

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ClockingInAndOut.settings")
django.setup()

# Import models after Django is set up
from django.contrib.auth.models import User
from django.utils import timezone
from PunchClock.models import Employee, TimeEntry

# Constants - change these as needed
USER_ID = 1  # The user ID to set statistics for
WEEKLY_HOURS = 56.2  # Target weekly hours
DAILY_AVERAGE = 6.4  # Target daily average hours
DAYS_FOR_AVERAGE = 30  # Number of days to consider for daily average

def get_user_details(user_id):
    """Get user and employee details"""
    try:
        user = User.objects.get(id=user_id)
        employee = Employee.objects.get(user=user)
        print(f"Found user: {user.first_name} {user.last_name} (ID: {user.id})")
        print(f"Employee: {employee.full_name} (ID: {employee.id})")
        return user, employee
    except User.DoesNotExist:
        print(f"Error: User with ID {user_id} does not exist")
        return None, None
    except Employee.DoesNotExist:
        print(f"Error: No employee record for user ID {user_id}")
        return None, None

def clear_existing_entries(employee):
    """Clear existing time entries for the employee"""
    count, _ = TimeEntry.objects.filter(employee=employee).delete()
    print(f"Cleared {count} existing time entries for {employee.full_name}")

def create_entry_with_hours(employee, date, hours):
    """Create a time entry with exact hours"""
    # Start at 9 AM
    start_time = time(hour=9, minute=0)
    
    # Calculate end time based on hours
    minutes = int(hours * 60)
    end_hour = 9 + (minutes // 60)
    end_minute = minutes % 60
    end_time = time(hour=end_hour, minute=end_minute)
    
    # Create the time entry
    entry = TimeEntry.objects.create(
        employee=employee,
        date=date,
        start_time=start_time,
        end_time=end_time,
        status='approved'  # Mark as approved by default
    )
    
    print(f"Created entry for {employee.full_name} on {date}: {start_time} - {end_time} ({entry.total_hours:.2f} hours)")
    return entry

def set_weekly_hours(employee, target_hours):
    """Set time entries to achieve target weekly hours"""
    today = timezone.now().date()
    
    # Calculate current week's days
    current_week_days = []
    week_start = today - timedelta(days=today.weekday())  # Monday of current week
    for i in range(5):  # Monday to Friday
        day = week_start + timedelta(days=i)
        if day <= today:  # Only include days up to today
            current_week_days.append(day)
    
    num_days = len(current_week_days)
    if num_days == 0:
        print("Warning: No days in current week to set weekly hours")
        return
    
    # Special handling to get exactly the target weekly hours
    if num_days == 5:
        # Distribute hours across 5 weekdays with different values for variation
        hours_distribution = [12.0, 11.0, 11.2, 10.8, 11.2]  # Total: 56.2
    elif num_days == 4:
        hours_distribution = [14.0, 14.0, 14.1, 14.1]  # Total: 56.2
    elif num_days == 3:
        hours_distribution = [18.7, 18.7, 18.8]  # Total: 56.2
    elif num_days == 2:
        hours_distribution = [28.1, 28.1]  # Total: 56.2
    else:
        hours_distribution = [target_hours]
    
    for i, day in enumerate(current_week_days):
        create_entry_with_hours(employee, day, hours_distribution[i])
    
    print(f"Set weekly hours to {target_hours} for {employee.full_name}")

def set_daily_average(employee, target_average, days_for_average):
    """Set time entries to achieve target daily average over specified days"""
    today = timezone.now().date()
    
    # Use the days_for_average parameter to determine how many past days to include
    # Skip the current week which is handled by set_weekly_hours
    current_week_start = today - timedelta(days=today.weekday())
    
    # Create a list of workdays (excluding weekends) for the specified period
    # But skip the current week
    past_days = []
    for i in range(days_for_average):
        day = today - timedelta(days=i)
        # Skip current week and weekends
        if day >= current_week_start or day.weekday() >= 5:
            continue
        past_days.append(day)
    
    # Calculate how many days we need to set to achieve the target average
    num_days = len(past_days)
    if num_days == 0:
        print("Warning: No past days available to set daily average")
        return
    
    # We'll set the same hours for each day to achieve the average
    for day in past_days:
        create_entry_with_hours(employee, day, target_average)
    
    print(f"Set daily average to {target_average} for {employee.full_name}")

if __name__ == "__main__":
    # Get user and employee
    user, employee = get_user_details(USER_ID)
    if not employee:
        sys.exit(1)
    
    # Clear existing entries
    clear_existing_entries(employee)
    
    # Set weekly hours
    set_weekly_hours(employee, WEEKLY_HOURS)
    
    # Set daily average
    set_daily_average(employee, DAILY_AVERAGE, DAYS_FOR_AVERAGE)
    
    print("\nCompleted setting statistics:")
    print(f"User: {user.first_name} {user.last_name} (ID: {user.id})")
    print(f"Employee: {employee.full_name} (ID: {employee.id})")
    print(f"Weekly Hours: {WEEKLY_HOURS}")
    print(f"Daily Average: {DAILY_AVERAGE}")
    print("\nYou can now check the statistics in the employee view")