from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.shortcuts import render, get_object_or_404
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.utils import timezone
import json
from datetime import datetime, timedelta
from datetime import time as dt_time  # Rename the datetime.time import
import time  # Keep the time module import
from .models import CalendarSettings, PersonalNote, CompanySettings, TimeEntry, Employee, ProfilePicture, Department
# Import additional libraries for image handling
from PIL import Image
import io
import base64
import os
import re
from django.core.files.base import ContentFile
from django.db.models import Count

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
    
class Welcome(View):
    def get(self, request):
        return render(request, 'punch/punchcard/welcome.html')

class AdminLogin(View):
    def get(self, request):
        if request.user.is_authenticated and request.user.is_staff:
            return HttpResponseRedirect(reverse('PunchClock:dashboard'))
        return render(request, "punch/admin/adminlogin.html")

    def post(self, request):
        email_or_username = request.POST.get('email')
        password = request.POST.get('password')

        # Try authenticating with email
        user = authenticate(request, username=email_or_username, password=password)
        if user is None:
            try:
                # Try finding user by email if initial authentication failed
                user_obj = User.objects.get(email=email_or_username)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass

        if user is not None:
            # Check if there are any staff users
            if not User.objects.filter(is_staff=True).exists():
                # If no staff users exist, make this user staff
                user.is_staff = True
                user.save()
            
            # After potential promotion, check if user is staff
            if user.is_staff:
                login(request, user)
                return HttpResponseRedirect(reverse('PunchClock:dashboard'))
            else:
                return render(request, "punch/admin/adminlogin.html", {
                    "error": "You do not have admin privileges. Please log in as an employee instead."
                })
        else:
            return render(request, "punch/admin/adminlogin.html", {
                "error": "Invalid email or password. Please try again."
            })

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
        department_id = request.POST.get('employee_department')
        hire_date = request.POST.get('employee_hire_date')
        profile_picture = request.POST.get('profile_picture')

        if not all([full_name, email, password, role, hire_date]):
            return JsonResponse({
                'success': False,
                'error': 'All required fields must be filled out.'
            }, status=400)

        try:
            # Get department if provided
            department = None
            if department_id:
                try:
                    department = Department.objects.get(id=department_id)
                except Department.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Selected department does not exist.'
                    }, status=400)
            
            # Create the user account
            user = User.objects.create_user(username=email, email=email, password=password)
            user.first_name = full_name.split(' ')[0]
            user.last_name = ' '.join(full_name.split(' ')[1:]) if ' ' in full_name else ''
            user.is_staff = True if role == 'manager' else False
            user.save()
            
            # Create the employee record linked to the admin user
            if role != 'manager':
                Employee.objects.create(
                    user=user,
                    admin=request.user,
                    department=department,
                    hire_date=hire_date
                )

            # Handle profile picture if provided
            if profile_picture:
                try:
                    # Parse the base64 data
                    if profile_picture.startswith('data:image'):
                        format, imgstr = profile_picture.split(';base64,')
                        ext = format.split('/')[-1]
                    else:
                        imgstr = profile_picture
                        ext = 'png'

                    # Decode the base64 string
                    data = base64.b64decode(imgstr)
                    
                    # Open the image using PIL
                    img = Image.open(io.BytesIO(data))
                    
                    # Resize to 256x256
                    img = img.resize((256, 256), Image.LANCZOS)
                    
                    # Save the image to a bytes buffer
                    buffer = io.BytesIO()
                    img.save(buffer, format=ext.upper())
                    buffer.seek(0)
                    
                    # Create a filename with username and timestamp
                    timestamp = int(time.time())
                    filename = f"{user.username}_profile_{timestamp}.{ext}"
                    
                    # Save to database
                    profile_pic = ProfilePicture.objects.create(user=user)
                    profile_pic.image.save(filename, ContentFile(buffer.getvalue()), save=True)
                except Exception as e:
                    print(f"Error saving profile picture: {e}")
                    # Continue even if profile picture fails
                    pass
            
            return JsonResponse({
                'success': True,
                'message': 'User created successfully.'
            }, status=200)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'{str(e)}'
            }, status=500)

@method_decorator(login_required, name='dispatch')
class UpdateCalendarSettingsView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            holidays = data.get('holidays', {})
            notes = data.get('notes', {})
            weekend_days = [int(day) for day in data.get('weekendDays', [])]  # Convert to int to ensure proper storage

            # Check if employee_id is provided (for admin users updating employee calendars)
            employee_id = request.GET.get('employee_id')
            
            if employee_id and request.user.is_staff:
                # Admin updating an employee's calendar settings
                try:
                    employee = Employee.objects.get(id=employee_id, admin=request.user)
                    calendar_settings, created = CalendarSettings.objects.get_or_create(user=employee.user)
                except Employee.DoesNotExist:
                    return JsonResponse({'success': False, 'message': 'Employee not found or not authorized'}, status=404)
            else:
                # User updating their own calendar settings
                calendar_settings, created = CalendarSettings.objects.get_or_create(user=request.user)
                
            # Update the settings
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
            # Check if employee_id is provided (for admin users viewing employee calendars)
            employee_id = request.GET.get('employee_id')
            
            if employee_id and request.user.is_staff:
                # Admin requesting an employee's calendar settings
                try:
                    employee = Employee.objects.get(id=employee_id, admin=request.user)
                    calendar_settings, created = CalendarSettings.objects.get_or_create(user=employee.user)
                except Employee.DoesNotExist:
                    return JsonResponse({'success': False, 'message': 'Employee not found or not authorized'}, status=404)
            else:
                # User requesting their own calendar settings
                calendar_settings, created = CalendarSettings.objects.get_or_create(user=request.user)
                
            return JsonResponse({
                'success': True,
                'holidays': calendar_settings.holidays,
                'notes': calendar_settings.notes,
                'weekendDays': calendar_settings.weekend_days
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

class EmployeeCalendarView(LoginRequiredMixin, View):
    def get(self, request):
        return render(request, 'punch/punchcard/empcal.html')

class GetPersonalNotesView(LoginRequiredMixin, View):
    def get(self, request):
        try:
            # Check if employee_id is provided (for admin users viewing employee calendars)
            employee_id = request.GET.get('employee_id')
            
            if employee_id and request.user.is_staff:
                # Admin requesting an employee's personal notes
                try:
                    employee = Employee.objects.get(id=employee_id, admin=request.user)
                    personal_notes, created = PersonalNote.objects.get_or_create(user=employee.user)
                except Employee.DoesNotExist:
                    return JsonResponse({'success': False, 'message': 'Employee not found or not authorized'}, status=404)
            else:
                # User requesting their own personal notes
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

class DeletePersonalNoteView(LoginRequiredMixin, View):
    def post(self, request):
        try:
            employee_id = request.GET.get('employee_id')
            date = request.GET.get('date')
            
            if not date:
                return JsonResponse({'success': False, 'message': 'Date parameter is required'}, status=400)
            
            if employee_id and request.user.is_staff:
                # Admin deleting an employee's note
                try:
                    employee = Employee.objects.get(id=employee_id, admin=request.user)
                    personal_notes = PersonalNote.objects.get(user=employee.user)
                except Employee.DoesNotExist:
                    return JsonResponse({'success': False, 'message': 'Employee not found or not authorized'}, status=404)
                except PersonalNote.DoesNotExist:
                    return JsonResponse({'success': False, 'message': 'No notes found'}, status=404)
            else:
                # User deleting their own note
                try:
                    personal_notes = PersonalNote.objects.get(user=request.user)
                except PersonalNote.DoesNotExist:
                    return JsonResponse({'success': False, 'message': 'No notes found'}, status=404)
            
            # Remove the note for the specific date
            notes = personal_notes.notes
            if date in notes:
                del notes[date]
                personal_notes.notes = notes
                personal_notes.save()
                
            return JsonResponse({
                'success': True,
                'message': 'Note deleted successfully'
            })
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

@method_decorator(login_required, name='dispatch')
class GetCompanySettingsView(View):
    def get(self, request):
        try:
            company_settings, created = CompanySettings.objects.get_or_create(user=request.user)
            
            return JsonResponse({
                'success': True,
                'company_name': company_settings.company_name,
                'work_hours': company_settings.work_hours,
                'rest_hours': company_settings.rest_hours,
                'total_work_hours': float(company_settings.total_work_hours)
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class UpdateCompanySettingsView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            work_hours = data.get('work_hours', 0)
            rest_hours = data.get('rest_hours', 0)

            company_settings, created = CompanySettings.objects.get_or_create(user=request.user)
            company_settings.work_hours = work_hours
            company_settings.rest_hours = rest_hours
            company_settings.save()

            return JsonResponse({
                'success': True,
                'message': 'Company settings updated successfully.',
                'total_work_hours': float(company_settings.total_work_hours)
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetEmployeesView(View):
    def get(self, request):
        try:
            # Get all employees managed by this admin
            employees = Employee.objects.filter(admin=request.user).select_related('user', 'department')
            
            employees_data = [{
                'id': employee.id,
                'user_id': employee.user.id,
                'full_name': employee.full_name,
                'email': employee.user.email,
                'department_id': employee.department.id if employee.department else None,
                'department': employee.department.name if employee.department else 'N/A'
            } for employee in employees]
            
            return JsonResponse({
                'success': True,
                'employees': employees_data
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)

@method_decorator(login_required, name='dispatch')
class GetEmployeeDetailsView(View):
    def get(self, request, employee_id):
        try:
            # Get the specific employee managed by this admin with department info
            employee = Employee.objects.select_related('user', 'department').get(id=employee_id)
            
            # Get department data
            if employee.department:
                department_data = {
                    'id': employee.department.id,
                    'name': employee.department.name
                }
            else:
                department_data = 'N/A'
            
            # Get employee statistics
            weekly_hours = TimeEntry.get_weekly_hours(employee)
            daily_average = TimeEntry.get_daily_average(employee)
            
            # Format statistics (round to 1 decimal place)
            weekly_hours_formatted = round(float(weekly_hours), 1) if weekly_hours is not None else 0
            daily_average_formatted = round(float(daily_average), 1) if daily_average is not None else 0
            
            return JsonResponse({
                'success': True,
                'employee': {
                    'id': employee.id,
                    'user_id': employee.user.id,
                    'full_name': employee.full_name,
                    'email': employee.user.email,
                    'department': department_data,
                    'weekly_hours': weekly_hours_formatted,
                    'daily_average': daily_average_formatted
                }
            })
        except Employee.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'Employee not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)

@method_decorator(login_required, name='dispatch')
class PunchTimeView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            start_time = datetime.strptime(data.get('start_time'), '%H:%M').time()
            end_time = datetime.strptime(data.get('end_time'), '%H:%M').time() if data.get('end_time') else None
            
            # Get or create employee record for the current user
            try:
                employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                # If the user is an admin but doesn't have an employee record, create one
                if request.user.is_staff:
                    employee = Employee.objects.create(
                        user=request.user,
                        admin=request.user,  # Admin is their own admin
                        department="Management",
                        hire_date=timezone.now().date()
                    )
                else:
                    # For regular users, find an admin to assign
                    admin_user = User.objects.filter(is_staff=True).first()
                    employee = Employee.objects.create(
                        user=request.user,
                        admin=admin_user,
                        department="",
                        hire_date=timezone.now().date()
                    )
            
            # Create time entry
            entry = TimeEntry.objects.create(
                employee=employee,
                date=timezone.now().date(),
                start_time=start_time,
                end_time=end_time,
                status='pending'
            )
            
            # Make sure total_hours is calculated
            entry.save()
            
            return JsonResponse({
                'success': True,
                'entry': {
                    'id': entry.id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%I:%M %p'),  # Changed to 12-hour format
                    'end_time': entry.end_time.strftime('%I:%M %p') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'status': entry.status,
                    'created_at': entry.created_at.strftime('%I:%M %p')
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetTimeStatisticsView(View):
    def get(self, request, employee_id=None):
        try:
            if employee_id:
                # Admin viewing employee stats
                employee = Employee.objects.get(id=employee_id)
                if employee.admin != request.user:
                    return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=403)
            else:
                # Get or create an employee record for the current user
                try:
                    employee = Employee.objects.get(user=request.user)
                except Employee.DoesNotExist:
                    # If admin without employee record, create one
                    if request.user.is_staff:
                        employee = Employee.objects.create(
                            user=request.user,
                            admin=request.user,  # Admin is their own admin
                            department="Management",
                            hire_date=timezone.now().date()
                        )
                    else:
                        # Regular employee should have an admin
                        admin_user = User.objects.filter(is_staff=True).first()
                        employee = Employee.objects.create(
                            user=request.user,
                            admin=admin_user,
                            department="",
                            hire_date=timezone.now().date()
                        )
            
            weekly_hours = TimeEntry.get_weekly_hours(employee)
            daily_average = TimeEntry.get_daily_average(employee)
            
            return JsonResponse({
                'success': True,
                'statistics': {
                    'weekly_hours': weekly_hours,
                    'daily_average': daily_average
                }
            })
        except Employee.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Employee not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetRecentActivitiesView(View):
    def get(self, request):
        try:
            # Get the current employee
            employee = Employee.objects.get(user=request.user)
            
            # Get entries from the last 4 days
            four_days_ago = timezone.now().date() - timedelta(days=4)
            recent_entries = TimeEntry.objects.filter(
                employee=employee,
                date__gte=four_days_ago
            ).order_by('-created_at')[:10]  # Limit to 10 most recent entries
            
            entries_data = []
            for entry in recent_entries:
                entries_data.append({
                    'id': entry.id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%I:%M %p'),
                    'end_time': entry.end_time.strftime('%I:%M %p') if entry.end_time else None,
                    'total_hours': float(entry.total_hours) if entry.total_hours else 0,
                    'status': entry.status,
                    'created_at': entry.created_at.strftime('%Y-%m-%d %I:%M %p')
                })
            
            return JsonResponse({
                'success': True,
                'entries': entries_data
            })
        except Employee.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Employee not found'}, status=404)
        except Exception as e:
            print(f"Error in GetRecentActivitiesView: {e}")  # Debug log
            import traceback
            traceback.print_exc()  # Print detailed error for debugging
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetTodayTimeEntriesView(View):
    def get(self, request):
        try:
            # Get today's date
            today = timezone.now().date()
            
            if request.user.is_staff:
                # Check if admin has an employee record
                try:
                    admin_employee = Employee.objects.get(user=request.user)
                except Employee.DoesNotExist:
                    # Create employee record for admin
                    department = None
                    try:
                        department = Department.objects.get(name="Management")
                    except Department.DoesNotExist:
                        department = Department.objects.create(name="Management")
                    
                    admin_employee = Employee.objects.create(
                        user=request.user,
                        admin=request.user,
                        department=department,
                        hire_date=timezone.now().date()
                    )
                
                # Get entries for both managed employees and admin's own entries
                employees = list(Employee.objects.filter(admin=request.user))
                # Include admin's own employee record
                if admin_employee not in employees:
                    employees.append(admin_employee)
                    
                time_entries = TimeEntry.objects.filter(
                    employee__in=employees,
                    date=today
                ).select_related('employee', 'employee__department')
            else:
                # For regular employees
                try:
                    employee = Employee.objects.get(user=request.user)
                except Employee.DoesNotExist:
                    admin_user = User.objects.filter(is_staff=True).first()
                    employee = Employee.objects.create(
                        user=request.user,
                        admin=admin_user,
                        department=None,
                        hire_date=timezone.now().date()
                    )
                
                time_entries = TimeEntry.objects.filter(
                    employee=employee,
                    date=today
                ).select_related('employee', 'employee__department')
            
            entries_data = []
            for entry in time_entries:
                department_name = entry.employee.department.name if entry.employee.department else 'N/A'
                entries_data.append({
                    'id': entry.id,
                    'employee_id': entry.employee.id,
                    'employee_name': entry.employee.full_name,
                    'department': department_name,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%I:%M %p'),
                    'end_time': entry.end_time.strftime('%I:%M %p') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'status': entry.status,
                    'created_at': entry.created_at.strftime('%I:%M %p'),
                    'timestamp': entry.created_at.strftime('%I:%M %p')
                })
            
            return JsonResponse({
                'success': True,
                'entries': entries_data
            })
        except Exception as e:
            print(f"Error in GetTodayTimeEntriesView: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class UpdateTimeEntryStatusView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            entry_id = data.get('entry_id')
            status = data.get('status')
            
            if not entry_id or not status:
                return JsonResponse({
                    'success': False,
                    'message': 'Entry ID and status are required'
                }, status=400)
            
            if status not in ['pending', 'approved', 'rejected']:
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid status. Must be one of: pending, approved, rejected'
                }, status=400)
            
            # Get the time entry
            time_entry = TimeEntry.objects.get(id=entry_id)
            
            # Check if the user has permission to update this entry
            if request.user.is_staff:
                # Admin users can update entries for their employees
                if time_entry.employee.admin != request.user:
                    return JsonResponse({
                        'success': False,
                        'message': 'You do not have permission to update this entry'
                    }, status=403)
            else:
                # Regular employees can only update their own entries
                employee = Employee.objects.get(user=request.user)
                if time_entry.employee != employee:
                    return JsonResponse({
                        'success': False,
                        'message': 'You do not have permission to update this entry'
                    }, status=403)
            
            # Update the status
            time_entry.status = status
            time_entry.save()
            
            return JsonResponse({
                'success': True,
                'entry': {
                    'id': time_entry.id,
                    'status': time_entry.status
                }
            })
        except TimeEntry.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'Time entry not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class ApproveAllTimeEntriesView(View):
    def post(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can approve all time entries'
                }, status=403)
            
            # Get today's date
            today = timezone.now().date()
            
            # Get all pending time entries for today from employees managed by this admin
            pending_entries = TimeEntry.objects.filter(
                employee__admin=request.user,
                date=today,
                status='pending'
            )
            
            # Count entries before updating
            count = pending_entries.count()
            
            # Update all entries to 'approved'
            pending_entries.update(status='approved')
            
            return JsonResponse({
                'success': True,
                'count': count,
                'message': f'Successfully approved {count} time entries'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class ClearTimeEntriesView(View):
    def post(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can clear time entries'
                }, status=403)
            
            data = json.loads(request.body)
            employee_id = data.get('employee_id')
            today = timezone.now().date()
            
            if employee_id:
                employee = Employee.objects.get(id=employee_id)
                if employee.admin != request.user:
                    return JsonResponse({
                        'success': False,
                        'message': 'You do not have permission to clear entries for this employee'
                    }, status=403)
                entries_to_clear = TimeEntry.objects.filter(employee=employee, date=today)
            else:
                entries_to_clear = TimeEntry.objects.filter(employee__admin=request.user, date=today)
            
            # Store entries in session for undo functionality
            entries_data = []
            for entry in entries_to_clear:
                entries_data.append({
                    'employee_id': entry.employee_id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%H:%M'),
                    'end_time': entry.end_time.strftime('%H:%M') if entry.end_time else None,
                    'status': entry.status
                })
            
            # Store in session instead of cache for Docker compatibility
            request.session['cleared_entries'] = entries_data
            
            count = entries_to_clear.count()
            entries_to_clear.delete()
            
            return JsonResponse({
                'success': True,
                'count': count,
                'message': f'Successfully cleared {count} time entries'
            })
        except Employee.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Employee not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class UndoClearTimeEntriesView(View):
    def post(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can undo clear operations'
                }, status=403)
            
            # Get the entries from session
            entries_data = request.session.get('cleared_entries')
            
            if not entries_data:
                return JsonResponse({
                    'success': False,
                    'message': 'No recently cleared entries found to restore'
                }, status=404)
            
            # Restore the entries
            restored_count = 0
            for entry_data in entries_data:
                try:
                    employee = Employee.objects.get(id=entry_data['employee_id'])
                    
                    # Skip if employee is not managed by this admin
                    if employee.admin != request.user:
                        continue
                    
                    date = datetime.strptime(entry_data['date'], '%Y-%m-%d').date()
                    start_time = datetime.strptime(entry_data['start_time'], '%H:%M').time()
                    end_time = datetime.strptime(entry_data['end_time'], '%H:%M').time() if entry_data['end_time'] else None
                    
                    TimeEntry.objects.create(
                        employee=employee,
                        date=date,
                        start_time=start_time,
                        end_time=end_time,
                        status=entry_data['status']
                    )
                    
                    restored_count += 1
                except Exception as inner_e:
                    print(f"Error restoring entry: {inner_e}")
                    continue
            
            # Clear the session data after restoration
            if 'cleared_entries' in request.session:
                del request.session['cleared_entries']
            
            return JsonResponse({
                'success': True,
                'count': restored_count,
                'message': f'Successfully restored {restored_count} time entries'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetEmployeeStatsView(View):
    def get(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can view employee statistics'
                }, status=403)
            
            # Get today's date
            today = timezone.now().date()
            
            # Get all employees managed by this admin
            total_employees = Employee.objects.filter(admin=request.user).count()
            
            # Debug: Count all employees in the system
            all_employees_count = Employee.objects.all().count()
            
            # Get active employees (those who have submitted time entries today)
            active_employees = Employee.objects.filter(
                admin=request.user,
                timeentry__date=today
            ).distinct().count()
            
            # Debug: Count all active employees regardless of admin
            all_active_count = Employee.objects.filter(
                timeentry__date=today
            ).distinct().count()
            
            # Debug: Print information about all employees in the system
            all_employees = Employee.objects.all()
            print(f"Current admin user: {request.user.username} (ID: {request.user.id})")
            print(f"Total employees in system: {all_employees_count}")
            print(f"Total employees for this admin: {total_employees}")
            print(f"Active employees (any admin): {all_active_count}")
            print(f"Active employees (this admin): {active_employees}")
            
            # Print info about each employee
            for employee in all_employees:
                print(f"Employee: {employee.full_name}, Admin: {employee.admin.username} (ID: {employee.admin.id})")
            
            # Get pending approval count
            pending_approval_count = TimeEntry.objects.filter(
                employee__admin=request.user,
                date=today,
                status='pending'
            ).count()
            
            # Calculate average hours today
            today_entries = TimeEntry.objects.filter(
                employee__admin=request.user,
                date=today
            )
            
            if today_entries.exists():
                total_hours = sum(entry.total_hours for entry in today_entries)
                avg_hours = total_hours / today_entries.count()
            else:
                avg_hours = 0
                
            return JsonResponse({
                'success': True,
                'stats': {
                    'total_employees': total_employees,
                    'active_employees': active_employees,
                    'pending_approval': pending_approval_count,
                    'avg_hours': round(avg_hours, 1)
                }
            })
        except Exception as e:
            print(f"Error in GetEmployeeStatsView: {e}")
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetActiveEmployeesView(View):
    def get(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can view active employee counts'
                }, status=403)
            
            # Get timestamp from 24 hours ago
            twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
            
            # Get count of employees who have entries that were approved in the last 24 hours
            active_employees = Employee.objects.filter(
                admin=request.user,
                time_entries__updated_at__gte=twenty_four_hours_ago,
                time_entries__status='approved'
            ).distinct().count()
            
            return JsonResponse({
                'success': True,
                'active_count': active_employees
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class UpdateGlobalHolidayView(View):
    def post(self, request):
        try:
            # Only admins can set global holidays
            if not request.user.is_staff:
                return JsonResponse({'success': False, 'message': 'Only administrators can set global holidays'}, status=403)
            
            data = json.loads(request.body)
            date = data.get('date')
            reason = data.get('reason')
            
            if not date or not reason:
                return JsonResponse({'success': False, 'message': 'Date and reason are required'}, status=400)
            
            # Get all employees managed by this admin
            employees = Employee.objects.filter(admin=request.user).select_related('user')
            
            # Add the holiday to the admin's calendar
            admin_settings, _ = CalendarSettings.objects.get_or_create(user=request.user)
            admin_settings.holidays = admin_settings.holidays or {}
            admin_settings.holidays[date] = reason
            admin_settings.save()
            
            # Add the holiday to each employee's calendar
            for employee in employees:
                emp_settings, _ = CalendarSettings.objects.get_or_create(user=employee.user)
                emp_settings.holidays = emp_settings.holidays or {}
                emp_settings.holidays[date] = reason
                emp_settings.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Holiday added to {len(employees)} employee calendars'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetEmployeeTimeEntriesView(View):
    def get(self, request, employee_id):
        try:
            # Check if the user has permission to view this employee's time entries
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False, 
                    'message': 'You do not have permission to view this employee\'s time entries'
                }, status=403)
                
            # Get the employee
            employee = Employee.objects.get(id=employee_id)
            
            # Check if the employee is managed by this admin
            if employee.admin != request.user:
                return JsonResponse({
                    'success': False,
                    'message': 'You do not have permission to view this employee\'s time entries'
                }, status=403)
            
            # Get the date from query params, default to today
            date_param = request.GET.get('date')
            if date_param:
                try:
                    # Parse the date from the query parameter
                    entry_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                except ValueError:
                    return JsonResponse({
                        'success': False,
                        'message': 'Invalid date format. Please use YYYY-MM-DD.'
                    }, status=400)
            else:
                entry_date = timezone.now().date()
            
            # Get all time entries for the employee on the specified date
            time_entries = TimeEntry.objects.filter(
                employee=employee,
                date=entry_date
            ).order_by('-created_at')
            
            # Format the time entries for the response
            entries_data = []
            for entry in time_entries:
                entries_data.append({
                    'id': entry.id,
                    'type': 'Regular Work Hours',  # Default type since it's not in the model
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%H:%M'),
                    'end_time': entry.end_time.strftime('%H:%M') if entry.end_time else None,
                    'total_hours': str(entry.total_hours),
                    'status': entry.status,
                    'notes': '',  # Default notes since it's not in the model
                    'created_at': entry.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })
            
            return JsonResponse({
                'success': True,
                'entries': entries_data,
                'count': len(entries_data)
            })
            
        except Employee.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'Employee not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=500)

@method_decorator(login_required, name='dispatch')
class ProfilePictureView(View):
    def post(self, request):
        try:
            # Get the image data from the request
            image_data = request.POST.get('image_data')
            
            if not image_data:
                return JsonResponse({'success': False, 'message': 'No image data provided.'}, status=400)
            
            # Parse the base64 data
            if image_data.startswith('data:image'):
                # Extract the actual base64 content
                format, imgstr = image_data.split(';base64,')
                ext = format.split('/')[-1]
            else:
                # If it doesn't have the data:image prefix, assume it's pure base64
                imgstr = image_data
                ext = 'png'  # Default to png format
            
            # Decode the base64 string
            data = base64.b64decode(imgstr)
            
            # Open the image using PIL
            img = Image.open(io.BytesIO(data))
            
            # Crop to square (take the smaller dimension)
            size = min(img.width, img.height)
            left = (img.width - size) // 2
            top = (img.height - size) // 2
            right = left + size
            bottom = top + size
            
            # Crop the image to a square
            img = img.crop((left, top, right, bottom))
            
            # Resize to 256x256 (or your desired size)
            img = img.resize((256, 256), Image.LANCZOS)
            
            # Save the image to a bytes buffer
            buffer = io.BytesIO()
            img.save(buffer, format=ext.upper())
            buffer.seek(0)
            
            # Create a filename with username and timestamp to avoid collisions
            import time
            timestamp = int(time.time())
            filename = f"{request.user.username}_profile_{timestamp}.{ext}"
            
            # Save to database
            profile_pic, created = ProfilePicture.objects.get_or_create(user=request.user)
            
            # If updating an existing image, delete the old one
            if profile_pic.image:
                try:
                    old_path = profile_pic.image.path
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except:
                    pass  # Skip if there's an issue with the old file
            
            # Save the new image
            profile_pic.image.save(filename, ContentFile(buffer.getvalue()), save=True)
            
            # Build absolute URL for the image
            image_url = request.build_absolute_uri(profile_pic.image.url)
            
            return JsonResponse({
                'success': True,
                'message': 'Profile picture updated successfully.',
                'image_url': image_url
            })
        except Exception as e:
            print(f"Error uploading profile picture: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
    def delete(self, request):
        try:
            # Get the user's profile picture
            profile_pic = ProfilePicture.objects.filter(user=request.user).first()
            
            if profile_pic and profile_pic.image:
                # Delete the image file
                try:
                    if os.path.exists(profile_pic.image.path):
                        os.remove(profile_pic.image.path)
                except:
                    pass  # Skip if there's an issue with the file
                
                # Clear the image field
                profile_pic.image = None
                profile_pic.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Profile picture removed successfully.'
            })
        except Exception as e:
            print(f"Error removing profile picture: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetProfilePictureView(View):
    def get(self, request):
        try:
            # Get the user's profile picture
            profile_pic = ProfilePicture.objects.filter(user=request.user).first()
            
            if profile_pic and profile_pic.image and profile_pic.image.name:
                # Generate absolute URL for the image
                image_url = request.build_absolute_uri(profile_pic.image.url)
                
                return JsonResponse({
                    'success': True,
                    'has_image': True,
                    'image_url': image_url
                })
            else:
                return JsonResponse({
                    'success': True,
                    'has_image': False,
                    'image_url': None
                })
        except Exception as e:
            print(f"Error fetching profile picture: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class EmployeeProfilePictureView(UserPassesTestMixin, View):
    """View to handle employee profile pictures (for admin users)"""
    def test_func(self):
        return self.request.user.is_staff
        
    def post(self, request):
        try:
            # Get the employee ID from request
            data = json.loads(request.body)
            employee_id = data.get('employee_id')
            image_data = data.get('image_data')
            
            if not employee_id or not image_data:
                return JsonResponse({
                    'success': False, 
                    'message': 'Employee ID and image data are required'
                }, status=400)
            
            # Verify employee belongs to this admin
            try:
                employee = Employee.objects.get(id=employee_id, admin=request.user)
            except Employee.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Employee not found or not authorized'
                }, status=404)
            
            # Parse the base64 data
            if image_data.startswith('data:image'):
                format, imgstr = image_data.split(';base64,')
                ext = format.split('/')[-1]
            else:
                imgstr = image_data
                ext = 'png'  # Default to png format
            
            # Decode the base64 string
            data = base64.b64decode(imgstr)
            
            # Open the image using PIL
            img = Image.open(io.BytesIO(data))
            
            # Crop to square (take the smaller dimension)
            size = min(img.width, img.height)
            left = (img.width - size) // 2
            top = (img.height - size) // 2
            right = left + size
            bottom = top + size
            
            # Crop the image to a square
            img = img.crop((left, top, right, bottom))
            
            # Resize to 256x256
            img = img.resize((256, 256), Image.LANCZOS)
            
            # Save the image to a bytes buffer
            buffer = io.BytesIO()
            img.save(buffer, format=ext.upper())
            buffer.seek(0)
            
            # Create a filename with username and timestamp
            timestamp = int(time.time())
            filename = f"{employee.user.username}_profile_{timestamp}.{ext}"
            
            # Save to database
            profile_pic, created = ProfilePicture.objects.get_or_create(user=employee.user)
            
            # If updating an existing image, delete the old one
            if profile_pic.image:
                try:
                    old_path = profile_pic.image.path
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except:
                    pass  # Skip if there's an issue with the old file
            
            # Save the new image
            profile_pic.image.save(filename, ContentFile(buffer.getvalue()), save=True)
            
            # Build absolute URL for the image
            image_url = request.build_absolute_uri(profile_pic.image.url)
            
            return JsonResponse({
                'success': True,
                'message': 'Employee profile picture updated successfully',
                'image_url': image_url
            })
        except Exception as e:
            print(f"Error uploading employee profile picture: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
    def delete(self, request):
        try:
            # Get the employee ID from request
            employee_id = request.GET.get('employee_id')
            
            if not employee_id:
                return JsonResponse({
                    'success': False, 
                    'message': 'Employee ID is required'
                }, status=400)
            
            # Verify employee belongs to this admin
            try:
                employee = Employee.objects.get(id=employee_id, admin=request.user)
            except Employee.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Employee not found or not authorized'
                }, status=404)
            
            # Get the profile picture
            profile_pic = ProfilePicture.objects.filter(user=employee.user).first()
            
            if profile_pic and profile_pic.image:
                # Delete the image file
                try:
                    if os.path.exists(profile_pic.image.path):
                        os.remove(profile_pic.image.path)
                except:
                    pass  # Skip if there's an issue with the file
                
                # Clear the image field
                profile_pic.image = None
                profile_pic.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Employee profile picture removed successfully'
            })
        except Exception as e:
            print(f"Error removing employee profile picture: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetEmployeeProfilePictureView(UserPassesTestMixin, View):
    """View to get an employee's profile picture (for admin users)"""
    def test_func(self):
        return self.request.user.is_staff
        
    def get(self, request, employee_id):
        try:
            # Verify employee belongs to this admin
            try:
                employee = Employee.objects.get(id=employee_id, admin=request.user)
            except Employee.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Employee not found or not authorized'
                }, status=404)
            
            # Get the profile picture
            profile_pic = ProfilePicture.objects.filter(user=employee.user).first()
            
            if profile_pic and profile_pic.image and profile_pic.image.name:
                # Generate absolute URL for the image
                image_url = request.build_absolute_uri(profile_pic.image.url)
                
                return JsonResponse({
                    'success': True,
                    'has_image': True,
                    'image_url': image_url,
                    'employee_name': employee.full_name
                })
            else:
                return JsonResponse({
                    'success': True,
                    'has_image': False,
                    'image_url': None,
                    'employee_name': employee.full_name
                })
        except Exception as e:
            print(f"Error fetching employee profile picture: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class DepartmentListView(View):
    """View to list all departments"""
    def get(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can view departments'
                }, status=403)
            
            departments = Department.objects.all()
            
            # Get employee count for each department
            department_data = []
            for dept in departments:
                employee_count = Employee.objects.filter(department=dept).count()
                department_data.append({
                    'id': dept.id,
                    'name': dept.name,
                    'description': dept.description or '',
                    'employee_count': employee_count
                })
            
            return JsonResponse({
                'success': True,
                'departments': department_data
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class DepartmentCreateView(View):
    """View to create a new department"""
    def post(self, request):
        try:
            print(f"[DEBUG] User attempting to create department: {request.user.username}")
            print(f"[DEBUG] Is staff: {request.user.is_staff}")
            print(f"[DEBUG] Total staff users: {User.objects.filter(is_staff=True).count()}")
            print(f"[DEBUG] Request headers: {request.headers}")
            print(f"[DEBUG] Request body: {request.body.decode()}")
            
            # If this is the first user in the system, make them staff
            if User.objects.count() == 1:
                print("[DEBUG] Only one user in system, promoting to staff")
                request.user.is_staff = True
                request.user.save()
                request.user.refresh_from_db()
                print(f"[DEBUG] User staff status after promotion: {request.user.is_staff}")
            
            if not request.user.is_staff:
                print(f"[DEBUG] Request denied - user is not staff")
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can create departments'
                }, status=403)
            
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description', '')
            print(f"[DEBUG] Creating department: {name}")
            
            if not name:
                return JsonResponse({
                    'success': False,
                    'message': 'Department name is required'
                }, status=400)
            
            # Check if department already exists
            if Department.objects.filter(name=name).exists():
                return JsonResponse({
                    'success': False,
                    'message': 'Department with this name already exists'
                }, status=400)
            
            # Create department
            department = Department.objects.create(
                name=name,
                description=description
            )
            print(f"[DEBUG] Department created successfully: {department.id}")
            
            return JsonResponse({
                'success': True,
                'department': {
                    'id': department.id,
                    'name': department.name,
                    'description': department.description or '',
                    'employee_count': 0
                }
            })
        except json.JSONDecodeError as e:
            print(f"[DEBUG] JSON decode error: {e}")
            return JsonResponse({
                'success': False,
                'message': 'Invalid JSON in request body'
            }, status=400)
        except Exception as e:
            print(f"[DEBUG] Error creating department: {str(e)}")
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class DepartmentUpdateView(View):
    """View to update a department"""
    def post(self, request, department_id):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can update departments'
                }, status=403)
            
            try:
                department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Department not found'
                }, status=404)
            
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description')
            
            if name is not None:
                # Check if another department with this name exists
                if Department.objects.exclude(id=department_id).filter(name=name).exists():
                    return JsonResponse({
                        'success': False,
                        'message': 'Another department with this name already exists'
                    }, status=400)
                department.name = name
            
            if description is not None:
                department.description = description
            
            department.save()
            
            employee_count = Employee.objects.filter(department=department).count()
            
            return JsonResponse({
                'success': True,
                'department': {
                    'id': department.id,
                    'name': department.name,
                    'description': department.description or '',
                    'employee_count': employee_count
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class DepartmentDeleteView(View):
    """View to delete a department"""
    def post(self, request, department_id):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can delete departments'
                }, status=403)
            
            try:
                department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Department not found'
                }, status=404)
            
            # Check if there are employees in this department
            employee_count = Employee.objects.filter(department=department).count()
            if employee_count > 0:
                return JsonResponse({
                    'success': False,
                    'message': f'Cannot delete department with {employee_count} employees. Please reassign employees first.'
                }, status=400)
            
            department.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Department deleted successfully'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class DepartmentEmployeesView(View):
    """View to get all employees in a department"""
    def get(self, request, department_id):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can view department employees'
                }, status=403)
            
            try:
                department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Department not found'
                }, status=404)
            
            employees = Employee.objects.filter(department=department, admin=request.user)
            employee_data = []
            
            for emp in employees:
                employee_data.append({
                    'id': emp.id,
                    'name': emp.full_name,
                    'email': emp.user.email,
                    'hire_date': emp.hire_date.strftime('%Y-%m-%d') if emp.hire_date else None
                })
            
            return JsonResponse({
                'success': True,
                'department': {
                    'id': department.id,
                    'name': department.name,
                    'description': department.description or '',
                },
                'employees': employee_data
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class UserSettingsView(View):
    """View for user settings page"""
    def get(self, request):
        context = {}
        # Get user profile information
        try:
            # Get profile picture information
            profile_pic = ProfilePicture.objects.filter(user=request.user).first()
            if profile_pic and profile_pic.image and profile_pic.image.name:
                context['has_profile_pic'] = True
                context['profile_pic_url'] = request.build_absolute_uri(profile_pic.image.url)
            else:
                context['has_profile_pic'] = False
                
            # Get user information
            full_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            initials = ''.join(x[0].upper() for x in full_name.split()) if full_name else request.user.username[:2].upper()
                
            context['full_name'] = full_name
            context['initials'] = initials
            context['email'] = request.user.email
            
            # Get theme preference from localStorage on client-side
            
        except Exception as e:
            print(f"Error getting user settings: {e}")
            
        return render(request, 'punch/punchcard/settingsuser.html', context)
