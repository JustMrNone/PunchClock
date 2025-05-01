from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from PunchClock.models import Employee, TimeEntry
from datetime import datetime, timedelta, time
import random


class Command(BaseCommand):
    help = 'Generates test time entries for employees to verify statistics display'

    def add_arguments(self, parser):
        parser.add_argument(
            '--employee',
            type=int,
            default=None,
            help='ID of the specific employee to generate entries for. If not specified, generates for all employees.'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to generate entries for (default: 7)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing time entries before generating new ones'
        )
        parser.add_argument(
            '--weekly',
            type=float,
            default=None,
            help='Exact weekly hours to set (e.g., 56.2)'
        )
        parser.add_argument(
            '--daily',
            type=float,
            default=None,
            help='Exact daily average to set (e.g., 6.4)'
        )

    def handle(self, *args, **options):
        employee_id = options['employee']
        days = options['days']
        clear = options['clear']
        weekly_target = options['weekly']
        daily_target = options['daily']
        
        # Determine the employees to generate entries for
        if employee_id:
            try:
                employees = [Employee.objects.get(id=employee_id)]
                self.stdout.write(f"Generating entries for employee: {employees[0].full_name}")
            except Employee.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Employee with ID {employee_id} does not exist"))
                return
        else:
            employees = Employee.objects.all()
            self.stdout.write(f"Generating entries for {employees.count()} employees")
        
        # Clear existing entries if requested
        if clear:
            for employee in employees:
                cleared_count = TimeEntry.objects.filter(employee=employee).delete()[0]
                self.stdout.write(f"Cleared {cleared_count} existing time entries for {employee.full_name}")

        # Use exact statistics if provided
        if weekly_target is not None or daily_target is not None:
            for employee in employees:
                self._generate_exact_stats(employee, weekly_target, daily_target, days)
        else:
            # Generate random entries for each employee
            entries_created = 0
            today = timezone.now().date()
            
            for employee in employees:
                # Generate entries for the specified number of days
                for day_offset in range(days):
                    entry_date = today - timedelta(days=day_offset)
                    
                    # Skip weekends (optional)
                    if entry_date.weekday() >= 5:  # 5=Saturday, 6=Sunday
                        continue
                    
                    # Generate random start and end times
                    start_hour = random.randint(8, 10)  # Between 8:00 AM and 10:00 AM
                    start_minute = random.randint(0, 59)
                    start_time = time(hour=start_hour, minute=start_minute)
                    
                    # Work hours between 6 and 10 hours
                    work_hours = random.uniform(6.0, 10.0)
                    end_minutes = int((work_hours * 60) + start_minute)
                    end_hour = start_hour + (end_minutes // 60)
                    end_minute = end_minutes % 60
                    end_time = time(hour=end_hour, minute=end_minute)
                    
                    # Create the time entry
                    entry = TimeEntry.objects.create(
                        employee=employee,
                        date=entry_date,
                        start_time=start_time,
                        end_time=end_time,
                        status='approved'  # Mark as approved by default
                    )
                    entries_created += 1
                    
                    # Display the created entry details
                    self.stdout.write(f"Created entry for {employee.full_name} on {entry_date}: {start_time} - {end_time} ({entry.total_hours:.2f} hours)")
            
            self.stdout.write(self.style.SUCCESS(f"Successfully generated {entries_created} time entries"))

        self.stdout.write("Now you can check the 'This Week' and 'Avg. Daily' statistics in the employee view")

    def _generate_exact_stats(self, employee, weekly_target, daily_target, days):
        """Generate time entries to achieve exact weekly and daily statistics"""
        today = timezone.now().date()
        entries_created = 0
        
        # Calculate current week's days (for weekly target)
        current_week_days = []
        week_start = today - timedelta(days=today.weekday())  # Monday of current week
        for i in range(7):  # Monday to Sunday
            day = week_start + timedelta(days=i)
            if day <= today:  # Only include days up to today
                current_week_days.append(day)
        
        # For weekly target calculation
        if weekly_target is not None:
            num_days_in_week = len(current_week_days)
            # We'll distribute these hours evenly across weekdays in current week
            hours_per_day = weekly_target / num_days_in_week if num_days_in_week > 0 else weekly_target
            
            for day in current_week_days:
                # Skip weekends unless we need them for exact weekly target
                if day.weekday() >= 5:  # Weekend
                    continue
                    
                # Create entry with exact hours
                self._create_entry_with_hours(employee, day, hours_per_day)
                entries_created += 1
                
            self.stdout.write(f"Set weekly hours to {weekly_target} for {employee.full_name}")
        
        # For daily average calculation
        if daily_target is not None:
            # Use the days parameter to determine how many past days to include
            past_days = [today - timedelta(days=i) for i in range(days)]
            
            for day in past_days:
                # Skip weekends for daily average
                if day.weekday() >= 5:
                    continue
                    
                # Skip days already handled by weekly target
                if weekly_target is not None and day in current_week_days:
                    continue
                    
                # Create entry with exact hours
                self._create_entry_with_hours(employee, day, daily_target)
                entries_created += 1
                
            self.stdout.write(f"Set daily average to {daily_target} for {employee.full_name}")
            
        return entries_created

    def _create_entry_with_hours(self, employee, date, hours):
        """Create a time entry for the given date with exactly the specified hours"""
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