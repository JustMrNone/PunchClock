from django.db import models
from django.contrib.auth.models import User

class CalendarSettings(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    holidays = models.JSONField(default=dict)
    notes = models.JSONField(default=dict)
    weekend_days = models.JSONField(default=list)

class PersonalNote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notes = models.JSONField(default=dict)

class CompanySettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=255, default="")
