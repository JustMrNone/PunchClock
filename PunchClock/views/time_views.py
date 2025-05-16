"""Time tracking related views."""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
import json
from django.db.models import Max
from ..models import (
    CalendarSettings, PersonalNote, CompanySettings, TimeEntry, 
    Employee, ProfilePicture, Department, Export
)
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.models import User

__all__ = [
    'PunchTimeView',
    'GetTimeStatisticsView',
    'GetRecentActivitiesView',
    'GetEmployeeTimeEntriesView',
    'DashboardStatsView',
    'GetTodayHoursView',
    'ResetDailyTrackingView',
    'CreateTimeEntryView',
    'GetTimeEntryView',
    'UpdateTimeEntryView',
    'DeleteTimeEntryView',
]

@method_decorator(login_required, name='dispatch')
class PunchTimeView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            start_time = datetime.strptime(data.get('start_time'), '%H:%M').time()
            end_time = datetime.strptime(data.get('end_time'), '%H:%M').time() if data.get('end_time') else None
            
            # Get the entry type (Regular Work Hours is default)
            entry_type = data.get('entry_type', 'Regular Work Hours')
            
            # Get session ID for verification (prevents client-side manipulation)
            session_id = data.get('session_id')
            if not session_id:
                return JsonResponse({'success': False, 'message': 'Session ID is required'}, status=400)
                
            # Get segment index for multi-segment tracking
            segment_index = data.get('segment_index', 0)
            
            # Get or create employee record for the current user
            try:
                employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                # If the user is an admin but doesn't have an employee record, create one
                if request.user.is_staff:
                    employee = Employee.objects.create(
                        user=request.user,
                        admin=request.user,  # Admin is their own admin
                        department=Department.objects.first(),  # Use first department or create one if needed
                        hire_date=timezone.now().date()
                    )
                else:
                    # For regular users, find an admin to assign
                    admin_user = User.objects.filter(is_staff=True).first()
                    employee = Employee.objects.create(
                        user=request.user,
                        admin=admin_user,
                        department=None,
                        hire_date=timezone.now().date()
                    )
              # Create time entry with session verification
            entry = TimeEntry.objects.create(
                employee=employee,
                date=timezone.now().date(),
                start_time=start_time,
                end_time=end_time,
                entry_type=entry_type,
                status='pending',
                session_id=session_id,
                session_verified=True,  # Server-side verification
                segment_index=segment_index
            )
            
            # Make sure total_hours is calculated
            entry.save()
            
            return JsonResponse({
                'success': True,
                'entry': {
                    'id': entry.id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%I:%M %p'),
                    'end_time': entry.end_time.strftime('%I:%M %p') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'status': entry.status,
                    'created_at': entry.created_at.strftime('%I:%M %p'),
                    'segment_index': entry.segment_index,
                    'session_verified': entry.session_verified
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
              # Get today's date for debugging
            today = timezone.now().date()
            
            # Calculate weekly hours with debugging info
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=6)
            weekly_entries = TimeEntry.objects.filter(
                employee=employee,
                date__range=[week_start, week_end],
                session_verified=True
            )
            weekly_hours = sum(float(entry.total_hours) for entry in weekly_entries)
              # Get daily average with improved logic
            end_date = timezone.now().date()
            # Use last 5 working days (M-F) instead of 30 days for a more accurate average
            start_date = end_date - timedelta(days=14)  # Go back 2 weeks for calculation
            
            daily_entries = TimeEntry.objects.filter(
                employee=employee,
                date__range=[start_date, end_date],
                session_verified=True
            )
            
            # Calculate total hours for the period
            total_period_hours = sum(float(entry.total_hours) for entry in daily_entries)
            
            # Group by date to understand working patterns
            date_hours = {}
            for entry in daily_entries:
                date_str = entry.date.strftime('%Y-%m-%d')
                if date_str not in date_hours:
                    date_hours[date_str] = 0
                date_hours[date_str] += float(entry.total_hours)
            
            # Count business days (Monday to Friday) in the period for more accurate average
            business_days = 0
            current_date = start_date
            while current_date <= end_date:
                # 0=Monday, 6=Sunday
                if current_date.weekday() < 5:  # Weekday (0-4 are Monday-Friday)
                    business_days += 1
                current_date += timedelta(days=1)
            
            # Calculate daily average based on actual business days, not just days with entries
            # Use at least 1 business day even if calculated value is 0 to avoid division by zero
            working_days_count = max(business_days, 1)
            
            # Only count days with actual entries if there are any
            days_with_entries = len(date_hours)
            
            # If we have data for at least 3 days, use business days for average
            # Otherwise, use only days with entries for a more accurate short-term average
            if days_with_entries >= 3:
                daily_average = round(total_period_hours / working_days_count, 2)
            else:
                daily_average = round(total_period_hours / max(days_with_entries, 1), 2)
              # Print debug info
            print(f"Weekly range: {week_start} to {week_end}")
            print(f"Weekly entries count: {weekly_entries.count()}")
            print(f"Weekly hours: {weekly_hours}")
            print(f"Daily range: {start_date} to {end_date}")
            print(f"Days with entries: {days_with_entries}")
            print(f"Working days count: {working_days_count}")
            print(f"Daily average: {daily_average}")
            print(f"Date hours: {date_hours}")
            
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
            for entry in recent_entries:                entries_data.append({
                    'id': entry.id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%I:%M %p'),
                    'end_time': entry.end_time.strftime('%I:%M %p') if entry.end_time else None,
                    'total_hours': float(entry.total_hours) if entry.total_hours else 0,
                    'entry_type': entry.entry_type,
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
              # Get dates from query params
            start_date = request.GET.get('start_date')
            end_date = request.GET.get('end_date')
            date_param = request.GET.get('date')
            
            # If specific date is provided, use that
            if date_param:
                try:
                    entry_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                    time_entries = TimeEntry.objects.filter(
                        employee=employee,
                        date=entry_date
                    ).order_by('-created_at')
                except ValueError:
                    return JsonResponse({
                        'success': False,
                        'message': 'Invalid date format. Please use YYYY-MM-DD.'
                    }, status=400)
            # If date range is provided, use that
            elif start_date and end_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                    time_entries = TimeEntry.objects.filter(
                        employee=employee,
                        date__range=[start, end]
                    ).order_by('-created_at')
                except ValueError:
                    return JsonResponse({
                        'success': False,
                        'message': 'Invalid date format. Please use YYYY-MM-DD.'
                    }, status=400)
            # Default to today
            else:
                entry_date = timezone.now().date()
                time_entries = TimeEntry.objects.filter(
                    employee=employee,
                    date=entry_date
                ).order_by('-created_at')
            
            # Format the time entries for the response
            entries_data = []
            for entry in time_entries:                entries_data.append({
                    'id': entry.id,
                    'type': entry.entry_type,
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
class DashboardStatsView(View):
    """View for getting dashboard statistics for admin users."""
    
    def get(self, request):
        # Only allow admin users
        if not request.user.is_staff:
            return JsonResponse({
                'success': False,
                'message': 'Unauthorized access'
            }, status=403)
            
        try:
            # Count total employees managed by this admin + the admin themselves
            employees_count = Employee.objects.filter(admin=request.user).count()
            # Add 1 for the admin only if they do NOT have an Employee record
            admin_has_employee = Employee.objects.filter(user=request.user).exists()
            total_employees = employees_count + (1 if not admin_has_employee else 0)

            # Count active employees today (those with time entries today)
            today = timezone.now().date()
            managed_employees = Employee.objects.filter(admin=request.user)
            active_employees = TimeEntry.objects.filter(
                employee__in=managed_employees,
                date=today
            ).values('employee').distinct().count()
            # Do NOT add 1 for admin, since admin is already in Employee table if they exist            # Calculate average hours per employee
            avg_hours = 0
            active_employee_hours = {}
            entries = TimeEntry.objects.filter(
                employee__in=managed_employees,
                date=today
            )
            
            # Group hours by employee
            for entry in entries:
                if entry.employee_id not in active_employee_hours:
                    active_employee_hours[entry.employee_id] = 0
                active_employee_hours[entry.employee_id] += float(entry.total_hours) if entry.total_hours else 0

            # Calculate average of active employees only
            if active_employee_hours:
                total_employee_hours = sum(active_employee_hours.values())
                avg_hours = round(total_employee_hours / len(active_employee_hours), 1)

            return JsonResponse({
                'success': True,
                'total_employees': total_employees,
                'active_today': active_employees,
                'avg_hours': avg_hours
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)



@method_decorator(login_required, name='dispatch')
class GetTodayHoursView(View):
    """Returns the total hours worked today, including all segments."""
    
    def get(self, request):
        try:
            today = timezone.now().date()
            
            # Get the employee
            try:
                employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Employee record not found'}, status=404)
                
            # Get all entries for today
            entries = TimeEntry.objects.filter(
                employee=employee,
                date=today
            )
            
            # Calculate total hours for today
            total_hours = sum(float(entry.total_hours) for entry in entries)
            
            # Get entries with details for each segment
            segments = []
            for entry in entries:
                segments.append({
                    'id': entry.id,
                    'segment_index': entry.segment_index,
                    'start_time': entry.start_time.strftime('%I:%M %p'),
                    'end_time': entry.end_time.strftime('%I:%M %p') if entry.end_time else None,
                    'hours': float(entry.total_hours),
                    'status': entry.status
                })
            
            # Sort segments by index
            segments.sort(key=lambda s: s['segment_index'])
            
            return JsonResponse({
                'success': True,
                'total_hours': total_hours,
                'segments': segments,
                'segments_count': len(segments)
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)


@method_decorator(login_required, name='dispatch')
class ResetDailyTrackingView(View):
    """Resets the daily tracking while preserving statistical data."""
    
    def post(self, request):
        try:
            # This doesn't delete the data, it just marks the current session as complete
            data = json.loads(request.body)
            
            # Get session ID
            session_id = data.get('session_id')
            if not session_id:
                return JsonResponse({'success': False, 'message': 'Session ID is required'}, status=400)
                
            # Get the employee
            try:
                employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Employee record not found'}, status=404)
              # Get the next segment index for new sessions
            today = timezone.now().date()
            max_segment = TimeEntry.objects.filter(
                employee=employee,
                date=today
            ).aggregate(Max('segment_index'))['segment_index__max'] or 0
            
            next_segment_index = max_segment + 1
            
            return JsonResponse({
                'success': True,
                'message': 'Daily tracking reset successful',
                'next_segment_index': next_segment_index
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)


# TimeEntry CRUD endpoints

@method_decorator(login_required, name='dispatch')
class CreateTimeEntryView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            
            # Required fields
            date_str = data.get('date')
            start_time_str = data.get('start_time')
            
            # Optional fields with defaults
            end_time_str = data.get('end_time')
            entry_type = data.get('entry_type', 'Regular Work Hours')
            employee_id = data.get('employee_id')
            
            # Validate required fields
            if not date_str or not start_time_str:
                return JsonResponse({
                    'success': False, 
                    'message': 'Date and start time are required'
                }, status=400)
            
            # Parse the date and time
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                start_time = datetime.strptime(start_time_str, '%H:%M').time()
                end_time = datetime.strptime(end_time_str, '%H:%M').time() if end_time_str else None
            except ValueError:
                return JsonResponse({
                    'success': False, 
                    'message': 'Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time.'
                }, status=400)
            
            # Get the employee
            if employee_id and request.user.is_staff:
                # Admin creating entry for an employee
                try:
                    employee = Employee.objects.get(id=employee_id)
                except Employee.DoesNotExist:
                    return JsonResponse({
                        'success': False, 
                        'message': f'Employee with ID {employee_id} not found'
                    }, status=404)
            else:
                # User creating entry for themselves
                try:
                    employee = Employee.objects.get(user=request.user)
                except Employee.DoesNotExist:
                    # If no employee record, create one
                    if request.user.is_staff:
                        employee = Employee.objects.create(
                            user=request.user,
                            admin=request.user,  # Admin is their own admin
                            department=Department.objects.first(),  # Use first department or create one
                            hire_date=timezone.now().date()
                        )
                    else:
                        # Regular employee should have an admin
                        admin_user = User.objects.filter(is_staff=True).first()
                        employee = Employee.objects.create(
                            user=request.user,
                            admin=admin_user,
                            department=Department.objects.first(),
                            hire_date=timezone.now().date()
                        )
            
            # Create the time entry
            entry = TimeEntry.objects.create(
                employee=employee,
                date=date_obj,
                start_time=start_time,
                end_time=end_time,
                entry_type=entry_type,
                status='pending',  # Default status
                session_id=data.get('session_id', f"manual-{timezone.now().timestamp()}"),
                session_verified=True,  # Manual entries are verified by default
                segment_index=data.get('segment_index', 0)
            )
            
            # Make sure total_hours is calculated
            entry.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Time entry created successfully',
                'entry': {
                    'id': entry.id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%H:%M'),
                    'end_time': entry.end_time.strftime('%H:%M') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'entry_type': entry.entry_type,
                    'status': entry.status,
                    'created_at': entry.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'segment_index': entry.segment_index
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)


@method_decorator(login_required, name='dispatch')
class GetTimeEntryView(View):
    def get(self, request, entry_id):
        try:
            # Get the entry
            try:
                entry = TimeEntry.objects.get(id=entry_id)
            except TimeEntry.DoesNotExist:
                return JsonResponse({
                    'success': False, 
                    'message': f'Time entry with ID {entry_id} not found'
                }, status=404)
            
            # Check if user has permission to view this entry
            user = request.user
            if entry.employee.user != user and not user.is_staff and entry.employee.admin != user:
                return JsonResponse({
                    'success': False, 
                    'message': 'You do not have permission to view this time entry'
                }, status=403)
            
            # Return the entry data
            return JsonResponse({
                'success': True,
                'entry': {
                    'id': entry.id,
                    'employee_id': entry.employee.id,
                    'employee_name': entry.employee.full_name,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%H:%M'),
                    'end_time': entry.end_time.strftime('%H:%M') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'entry_type': entry.entry_type,
                    'status': entry.status,
                    'created_at': entry.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'updated_at': entry.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'segment_index': entry.segment_index
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)


@method_decorator(login_required, name='dispatch')
class UpdateTimeEntryView(View):
    def put(self, request, entry_id):
        try:
            data = json.loads(request.body)
            
            # Get the entry
            try:
                entry = TimeEntry.objects.get(id=entry_id)
            except TimeEntry.DoesNotExist:
                return JsonResponse({
                    'success': False, 
                    'message': f'Time entry with ID {entry_id} not found'
                }, status=404)
            
            # Check if user has permission to update this entry
            user = request.user
            if entry.employee.user != user and not user.is_staff and entry.employee.admin != user:
                return JsonResponse({
                    'success': False, 
                    'message': 'You do not have permission to update this time entry'
                }, status=403)
            
            # Update the fields if provided
            if 'date' in data:
                try:
                    entry.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
                except ValueError:
                    return JsonResponse({
                        'success': False, 
                        'message': 'Invalid date format. Use YYYY-MM-DD.'
                    }, status=400)
            
            if 'start_time' in data:
                try:
                    entry.start_time = datetime.strptime(data['start_time'], '%H:%M').time()
                except ValueError:
                    return JsonResponse({
                        'success': False, 
                        'message': 'Invalid time format. Use HH:MM.'
                    }, status=400)
            
            if 'end_time' in data:
                if data['end_time']:
                    try:
                        entry.end_time = datetime.strptime(data['end_time'], '%H:%M').time()
                    except ValueError:
                        return JsonResponse({
                            'success': False, 
                            'message': 'Invalid time format. Use HH:MM.'
                        }, status=400)
                else:
                    entry.end_time = None
            
            if 'entry_type' in data:
                entry.entry_type = data['entry_type']
            
            if 'status' in data and request.user.is_staff:
                # Only staff can update status
                entry.status = data['status']
            
            if 'segment_index' in data:
                entry.segment_index = data['segment_index']
            
            # Save the entry to recalculate total hours
            entry.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Time entry updated successfully',
                'entry': {
                    'id': entry.id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'start_time': entry.start_time.strftime('%H:%M'),
                    'end_time': entry.end_time.strftime('%H:%M') if entry.end_time else None,
                    'total_hours': float(entry.total_hours),
                    'entry_type': entry.entry_type,
                    'status': entry.status,
                    'updated_at': entry.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'segment_index': entry.segment_index
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # Support for POST method for browsers that don't support PUT
    def post(self, request, entry_id):
        return self.put(request, entry_id)


@method_decorator(login_required, name='dispatch')
class DeleteTimeEntryView(View):
    def delete(self, request, entry_id):
        try:
            # Get the entry
            try:
                entry = TimeEntry.objects.get(id=entry_id)
            except TimeEntry.DoesNotExist:
                return JsonResponse({
                    'success': False, 
                    'message': f'Time entry with ID {entry_id} not found'
                }, status=404)
            
            # Check if user has permission to delete this entry
            user = request.user
            if entry.employee.user != user and not user.is_staff and entry.employee.admin != user:
                return JsonResponse({
                    'success': False, 
                    'message': 'You do not have permission to delete this time entry'
                }, status=403)
            
            # Store entry info for confirmation
            entry_info = {
                'id': entry.id,
                'date': entry.date.strftime('%Y-%m-%d'),
                'start_time': entry.start_time.strftime('%H:%M'),
                'end_time': entry.end_time.strftime('%H:%M') if entry.end_time else None,
                'total_hours': float(entry.total_hours)
            }
            
            # Delete the entry
            entry.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Time entry deleted successfully',
                'deleted_entry': entry_info
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    # Support for POST method for browsers that don't support DELETE
    def post(self, request, entry_id):
        return self.delete(request, entry_id)

