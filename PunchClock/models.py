from django.db import models
from django.contrib.auth.models import User
from datetime import datetime, timedelta
from django.utils import timezone

class CalendarSettings(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    holidays = models.JSONField(default=dict)
    notes = models.JSONField(default=dict)
    weekend_days = models.JSONField(default=list)

# New Department model for better organization
class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
        
    class Meta:
        ordering = ['name']

class TimeEntry(models.Model):
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='time_entries')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    entry_type = models.CharField(max_length=50, default='Regular Work Hours', 
                               choices=[('Regular Work Hours', 'Regular Work Hours'),
                                      ('Overtime', 'Overtime'),
                                      ('Meeting', 'Meeting'),
                                      ('Training', 'Training'),
                                      ('Other', 'Other')])
    status = models.CharField(max_length=20, default='pending', 
                            choices=[('pending', 'Pending'),
                                   ('approved', 'Approved'),
                                   ('rejected', 'Rejected')])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Added fields for better tracking
    session_id = models.CharField(max_length=100, null=True, blank=True, help_text="Client-side session ID to prevent manipulation")
    session_verified = models.BooleanField(default=False, help_text="Whether the session has been verified on the server")
    segment_index = models.IntegerField(default=0, help_text="Index of this segment for multi-segment workdays")

    class Meta:
        ordering = ['-date', '-start_time']

    def save(self, *args, **kwargs):
        if self.start_time and self.end_time:
            # Convert times to datetime for calculation
            start_dt = datetime.combine(self.date, self.start_time)
            end_dt = datetime.combine(self.date, self.end_time)
            
            # Handle overnight shifts
            if end_dt < start_dt:
                end_dt += timedelta(days=1)
              # Calculate duration in hours
            duration = end_dt - start_dt
            self.total_hours = round(duration.total_seconds() / 3600, 2)
        
        super().save(*args, **kwargs)
        
    @classmethod
    def get_weekly_hours(cls, employee, date=None):
        """Get total hours worked in the current week, aggregating all segments."""
        if date is None:
            date = timezone.now().date()
        
        # Get start and end of week (Monday to Sunday)
        week_start = date - timedelta(days=date.weekday())
        week_end = week_start + timedelta(days=6)
        
        entries = cls.objects.filter(
            employee=employee,
            date__range=[week_start, week_end],
            session_verified=True  # Only count verified sessions
        )
        return sum(float(entry.total_hours) for entry in entries)

    @classmethod
    def get_daily_average(cls, employee, days=30):
        """Calculate true daily average over the past X days, considering all segments."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        entries = cls.objects.filter(
            employee=employee,
            date__range=[start_date, end_date],
            session_verified=True  # Only count verified sessions
        )
        
        if not entries:
            return 0
            
        # Group by date and sum hours for each day
        date_hours = {}
        for entry in entries:
            date_str = entry.date.strftime('%Y-%m-%d')
            if date_str not in date_hours:
                date_hours[date_str] = 0
            date_hours[date_str] += float(entry.total_hours)
        
        # Calculate average using only days with entries
        working_days = len(date_hours)
        if working_days == 0:
            return 0
        
        total_hours = sum(date_hours.values())
        return round(total_hours / working_days, 2)
        
    @classmethod
    def get_today_hours(cls, employee):
        """Calculate total hours worked today across all segments."""
        today = timezone.now().date()
        
        entries = cls.objects.filter(
            employee=employee,
            date=today,
            session_verified=True  # Only count verified sessions
        )
        
        return sum(float(entry.total_hours) for entry in entries)

class PersonalNote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notes = models.JSONField(default=dict)

class CompanySettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=255, default="")
    work_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.0)
    rest_hours = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)
    company_logo = models.ImageField(upload_to='company_logos/', null=True, blank=True)
    
    @property
    def total_work_hours(self):
        """Calculate effective work hours by subtracting rest hours from work hours"""
        return max(0, self.work_hours - self.rest_hours)

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='employees')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    hire_date = models.DateField(default='2025-01-01')  # Added default value for existing records
    
    @property
    def full_name(self):
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username

class ProfilePicture(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile_picture')
    image = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile picture for {self.user.username}"

class Export(models.Model):
    admin = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    format = models.CharField(max_length=10)  # csv, json, excel, pdf
    report_type = models.CharField(max_length=20)  # productivity, attendance, etc.
    start_date = models.DateField()
    end_date = models.DateField()
    file_url = models.CharField(max_length=500)  # URL to the exported file
    
    class Meta:
        ordering = ['-created_at']
