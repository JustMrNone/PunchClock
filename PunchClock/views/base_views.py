"""Base views for the PunchClock application."""
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.shortcuts import render, redirect
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.models import User
from ..models import Employee, CompanySettings, ProfilePicture

__all__ = ['Welcome', 'Admin', 'PunchCard']

class Welcome(View):
    def get(self, request):
        return render(request, 'punch/punchcard/welcome.html')


class Admin(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        if not self.request.user.is_staff:
            return False  # Non-admin users will fail the test
        return True

    def handle_no_permission(self):
        if self.request.user.is_authenticated:
            return HttpResponseRedirect(reverse('PunchClock:punchclock'))  # Redirect normal users to punch clock
        return super().handle_no_permission()  # Default behavior for unauthenticated users

    def get(self, request):
        # Fetch company name for the settings template
        company_name = ""
        try:
            company_settings, created = CompanySettings.objects.get_or_create(user=request.user)
            company_name = company_settings.company_name
        except Exception:
            pass  # Silently continue if there's an issue fetching company settings
            
        return render(request, 'punch/admin/admin.html', {'company_name': company_name})

class PunchCard(LoginRequiredMixin, View):
    def get(self, request):
        context = {}
        try:
            # Try to get existing employee record
            employee = Employee.objects.get(user=request.user)
            context['display_name'] = employee.full_name
            context['initials'] = ''.join(x[0].upper() for x in employee.full_name.split()) if employee.full_name else employee.user.username[:2].upper()
        except Employee.DoesNotExist:
            # Create employee record if none exists
            if request.user.is_staff:
                # For admin users who don't have an employee record
                employee = Employee.objects.create(
                    user=request.user,
                    admin=request.user,  # Admin is their own admin
                    department="Management",
                    hire_date=timezone.now().date()
                )
            else:
                # For regular employees
                admin_user = User.objects.filter(is_staff=True).first()
                if not admin_user:
                    admin_user = request.user
                    request.user.is_staff = True
                    request.user.save()
                
                employee = Employee.objects.create(
                    user=request.user,
                    admin=admin_user,
                    department='',
                    hire_date=timezone.now().date()
                )
            
            context['display_name'] = employee.full_name
            context['initials'] = ''.join(x[0].upper() for x in employee.full_name.split()) if employee.full_name else employee.user.username[:2].upper()
        
        # Get profile picture information
        try:
            profile_pic = ProfilePicture.objects.filter(user=request.user).first()
            if profile_pic and profile_pic.image and profile_pic.image.name:
                context['has_profile_pic'] = True
                context['profile_pic_url'] = request.build_absolute_uri(profile_pic.image.url)
            else:
                context['has_profile_pic'] = False
        except Exception as e:
            print(f"Error getting profile picture: {e}")
            context['has_profile_pic'] = False
            
        return render(request, 'punch/punchcard/punchcard.html', context)
    