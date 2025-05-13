"""Calendar related views."""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
import json
from django.shortcuts import render, get_object_or_404, redirect
from ..models import CalendarSettings, PersonalNote, Employee

__all__ = [
    'EmployeeCalendarView',
    'GetCalendarSettingsView',
    'UpdateCalendarSettingsView',
    'GetPersonalNotesView',
    'UpdatePersonalNotesView',
    'DeletePersonalNoteView',
    'RemoveHolidayView',
    'UpdateGlobalHolidayView'
    
    
]

class EmployeeCalendarView(LoginRequiredMixin, View):
    def get(self, request):
        return render(request, 'punch/punchcard/empcal.html')
    
    
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
