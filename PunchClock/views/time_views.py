"""Time tracking related views."""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
from ..models import TimeEntry
import json
from ..models import CalendarSettings, PersonalNote, CompanySettings, TimeEntry, Employee, ProfilePicture, Department, Export
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.models import User

__all__ = [
    'PunchTimeView',
    'GetTimeStatisticsView',
    'GetRecentActivitiesView',
    'GetEmployeeTimeEntriesView',
]

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

