"""Export related views."""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib import messages
from ..models import TimeEntry, Employee, Department
from datetime import datetime, timedelta
import json, os
from django.conf import settings
from django.utils import timezone
import pdfkit
import traceback
from ..models import TimeEntry, Employee, Department, Export
import pandas as pd
import csv

__all__ = [
    'ExportReportsView',
    'ExportPreviewView',
    'ExportGenerateView',
    'ExportRecentView',
    'ExportDeleteView',
]

@method_decorator(login_required, name='dispatch')
class ExportReportsView(View):
    """View for the export reports page"""
    
    def get(self, request):
        # Check if user is staff
        if not request.user.is_staff:
            messages.error(request, "You don't have permission to access the export page.")
            return redirect('PunchClock:dashboard')
        
        return render(request, 'punch/export.html')



@method_decorator(login_required, name='dispatch')
class ExportPreviewView(View):
    def post(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can preview exports'
                }, status=403)

            # Get form data
            format = request.POST.get('format')
            group_by = request.POST.get('group_by')
            start_date = request.POST.get('start_date')
            end_date = request.POST.get('end_date')
            include_hours = request.POST.get('include_hours') == 'on'
            include_productivity = request.POST.get('include_productivity') == 'on'
            include_attendance = request.POST.get('include_attendance') == 'on'
            filter_type = request.POST.get('filter_type')
            department_id = request.POST.get('department')
            employee_id = request.POST.get('employee')
            export_all = request.POST.get('export_all_employees') == 'on'
            selected_employee_ids = request.POST.get('selected_employee_ids', '')

            # Validate dates
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid date format'
                }, status=400)

            if end_date < start_date:
                return JsonResponse({
                    'success': False,
                    'message': 'End date must be after start date'
                }, status=400)

            # Get admin's own employee record
            admin_employee = None
            try:
                admin_employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                department = Department.objects.get_or_create(name="Management")[0]
                admin_employee = Employee.objects.create(
                    user=request.user,
                    admin=request.user,
                    department=department,
                    hire_date=timezone.now().date()
                )

            # Handle employee selection based on export type
            if export_all:
                # Get all employees managed by this admin
                employees = list(Employee.objects.filter(admin=request.user))
                if admin_employee not in employees:
                    employees.append(admin_employee)
            else:
                # Get only selected employees
                if not selected_employee_ids.strip():
                    return JsonResponse({
                        'success': False,
                        'message': 'Please select at least one employee or check "Export All Employees"'
                    }, status=400)
                
                employee_ids = [int(id) for id in selected_employee_ids.split(',') if id.strip()]
                employees = list(Employee.objects.filter(id__in=employee_ids))

            # Get time entries for the selected employees
            entries = TimeEntry.objects.filter(
                date__range=[start_date, end_date],
                employee__in=employees
            ).select_related('employee', 'employee__department', 'employee__user')

            # Apply additional filters
            if filter_type == 'department' and department_id:
                entries = entries.filter(employee__department_id=department_id)
                employees = employees.filter(department_id=department_id)
            elif filter_type == 'employee' and employee_id:
                entries = entries.filter(employee_id=employee_id)
                employees = employees.filter(id=employee_id)

            # Group data
            data = []
            if group_by == 'employee':                
                for emp in employees:
                    emp_entries = entries.filter(employee=emp)
                    total_hours = 0
                    attendance_rate = 0
                    
                    if emp_entries.exists():
                        total_hours = sum(float(entry.total_hours or 0) for entry in emp_entries)
                        entry_count = emp_entries.count()
                        if entry_count > 0:
                            approved_count = emp_entries.filter(status='approved').count()
                            attendance_rate = (approved_count / entry_count) * 100
                    
                    role = 'Manager' if emp.user.is_staff else 'Employee'
                    status = 'Active' if emp_entries.exists() else 'Inactive'
                    data.append({
                        'employee': emp.full_name,
                        'role': role,
                        'department': emp.department.name if emp.department else 'N/A',
                        'total_hours': round(total_hours, 2),
                        'attendance_rate': round(attendance_rate, 1),
                        'status': status
                    })

            elif group_by == 'department':
                departments = Department.objects.filter(
                    id__in=entries.values_list('employee__department_id', flat=True)
                ).distinct()
                for dept in departments:
                    dept_entries = entries.filter(employee__department=dept)
                    total_hours = 0
                    avg_hours = 0
                    employee_count = employees.filter(department=dept).count()
                    
                    if dept_entries.exists():
                        total_hours = sum(float(entry.total_hours or 0) for entry in dept_entries)
                        if employee_count > 0:
                            avg_hours = total_hours / employee_count
                    
                    data.append({
                        'department': dept.name,
                        'employee_count': employee_count,
                        'total_hours': round(total_hours, 2),
                        'average_hours': round(avg_hours, 2)
                    })

            else:  # group by day/week/month
                date_groups = {}
                for entry in entries:
                    if group_by == 'week':
                        key = entry.date - timedelta(days=entry.date.weekday())
                    elif group_by == 'month':
                        key = entry.date.replace(day=1)
                    else:  # day
                        key = entry.date

                    if key not in date_groups:
                        date_groups[key] = {
                            'total_hours': 0,
                            'entry_count': 0,
                            'approved_count': 0
                        }
                    
                    date_groups[key]['total_hours'] += float(entry.total_hours)
                    date_groups[key]['entry_count'] += 1
                    if entry.status == 'approved':
                        date_groups[key]['approved_count'] += 1

                for date_key, stats in date_groups.items():
                    data.append({
                        'period': date_key.strftime('%Y-%m-%d'),
                        'total_hours': round(stats['total_hours'], 2),
                        'total_entries': stats['entry_count'],
                        'approval_rate': round(stats['approved_count'] / stats['entry_count'] * 100, 1) if stats['entry_count'] > 0 else 0
                    })

            return JsonResponse({
                'success': True,
                'data': data[:10]  # Return first 10 rows for preview
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)



@method_decorator(login_required, name='dispatch')
class ExportGenerateView(View):
    def post(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can generate exports'
                }, status=403)

            # Get form data
            format = request.POST.get('format')
            group_by = request.POST.get('group_by')
            start_date = request.POST.get('start_date')
            end_date = request.POST.get('end_date')
            include_hours = request.POST.get('include_hours') == 'on'
            include_productivity = request.POST.get('include_productivity') == 'on'
            include_attendance = request.POST.get('include_attendance') == 'on'
            filter_type = request.POST.get('filter_type')
            department_id = request.POST.get('department')
            employee_id = request.POST.get('employee')
            export_all = request.POST.get('export_all_employees') == 'on'
            selected_employee_ids = request.POST.get('selected_employee_ids', '')

            # Validate dates
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid date format'
                }, status=400)

            if end_date < start_date:
                return JsonResponse({
                    'success': False,
                    'message': 'End date must be after start date'
                }, status=400)

            # Get admin's own employee record
            admin_employee = None
            try:
                admin_employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                department = Department.objects.get_or_create(name="Management")[0]
                admin_employee = Employee.objects.create(
                    user=request.user,
                    admin=request.user,
                    department=department,
                    hire_date=timezone.now().date()
                )

            # Handle employee selection based on export type
            if export_all:
                # Get all employees managed by this admin
                employees = list(Employee.objects.filter(admin=request.user))
                if admin_employee not in employees:
                    employees.append(admin_employee)
            else:
                # Get only selected employees
                if not selected_employee_ids.strip():
                    return JsonResponse({
                        'success': False,
                        'message': 'Please select at least one employee or check "Export All Employees"'
                    }, status=400)
                
                employee_ids = [int(id) for id in selected_employee_ids.split(',') if id.strip()]
                employees = list(Employee.objects.filter(id__in=employee_ids))

            # Get time entries for the selected employees
            entries = TimeEntry.objects.filter(
                date__range=[start_date, end_date],
                employee__in=employees
            ).select_related('employee', 'employee__department', 'employee__user')

            # Apply additional filters if needed
            if filter_type == 'department' and department_id:
                entries = entries.filter(employee__department_id=department_id)
            elif filter_type == 'employee' and employee_id:
                entries = entries.filter(employee_id=employee_id)            # employees list is already set above to include both managed employees and admin            # Group data if needed
            data = []
            if group_by == 'employee':
                for emp in employees:
                    emp_entries = entries.filter(employee=emp)
                    total_hours = 0
                    attendance_rate = 0
                    
                    if emp_entries.exists():
                        total_hours = sum(float(entry.total_hours or 0) for entry in emp_entries)
                        entry_count = emp_entries.count()
                        if entry_count > 0:
                            approved_count = emp_entries.filter(status='approved').count()
                            attendance_rate = (approved_count / entry_count) * 100
                    
                    role = 'Manager' if emp.user.is_staff else 'Employee'
                    status = 'Active' if emp_entries.exists() else 'Inactive'
                    data.append({
                        'employee': emp.full_name,
                        'role': role,
                        'department': emp.department.name if emp.department else 'N/A',
                        'total_hours': round(total_hours, 2),
                        'attendance_rate': round(attendance_rate, 1),
                        'status': status
                    })
            elif group_by == 'department':
                departments = Department.objects.filter(
                    id__in=entries.values_list('employee__department_id', flat=True)
                ).distinct()
                for dept in departments:
                        dept_entries = entries.filter(employee__department=dept)
                        total_hours = 0
                        avg_hours = 0
                        employee_count = dept_entries.values('employee').distinct().count()
                        
                        if dept_entries.exists():
                            total_hours = sum(float(entry.total_hours or 0) for entry in dept_entries)
                            if employee_count > 0:
                                avg_hours = total_hours / employee_count
                        
                        data.append({
                            'department': dept.name,
                            'employee_count': employee_count,
                            'total_hours': round(total_hours, 2),
                            'average_hours': round(avg_hours, 2)
                        })
            else:  # group by day/week/month
                date_groups = {}
                for entry in entries:
                    if group_by == 'week':
                        key = entry.date - timedelta(days=entry.date.weekday())
                    elif group_by == 'month':
                        key = entry.date.replace(day=1)
                    else:  # day
                        key = entry.date

                    if key not in date_groups:
                        date_groups[key] = {
                            'total_hours': 0,
                            'entry_count': 0,
                            'approved_count': 0
                        }
                    
                    date_groups[key]['total_hours'] += float(entry.total_hours)
                    date_groups[key]['entry_count'] += 1
                    if entry.status == 'approved':
                        date_groups[key]['approved_count'] += 1

                for date_key, stats in date_groups.items():
                    data.append({
                        'period': date_key.strftime('%Y-%m-%d'),
                        'total_hours': round(stats['total_hours'], 2),
                        'total_entries': stats['entry_count'],
                        'approval_rate': round(stats['approved_count'] / stats['entry_count'] * 100, 1) if stats['entry_count'] > 0 else 0
                    })

            if not data:
                return JsonResponse({
                    'success': False,
                    'message': 'No data available for the selected criteria'
                }, status=400)

            # Ensure media directories exist
            export_dir = os.path.join(settings.MEDIA_ROOT, 'exports')
            os.makedirs(export_dir, exist_ok=True)
            
            # Generate unique filename
            timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
            filename = f'export_{timestamp}'
            file_ext = None
            file_path = None
            
            try:
                if format == 'pdf':
                    file_ext = '.pdf'
                    file_path = os.path.join(export_dir, f'{filename}{file_ext}')
                    
                    # Create HTML content
                    html = '''
                    <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { font-family: Arial, sans-serif; }
                                table { 
                                    border-collapse: collapse; 
                                    width: 100%; 
                                    margin-bottom: 1em;
                                }
                                th, td { 
                                    border: 1px solid #ddd; 
                                    padding: 8px; 
                                    text-align: left; 
                                }
                                th { 
                                    background-color: #f2f2f2;
                                    font-weight: bold;
                                }
                                tr:nth-child(even) { background-color: #f9f9f9; }
                            </style>
                        </head>
                        <body>
                            <h1>Export Report</h1>
                            <table>
                                <thead>
                                    <tr>
                    '''
                    
                    # Add table headers and data
                    for key in data[0].keys():
                        formatted_key = key.replace('_', ' ').title()
                        html += f'<th>{formatted_key}</th>'
                    
                    html += '''
                                    </tr>
                                </thead>
                                <tbody>
                    '''
                    
                    for row in data:
                        html += '<tr>'
                        for value in row.values():
                            html += f'<td>{value}</td>'
                        html += '</tr>'
                    
                    html += '''
                                </tbody>
                            </table>
                        </body>
                    </html>
                    '''
                    
                    # Save HTML to a temporary file
                    temp_html = os.path.join(export_dir, f'{filename}_temp.html')
                    with open(temp_html, 'w', encoding='utf-8') as f:
                        f.write(html)
                    
                    try:                        # Use the wkhtmltopdf-xvfb wrapper script that's configured in the Docker container
                        config = pdfkit.configuration(wkhtmltopdf='/usr/local/bin/wkhtmltopdf-xvfb')
                        options = {
                            'quiet': '',
                            'enable-local-file-access': None,
                            'encoding': 'UTF-8'
                        }
                        pdfkit.from_file(temp_html, file_path, configuration=config, options=options)
                    except Exception as pdf_error:
                        if os.path.exists(temp_html):
                            os.remove(temp_html)
                        raise pdf_error
                    finally:
                        # Clean up temporary HTML file
                        if os.path.exists(temp_html):
                            os.remove(temp_html)
                
                elif format == 'csv':
                    file_ext = '.csv'
                    file_path = os.path.join(export_dir, f'{filename}{file_ext}')
                    with open(file_path, 'w', newline='') as csvfile:
                        writer = csv.DictWriter(csvfile, fieldnames=data[0].keys())
                        writer.writeheader()
                        writer.writerows(data)
                    
                elif format == 'json':
                    file_ext = '.json'
                    file_path = os.path.join(export_dir, f'{filename}{file_ext}')
                    with open(file_path, 'w') as jsonfile:
                        json.dump(data, jsonfile)
                    
                elif format == 'excel':
                    file_ext = '.xlsx'
                    file_path = os.path.join(export_dir, f'{filename}{file_ext}')
                    df = pd.DataFrame(data)
                    df.to_excel(file_path, index=False)

                else:
                    return JsonResponse({
                        'success': False,
                        'message': 'Invalid export format selected'
                    }, status=400)

                # Check if file was created successfully
                if not os.path.exists(file_path):
                    raise IOError(f"Failed to create export file: {file_path}")

                # Construct the URL using the MEDIA_URL setting
                file_url = f'{settings.MEDIA_URL.rstrip("/")}/exports/{filename}{file_ext}'

                # Create export record
                export = Export.objects.create(
                    admin=request.user,
                    format=format,
                    report_type=group_by,
                    start_date=start_date,
                    end_date=end_date,
                    file_url=file_url
                )

                return JsonResponse({
                    'success': True,
                    'message': 'Export generated successfully',
                    'file_url': request.build_absolute_uri(file_url)
                })

            except IOError as e:
                # Handle file operation errors
                return JsonResponse({
                    'success': False,
                    'message': f'Error writing file: {str(e)}'
                }, status=500)
                
            except Exception as e:
                # Handle other errors in export generation
                return JsonResponse({
                    'success': False,
                    'message': f'Error generating export: {str(e)}'
                }, status=500)

        except Exception as e:
            # Handle any other errors
            print(f"Export error: {str(e)}")
            print(traceback.format_exc())
            return JsonResponse({
                'success': False,
                'message': f'Error: {str(e)}'
            }, status=400)


class ExportRecentView(View):
    def get(self, request):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can view exports'
                }, status=403)

            exports = Export.objects.filter(admin=request.user).order_by('-created_at')[:10]
            exports_data = []
            
            for export in exports:
                exports_data.append({
                    'id': export.id,
                    'format': export.format,
                    'report_type': export.report_type,
                    'start_date': export.start_date.strftime('%Y-%m-%d'),
                    'end_date': export.end_date.strftime('%Y-%m-%d'),
                    'created_at': export.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'file_url': export.file_url
                })

            return JsonResponse({
                'success': True,
                'exports': exports_data
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)

@method_decorator(login_required, name='dispatch')
class ExportDeleteView(View):
    def delete(self, request, export_id):
        try:
            if not request.user.is_staff:
                return JsonResponse({
                    'success': False,
                    'message': 'Only administrators can delete exports'
                }, status=403)

            try:
                export = Export.objects.get(id=export_id, admin=request.user)
            except Export.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Export not found'
                }, status=404)

            # Delete the actual file
            file_path = os.path.join(settings.MEDIA_ROOT, export.file_url.lstrip('/'))
            if os.path.exists(file_path):
                os.remove(file_path)

            # Delete the database record
            export.delete()

            return JsonResponse({
                'success': True,
                'message': 'Export deleted successfully'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
