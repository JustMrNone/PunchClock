from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.shortcuts import render
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.utils import timezone
import json
from datetime import datetime, time, timedelta
from .models import CalendarSettings, PersonalNote, CompanySettings, TimeEntry, Employee
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
        context = {}
        if request.user.is_staff:
            # For admin users, use their user info directly
            context['display_name'] = request.user.get_full_name() or request.user.username
            context['initials'] = ''.join(x[0].upper() for x in request.user.get_full_name().split()) if request.user.get_full_name() else request.user.username[:2].upper()
        else:
            try:
                # For regular employees
                employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                # Get the first admin user in the system to assign as the employee's admin
                admin_user = User.objects.filter(is_staff=True).first()
                if not admin_user:
                    # If no admin exists, make this user their own admin temporarily
                    admin_user = request.user
                    request.user.is_staff = True
                    request.user.save()
                
                # Create employee record with required admin field
                employee = Employee.objects.create(
                    user=request.user,
                    admin=admin_user,
                    department='',
                    hire_date=timezone.now().date()
                )
            
            context['display_name'] = employee.full_name
            context['initials'] = ''.join(x[0].upper() for x in employee.full_name.split()) if employee.full_name else employee.user.username[:2].upper()
            
        return render(request, 'punch/punchcard/punchcard.html', context)
    
class Welcome(View):
    def get(self, request):
        return render(request, 'punch/punchcard/welcome.html')

class AdminLogin(View):
    def get(self, request):
        # If user is already logged in and is staff, redirect them to the admin dashboard
        if request.user.is_authenticated and request.user.is_staff:
            return HttpResponseRedirect(reverse('PunchClock:dashboard'))
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

        if user is not None:
            if user.is_staff:  # Ensure the user is an admin
                login(request, user)
                return HttpResponseRedirect(reverse('PunchClock:dashboard'))  # Redirect to admin dashboard
            else:
                # User exists but is not an admin
                return render(request, "punch/admin/adminlogin.html", {"error": "You do not have admin privileges. Please log in as an employee instead."})
        else:
            # Invalid credentials
            return render(request, "punch/admin/adminlogin.html", {"error": "Invalid email or password. Please try again."})

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
        department = request.POST.get('employee_department')
        hire_date = request.POST.get('employee_hire_date')

        if not all([full_name, email, password, role, hire_date]):
            return JsonResponse({
                'success': False,
                'error': 'All required fields must be filled out.'
            }, status=400)

        try:
            # Create the user account
            user = User.objects.create_user(username=email, email=email, password=password)
            user.first_name = full_name.split(' ')[0]
            user.last_name = ' '.join(full_name.split(' ')[1:]) if ' ' in full_name else ''
            user.is_staff = True if role == 'manager' else False
            user.save()
            
            # Create the employee record linked to the admin user
            if role != 'manager':
                from .models import Employee
                Employee.objects.create(
                    user=user,
                    admin=request.user,
                    department=department or "",
                    hire_date=hire_date
                )
            
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

@method_decorator(login_required, name='dispatch')
class GetEmployeesView(View):
    def get(self, request):
        try:
            from .models import Employee
            # Get all employees managed by this admin
            employees = Employee.objects.filter(admin=request.user).select_related('user')
            
            employees_data = [{
                'id': employee.id,
                'user_id': employee.user.id,
                'full_name': employee.full_name,  # Changed from 'name' to 'full_name'
                'email': employee.user.email,
                'department': employee.department
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
            from .models import Employee
            # Get the specific employee managed by this admin
            employee = Employee.objects.select_related('user').get(id=employee_id)
            
            # Make sure we get the department, even if it's empty
            department = employee.department if employee.department else '--'
            
            # Debug print to check what we're sending
            print(f"Sending employee data - Name: {employee.full_name}, Department: {department}")
            
            return JsonResponse({
                'success': True,
                'employee': {
                    'id': employee.id,
                    'user_id': employee.user.id,
                    'full_name': employee.full_name,
                    'email': employee.user.email,
                    'department': department
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
            
            # Get employee record for the current user
            employee = Employee.objects.get(user=request.user)
            
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
                # Employee viewing their own stats
                employee = Employee.objects.get(user=request.user)
            
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
            employee = Employee.objects.get(user=request.user)
            # Get entries from the last 4 days only (instead of 7)
            four_days_ago = timezone.now().date() - timedelta(days=4)
            recent_entries = TimeEntry.objects.filter(
                employee=employee,
                date__gte=four_days_ago
            ).order_by('-created_at')
            
            entries_data = []
            for entry in recent_entries:
                entries_data.append({
                    'id': entry.id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%I:%M %p'),
                    'end_time': entry.end_time.strftime('%I:%M %p') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'status': entry.status,
                    'created_at': entry.created_at.strftime('%I:%M %p')
                })
            
            return JsonResponse({
                'success': True,
                'entries': entries_data
            })
        except Employee.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Employee not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@method_decorator(login_required, name='dispatch')
class GetTodayTimeEntriesView(View):
    def get(self, request):
        try:
            # Get today's date
            today = timezone.now().date()
            
            if request.user.is_staff:
                # For admin users, get all time entries for today from all their managed employees
                employees = Employee.objects.filter(admin=request.user)
                time_entries = TimeEntry.objects.filter(
                    employee__in=employees,
                    date=today
                ).select_related('employee')
            else:
                # Regular employees can only see their own time entries
                employee = Employee.objects.get(user=request.user)
                time_entries = TimeEntry.objects.filter(
                    employee=employee,
                    date=today
                )
            
            entries_data = []
            for entry in time_entries:
                entries_data.append({
                    'id': entry.id,
                    'employee_id': entry.employee.id,
                    'employee_name': entry.employee.full_name,
                    'department': entry.employee.department,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%I:%M %p'),
                    'end_time': entry.end_time.strftime('%I:%M %p') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'status': entry.status,
                    'created_at': entry.created_at.strftime('%I:%M %p')
                })
            
            return JsonResponse({
                'success': True,
                'entries': entries_data
            })
        except Exception as e:
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

