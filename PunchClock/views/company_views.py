"""Company settings related views."""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http import JsonResponse
import json
from ..models import CompanySettings

__all__ = [
    'UpdateCompanyNameView',
    'GetCompanySettingsView',
    'UpdateCompanySettingsView',
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
