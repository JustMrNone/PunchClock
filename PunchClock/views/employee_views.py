"""Employee related views."""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
from ..models import Employee
import json
import io
import base64
import time
from django.contrib.auth.models import User
from ..models import TimeEntry, Employee, ProfilePicture, Department
from PIL import Image
from django.shortcuts import render
from django.core.files.base import ContentFile

__all__ = [
    'AddEmployeeView',
    'GetEmployeesView',
    'GetEmployeeDetailsView',
    'UserSettingsView',
]

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
