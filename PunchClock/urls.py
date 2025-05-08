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
    path('calendar/', views.EmployeeCalendarView.as_view(), name='calendar'), 
    path('add-employee/', views.AddEmployeeView.as_view(), name='add_employee'),
    path('settings/', views.UserSettingsView.as_view(), name='settingsuser'),
    
    # API calender    
    path('api/calendar-settings/get/', views.GetCalendarSettingsView.as_view(), name='get_calendar_settings'),
    path('api/calendar-settings/update/', views.UpdateCalendarSettingsView.as_view(), name='update_calendar_settings'),
    path('api/calendar-settings/update-global-holiday/', views.UpdateGlobalHolidayView.as_view(), name='update_global_holiday'),
    path('api/personal-notes/get/', views.GetPersonalNotesView.as_view(), name='get_personal_notes'),
    path('api/personal-notes/update/', views.UpdatePersonalNotesView.as_view(), name='update_personal_notes'),
    path('api/personal-notes/delete/', views.DeletePersonalNoteView.as_view(), name='delete_personal_notes'),
    
    # Company settings
    path('update-company-name/', views.UpdateCompanyNameView.as_view(), name='update_company_name'),
    path('api/company-settings/', views.GetCompanySettingsView.as_view(), name='get_company_settings'),
    path('api/company-settings/update/', views.UpdateCompanySettingsView.as_view(), name='update_company_settings'),

    # Profile picture endpoints
    path('api/profile-picture/', views.ProfilePictureView.as_view(), name='profile_picture'),
    path('api/profile-picture/get/', views.GetProfilePictureView.as_view(), name='get_profile_picture'),
    
    # Employee profile picture endpoints
    path('api/employee-profile-picture/', views.EmployeeProfilePictureView.as_view(), name='employee_profile_picture'),
    path('api/employees/<int:employee_id>/profile-picture/', views.GetEmployeeProfilePictureView.as_view(), name='get_employee_profile_picture'),

    # Add new API endpoints for employees
    path('api/employees/get/', views.GetEmployeesView.as_view(), name='get_employees'),
    path('api/employees/<int:employee_id>/', views.GetEmployeeDetailsView.as_view(), name='get_employee_details'),

    # Time tracking endpoints
    path('api/time/punch/', views.PunchTimeView.as_view(), name='punch_time'),
    path('api/time/stats/', views.GetTimeStatisticsView.as_view(), name='time_stats'),
    path('api/time/stats/<int:employee_id>/', views.GetTimeStatisticsView.as_view(), name='employee_time_stats'),
    path('api/time/entries/<int:employee_id>/', views.GetEmployeeTimeEntriesView.as_view(), name='get_employee_time_entries'),
    path('api/time/recent/', views.GetRecentActivitiesView.as_view(), name='get_recent_activities'),
    
    # Today's time entries and approval endpoints
    path('api/time/today/', views.GetTodayTimeEntriesView.as_view(), name='get_today_entries'),
    path('api/time/update-status/', views.UpdateTimeEntryStatusView.as_view(), name='update_time_entry_status'),
    path('api/time/approve-all/', views.ApproveAllTimeEntriesView.as_view(), name='approve_all_time_entries'),
    
    # Clear and undo operations
    path('api/time/clear/', views.ClearTimeEntriesView.as_view(), name='clear_time_entries'),
    path('api/time/undo-clear/', views.UndoClearTimeEntriesView.as_view(), name='undo_clear_time_entries'),
    
    # Employee stats endpoint
    path('api/employees/stats/', views.GetEmployeeStatsView.as_view(), name='get_employee_stats'),
    
    # Active employees endpoint (those who sent approval in last 24 hours)
    path('api/time/active-employees/', views.GetActiveEmployeesView.as_view(), name='get_active_employees'),

    # Department management APIs
    path('api/departments/', views.DepartmentListView.as_view(), name='list_departments'),
    path('api/departments/create/', views.DepartmentCreateView.as_view(), name='create_department'),
    path('api/departments/<int:department_id>/update/', views.DepartmentUpdateView.as_view(), name='update_department'),
    path('api/departments/<int:department_id>/delete/', views.DepartmentDeleteView.as_view(), name='delete_department'),
    path('api/departments/<int:department_id>/employees/', views.DepartmentEmployeesView.as_view(), name='department_employees'),
]
