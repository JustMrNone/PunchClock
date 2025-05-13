"""Authentication related views."""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views import View
from django.shortcuts import render, redirect
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User

__all__ = ['LoginPuch', 'AdminLogin', 'LogoutView']

class LoginPuch(View):
    def get(self, request):
        return render(request, 'punch/punchcard/login.html')

    def post(self, request):
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse('PunchClock:punchclock'))  # Redirect to employee dashboard
        else:
            return render(request, 'punch/punchcard/login.html', {"error": "Invalid credentials."})

class AdminLogin(View):
    def get(self, request):
        if request.user.is_authenticated and request.user.is_staff:
            return HttpResponseRedirect(reverse('PunchClock:dashboard'))
        return render(request, "punch/admin/adminlogin.html")

    def post(self, request):
        email_or_username = request.POST.get('email')
        password = request.POST.get('password')

        # Try authenticating with email
        user = authenticate(request, username=email_or_username, password=password)
        if user is None:
            try:
                # Try finding user by email if initial authentication failed
                user_obj = User.objects.get(email=email_or_username)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass

        if user is not None:
            # Check if there are any staff users
            if not User.objects.filter(is_staff=True).exists():
                # If no staff users exist, make this user staff
                user.is_staff = True
                user.save()
            
            # After potential promotion, check if user is staff
            if user.is_staff:
                login(request, user)
                return HttpResponseRedirect(reverse('PunchClock:dashboard'))
            else:
                return render(request, "punch/admin/adminlogin.html", {
                    "error": "You do not have admin privileges. Please log in as an employee instead."
                })
        else:
            return render(request, "punch/admin/adminlogin.html", {
                "error": "Invalid email or password. Please try again."
            })
            
class LogoutView(View):
    def get(self, request):
        logout(request)
        return HttpResponseRedirect(reverse('PunchClock:welcome'))  # Redirect to the welcome page after logout
