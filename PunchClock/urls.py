from django.urls import path
from . import views

app_name = 'PunchClock'

urlpatterns = [
    path('', views.Welcome.as_view(), name='welcome'),
    path('welcome/', views.Welcome.as_view(), name='welcome'),
    path("punchclock", views.PunchCard.as_view(), name="punchclock"),
    path("dashboard", views.Admin.as_view(), name="dashboard"),
    path("adminlogin", views.AdminLogin.as_view(), name="adminlogin"),
    path("loginpunch", views.LoginPuch.as_view(), name="loginpunch"),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('add-employee/', views.AddEmployeeView.as_view(), name='add_employee'),
    path('api/calendar-settings/get/', views.GetCalendarSettingsView.as_view(), name='get_calendar_settings'),
    path('api/calendar-settings/update/', views.UpdateCalendarSettingsView.as_view(), name='update_calendar_settings'),
    path('api/personal-notes/get/', views.GetPersonalNotesView.as_view(), name='get_personal_notes'),
    path('employee/calendar/', views.EmployeeCalendarView.as_view(), name='employee_calendar'),
    path('calendar/', views.EmployeeCalendarView.as_view(), name='calendar'),  # Added new URL pattern
]
