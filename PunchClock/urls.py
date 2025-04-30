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
    path('employee/calendar/', views.EmployeeCalendarView.as_view(), name='employee_calendar'),
    path('calendar/', views.EmployeeCalendarView.as_view(), name='calendar'),  # Added new URL pattern
    path('add-employee/', views.AddEmployeeView.as_view(), name='add_employee'),
    # API calender    
    path('api/calendar-settings/get/', views.GetCalendarSettingsView.as_view(), name='get_calendar_settings'),
    path('api/calendar-settings/update/', views.UpdateCalendarSettingsView.as_view(), name='update_calendar_settings'),
    path('api/personal-notes/get/', views.GetPersonalNotesView.as_view(), name='get_personal_notes'),

    # Add new API endpoints for employees
    path('api/employees/get/', views.GetEmployeesView.as_view(), name='get_employees'),
    path('api/employees/<int:employee_id>/', views.GetEmployeeDetailsView.as_view(), name='get_employee_details'),

    # Time tracking endpoints
    path('api/time/punch/', views.PunchTimeView.as_view(), name='punch_time'),
    path('api/time/stats/', views.GetTimeStatisticsView.as_view(), name='time_stats'),
    path('api/time/stats/<int:employee_id>/', views.GetTimeStatisticsView.as_view(), name='employee_time_stats'),
    path('api/time/recent/', views.GetRecentActivitiesView.as_view(), name='get_recent_activities'),
    
    # Today's time entries and approval endpoints
    path('api/time/today/', views.GetTodayTimeEntriesView.as_view(), name='get_today_entries'),
    path('api/time/update-status/', views.UpdateTimeEntryStatusView.as_view(), name='update_time_entry_status'),
    path('api/time/approve-all/', views.ApproveAllTimeEntriesView.as_view(), name='approve_all_time_entries'),
    
    # Clear and undo operations
    path('api/time/clear/', views.ClearTimeEntriesView.as_view(), name='clear_time_entries'),
    path('api/time/undo-clear/', views.UndoClearTimeEntriesView.as_view(), name='undo_clear_time_entries'),
]
