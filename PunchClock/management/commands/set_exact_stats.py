from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from PunchClock.models import Employee, TimeEntry
from datetime import datetime, timedelta, time


class Command(BaseCommand):
    help = 'Sets exact statistics for a specific user (6.4 daily average and 56.2 weekly hours)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=int,
            default=1,
            help='User ID to set statistics for (default: 1)'
        )

    def handle(self, *args, **options):
        user_id = options['user']
        weekly_hours = 56.2
        daily_average = 6.4
        days_for_average = 30
        
        # Get user and employee
        try:
            user = User.objects.get(id=user_id)
            employee = Employee.objects.get(user=user)
            self.stdout.write(f"Found user: {user.first_name} {user.last_name} (ID: {user.id})")
            self.stdout.write(f"Employee: {employee.full_name} (ID: {employee.id})")
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Error: User with ID {user_id} does not exist"))
            return
        except Employee.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Error: No employee record for user ID {user_id}"))
            return
        
        # Clear existing entries
        count, _ = TimeEntry.objects.filter(employee=employee).delete()
        self.stdout.write(f"Cleared {count} existing time entries for {employee.full_name}")
        
        # Set weekly hours
        self.set_weekly_hours(employee, weekly_hours)
        
        # Set daily average
        self.set_daily_average(employee, daily_average, days_for_average)
        
        self.stdout.write(self.style.SUCCESS("\nCompleted setting statistics:"))
        self.stdout.write(f"User: {user.first_name} {user.last_name} (ID: {user.id})")
        self.stdout.write(f"Employee: {employee.full_name} (ID: {employee.id})")
        self.stdout.write(f"Weekly Hours: {weekly_hours}")
        self.stdout.write(f"Daily Average: {daily_average}")
        self.stdout.write("\nYou can now check the statistics in the employee view")

    def create_entry_with_hours(self, employee, date, hours):
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
        
        self.stdout.write(f"Created entry for {employee.full_name} on {date}: {start_time} - {end_time} ({entry.total_hours:.2f} hours)")
        return entry

    def set_weekly_hours(self, employee, target_hours):
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
            self.stdout.write("Warning: No days in current week to set weekly hours")
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
            self.create_entry_with_hours(employee, day, hours_distribution[i])
        
        self.stdout.write(f"Set weekly hours to {target_hours} for {employee.full_name}")

    def set_daily_average(self, employee, target_average, days_for_average):
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
            self.stdout.write("Warning: No past days available to set daily average")
            return
        
        # We'll set the same hours for each day to achieve the average
        for day in past_days:
            self.create_entry_with_hours(employee, day, target_average)
        
        self.stdout.write(f"Set daily average to {target_average} for {employee.full_name}")