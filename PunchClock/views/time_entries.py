"""Profile picture related views."""
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
from ..models import Employee

from ..models import TimeEntry, Employee, Department
from django.utils import timezone
from django.contrib.auth.models import User
import json
from datetime import datetime, timedelta
__all__ = [
    'GetTodayTimeEntriesView', 
    'GetTodayTimeEntriesView',
    'UpdateTimeEntryStatusView',
    'ClearTimeEntriesView',
    'UndoClearTimeEntriesView',
    'GetEmployeeStatsView',
    'GetActiveEmployeesView',
    'ApproveAllTimeEntriesView'
]

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
                    'start_time': entry.start_time.strftime('%H:%M'),
                    'end_time': entry.end_time.strftime('%H:%M') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'status': entry.status,
                    'entry_type': entry.entry_type,  # Ensure this is included
                    'created_at': entry.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'timestamp': entry.created_at.strftime('%Y-%m-%d %H:%M:%S')
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
