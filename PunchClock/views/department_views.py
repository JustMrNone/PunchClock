"""Department related views."""
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
from ..models import Department, Employee
import json
from django.contrib.auth.models import User
__all__ = [
    'DepartmentListView',
    'DepartmentCreateView',
    'DepartmentUpdateView',
    'DepartmentDeleteView',
    'DepartmentEmployeesView',
]

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
    """View to update a department."""
    def post(self, request, department_id):
        # Implementation here
        pass

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
