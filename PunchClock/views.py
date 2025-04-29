from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.shortcuts import render
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
import json
from .models import CalendarSettings, PersonalNote, CompanySettings
# Create your views here.

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
        return render(request, 'punch/admin/admin.html')

class PunchCard(LoginRequiredMixin, View):
    def get(self, request):
        return render(request, 'punch/punchcard/punchcard.html')
    
class Welcome(View):
    def get(self, request):
        return render(request, 'punch/punchcard/welcome.html')

class AdminLogin(View):
    def get(self, request):
        return render(request, "punch/admin/adminlogin.html")

    def post(self, request):
        email_or_username = request.POST.get('email')
        password = request.POST.get('password')

        # Try authenticating with email or username
        user = authenticate(request, username=email_or_username, password=password)
        if user is None:
            try:
                user_obj = User.objects.get(email=email_or_username)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass

        if user is not None and user.is_staff:  # Ensure the user is an admin
            login(request, user)
            return HttpResponseRedirect(reverse('PunchClock:dashboard'))  # Redirect to admin dashboard
        else:
            return render(request, "punch/admin/adminlogin.html", {"error": "Invalid credentials or not an admin."})

class LoginPuch(View):
    def get(self, request):
        return render(request, 'punch/punchcard/login.html')

    def post(self, request):
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse('PunchClock:punchclock'))  # Redirect to employee dashboard
        else:
            return render(request, 'punch/punchcard/login.html', {"error": "Invalid credentials."})

class LogoutView(View):
    def get(self, request):
        logout(request)
        return HttpResponseRedirect(reverse('PunchClock:welcome'))  # Redirect to the welcome page after logout

@method_decorator(login_required, name='dispatch')
class AddEmployeeView(View):
    def post(self, request):
        full_name = request.POST.get('employee_name')
        email = request.POST.get('employee_email')
        password = request.POST.get('employee_password')
        role = request.POST.get('employee_role')

        if not all([full_name, email, password, role]):
            return JsonResponse({
                'error': 'All fields except profile picture are required.'
            }, status=400)

        try:
            user = User.objects.create_user(username=email, email=email, password=password)
            user.first_name = full_name.split(' ')[0]
            user.last_name = ' '.join(full_name.split(' ')[1:]) if ' ' in full_name else ''
            user.is_staff = True if role == 'manager' else False
            user.save()
            return JsonResponse({
                'success': 'User created successfully.'
            }, status=200)
        except Exception as e:
            return JsonResponse({
                'error': 'An unexpected error occurred while creating the user. Please try again.'
            }, status=500)

@method_decorator(login_required, name='dispatch')
class UpdateCalendarSettingsView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            holidays = data.get('holidays', {})
            notes = data.get('notes', {})
            weekend_days = [int(day) for day in data.get('weekendDays', [])]  # Convert to int to ensure proper storage

            # Get or create the user's calendar settings
            calendar_settings, created = CalendarSettings.objects.get_or_create(user=request.user)
            calendar_settings.holidays = holidays
            calendar_settings.notes = notes
            calendar_settings.weekend_days = weekend_days
            calendar_settings.save()

            return JsonResponse({'success': True, 'message': 'Calendar settings updated successfully.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetCalendarSettingsView(View):
    def get(self, request):
        try:
            calendar_settings, created = CalendarSettings.objects.get_or_create(user=request.user)
            return JsonResponse({
                'success': True,
                'holidays': calendar_settings.holidays,
                'notes': calendar_settings.notes,
                'weekendDays': calendar_settings.weekend_days
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class UpdateCalendarSettingsView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            calendar_settings, _ = CalendarSettings.objects.get_or_create(user=request.user)
            calendar_settings.holidays = data.get('holidays', [])
            calendar_settings.notes = data.get('notes', "")
            calendar_settings.weekend_days = data.get('weekendDays', [])
            calendar_settings.save()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
        

class EmployeeCalendarView(LoginRequiredMixin, View):
    def get(self, request):
        return render(request, 'punch/punchcard/empcal.html')

class GetPersonalNotesView(LoginRequiredMixin, View):
    def get(self, request):
        try:
            personal_notes, created = PersonalNote.objects.get_or_create(user=request.user)
            return JsonResponse({
                'success': True,
                'notes': personal_notes.notes
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

class UpdatePersonalNotesView(LoginRequiredMixin, View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            notes = data.get('notes', {})
            
            personal_notes, created = PersonalNote.objects.get_or_create(user=request.user)
            personal_notes.notes = notes
            personal_notes.save()

            return JsonResponse({'success': True, 'message': 'Personal notes updated successfully.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class RemoveHolidayView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            holiday_to_remove = data.get('holiday')

            if not holiday_to_remove:
                return JsonResponse({'success': False, 'message': 'No holiday specified to remove.'}, status=400)

            calendar_settings, _ = CalendarSettings.objects.get_or_create(user=request.user)
            holidays = calendar_settings.holidays

            if holiday_to_remove in holidays:
                holidays.pop(holiday_to_remove)
                calendar_settings.holidays = holidays
                calendar_settings.save()
                return JsonResponse({'success': True, 'message': 'Holiday removed successfully.'})
            else:
                return JsonResponse({'success': False, 'message': 'Holiday not found.'}, status=404)

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class UpdateCompanyNameView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            company_name = data.get('company_name', '').strip()

            if not company_name:
                return JsonResponse({'success': False, 'message': 'Company name cannot be empty.'}, status=400)

            company_settings, created = CompanySettings.objects.get_or_create(user=request.user)
            company_settings.company_name = company_name
            company_settings.save()

            return JsonResponse({'success': True, 'message': 'Company name updated successfully.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

