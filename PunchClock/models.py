from django.db import models
from django.contrib.auth.models import User
from datetime import datetime, timedelta
from django.utils import timezone

class CalendarSettings(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    holidays = models.JSONField(default=dict)
    notes = models.JSONField(default=dict)
    weekend_days = models.JSONField(default=list)

class TimeEntry(models.Model):
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='time_entries')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='pending', 
                            choices=[('pending', 'Pending'),
                                   ('approved', 'Approved'),
                                   ('rejected', 'Rejected')])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
        if date is None:
            date = timezone.now().date()
        
        # Get start and end of week (Monday to Sunday)
        week_start = date - timedelta(days=date.weekday())
        week_end = week_start + timedelta(days=6)
        
        entries = cls.objects.filter(
            employee=employee,
            date__range=[week_start, week_end]
        )
        return sum(float(entry.total_hours) for entry in entries)

    @classmethod
    def get_daily_average(cls, employee, days=30):
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        entries = cls.objects.filter(
            employee=employee,
            date__range=[start_date, end_date]
        )
        
        if not entries:
            return 0
            
        total_hours = sum(float(entry.total_hours) for entry in entries)
        working_days = entries.values('date').distinct().count()
        
        return round(total_hours / working_days, 2) if working_days > 0 else 0

class PersonalNote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notes = models.JSONField(default=dict)

class CompanySettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=255, default="")

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='employees')
    department = models.CharField(max_length=100, blank=True, default="")
    hire_date = models.DateField(default='2025-01-01')  # Added default value for existing records
    
    @property
    def full_name(self):
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
