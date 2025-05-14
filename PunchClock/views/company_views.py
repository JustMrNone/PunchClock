"""Company settings related views."""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
import json
import base64
from django.core.files.base import ContentFile
from ..models import CompanySettings

__all__ = [
    'UpdateCompanyNameView',
    'GetCompanySettingsView',
    'UpdateCompanySettingsView',
    'GetCompanyLogoView',
    'UploadCompanyLogoView',
    'DeleteCompanyLogoView',
]

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
class GetCompanyLogoView(View):
    def get(self, request):
        try:
            company_settings, created = CompanySettings.objects.get_or_create(user=request.user)
            
            if company_settings.company_logo and hasattr(company_settings.company_logo, 'url'):
                url = company_settings.company_logo.url
                print(f"Logo URL: {url}")  # Debug log
                return JsonResponse({
                    'success': True,
                    'has_logo': True,
                    'logo_url': url
                })
            else:
                print("No logo found or no URL attribute")  # Debug log
                return JsonResponse({
                    'success': True,
                    'has_logo': False
                })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


@method_decorator(login_required, name='dispatch')
class UploadCompanyLogoView(View):
    def post(self, request):
        try:
            content_type = request.headers.get('Content-Type', '')
            
            if 'application/json' in content_type:
                # Handle JSON data (base64 image)
                try:
                    data = json.loads(request.body)
                    image_data = data.get('image_data')
                    if not image_data:
                        return JsonResponse({'success': False, 'message': 'No image data provided.'}, status=400)
                    
                    format, imgstr = image_data.split(';base64,')
                    ext = format.split('/')[-1]
                    image_content = ContentFile(base64.b64decode(imgstr))
                    filename = f"company_logo_{request.user.username}.{ext}"
                except Exception as e:
                    return JsonResponse({'success': False, 'message': f'Invalid image data: {str(e)}'}, status=400)
            
            elif 'multipart/form-data' in content_type:
                # Handle file upload
                if 'logo' not in request.FILES:
                    return JsonResponse({'success': False, 'message': 'No file uploaded.'}, status=400)
                
                uploaded_file = request.FILES['logo']
                ext = uploaded_file.name.split('.')[-1].lower()
                if ext not in ['jpg', 'jpeg', 'png', 'gif']:
                    return JsonResponse({'success': False, 'message': 'Invalid file format.'}, status=400)
                
                image_content = uploaded_file
                filename = f"company_logo_{request.user.username}.{ext}"
            
            else:
                return JsonResponse({'success': False, 'message': 'Unsupported content type.'}, status=400)

            # Get or create company settings and save the logo
            company_settings, created = CompanySettings.objects.get_or_create(user=request.user)
            
            # Delete old logo if it exists
            if company_settings.company_logo:
                company_settings.company_logo.delete(save=False)
            
            company_settings.company_logo.save(filename, image_content)
            company_settings.save()

            return JsonResponse({
                'success': True, 
                'message': 'Logo uploaded successfully.',
                'logo_url': company_settings.company_logo.url
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


@method_decorator(login_required, name='dispatch')
class DeleteCompanyLogoView(View):
    def delete(self, request):
        try:
            company_settings, created = CompanySettings.objects.get_or_create(user=request.user)
            
            # Check if logo exists
            if not company_settings.company_logo:
                return JsonResponse({'success': False, 'message': 'No logo exists.'}, status=400)
            
            # Delete the logo
            company_settings.company_logo.delete()
            company_settings.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Company logo deleted successfully.'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
