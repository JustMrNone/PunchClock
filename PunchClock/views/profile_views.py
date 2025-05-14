"""Profile picture related views."""
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
from ..models import ProfilePicture, Employee
import json, base64, io
from PIL import Image
from django.core.files.base import ContentFile
import time
import os
__all__ = [
    'ProfilePictureView',
    'GetProfilePictureView',
    'EmployeeProfilePictureView',
    'GetEmployeeProfilePictureView',
    'DeleteEmployeeProfilePictureView',
]

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
            # Handle both form data and JSON formats
            if request.content_type and 'application/json' in request.content_type:
                # JSON data format
                data = json.loads(request.body)
                employee_id = data.get('employee_id')
                image_data = data.get('image_data')
            else:
                # Form data format
                employee_id = request.POST.get('employee_id')
                image_data = request.POST.get('image_data')
            
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
class DeleteEmployeeProfilePictureView(UserPassesTestMixin, View):
    """View to handle employee profile picture deletion (for admin users) with a URL parameter"""
    def test_func(self):
        return self.request.user.is_staff
        
    def post(self, request, employee_id):
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
            
            if profile_pic and profile_pic.image:
                # Delete the image file
                try:
                    if os.path.exists(profile_pic.image.path):
                        os.remove(profile_pic.image.path)
                except Exception as e:
                    print(f"Error removing file: {e}")
                    # Continue anyway since we need to clear the DB reference
                
                # Clear the image field
                profile_pic.image = None
                profile_pic.save()
                
                return JsonResponse({
                    'success': True,
                    'message': 'Employee profile picture removed successfully'
                })
            else:
                return JsonResponse({
                    'success': False,
                    'message': 'No profile picture found for this employee'
                }, status=404)
                
        except Exception as e:
            print(f"Error removing employee profile picture: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False, 
                'message': f'Error removing profile picture: {str(e)}'
            }, status=400)
