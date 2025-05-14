from django.urls import path
from .views import *

app_name = 'PunchClock'

urlpatterns = [
    
    path("", base_views.Welcome.as_view(), name='welcome'),
    path('welcome/', base_views.Welcome.as_view(), name='welcome'),
    
    path("punchclock", base_views.PunchCard.as_view(), name="punchclock"),
    
    path("dashboard", base_views.Admin.as_view(), name="dashboard"),

    
    path("adminlogin", auth_views.AdminLogin.as_view(), name="adminlogin"),
    path("loginpunch", auth_views.LoginPuch.as_view(), name="loginpunch"),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),


    path('add-employee/', employee_views.AddEmployeeView.as_view(), name='add_employee'),
    path('settings/', employee_views.UserSettingsView.as_view(), name='settingsuser'),
    
    # Add new API endpoints for employees
    path('api/employees/get/', employee_views.GetEmployeesView.as_view(), name='get_employees'),
    path('api/employees/<int:employee_id>/', employee_views.GetEmployeeDetailsView.as_view(), name='get_employee_details'),    path('employee/calendar/', calendar_views.EmployeeCalendarView.as_view(), name='employee_calendar'),
    path('calendar/', calendar_views.EmployeeCalendarView.as_view(), name='calendar'), 

    # API calendar    
    path('api/calendar-settings/get/', calendar_views.GetCalendarSettingsView.as_view(), name='get_calendar_settings'),
    path('api/calendar-settings/update/', calendar_views.UpdateCalendarSettingsView.as_view(), name='update_calendar_settings'),
    path('api/calendar-settings/update-global-holiday/', calendar_views.UpdateGlobalHolidayView.as_view(), name='update_global_holiday'),
    path('api/personal-notes/get/', calendar_views.GetPersonalNotesView.as_view(), name='get_personal_notes'),    path('api/personal-notes/update/', calendar_views.UpdatePersonalNotesView.as_view(), name='update_personal_notes'),
    path('api/personal-notes/delete/', calendar_views.DeletePersonalNoteView.as_view(), name='delete_personal_notes'),
    

    path('update-company-name/', company_views.UpdateCompanyNameView.as_view(), name='update_company_name'),
    path('api/company-settings/', company_views.GetCompanySettingsView.as_view(), name='get_company_settings'),
    path('api/company-settings/update/', company_views.UpdateCompanySettingsView.as_view(), name='update_company_settings'),

    # Profile picture endpoints
    path('api/profile-picture/', profile_views.ProfilePictureView.as_view(), name='profile_picture'),
    path('api/profile-picture/get/', profile_views.GetProfilePictureView.as_view(), name='get_profile_picture'),
      # Employee profile picture endpoints
    path('api/employee-profile-picture/', profile_views.EmployeeProfilePictureView.as_view(), name='employee_profile_picture'),
    path('api/employees/<int:employee_id>/profile-picture/', profile_views.GetEmployeeProfilePictureView.as_view(), name='get_employee_profile_picture'),

    # Time tracking endpoints
    path('api/time/punch/', time_views.PunchTimeView.as_view(), name='punch_time'),
    path('api/time/stats/', time_views.GetTimeStatisticsView.as_view(), name='time_stats'),
    path('api/time/stats/<int:employee_id>/', time_views.GetTimeStatisticsView.as_view(), name='employee_time_stats'),
    path('api/time/entries/<int:employee_id>/', time_views.GetEmployeeTimeEntriesView.as_view(), name='get_employee_time_entries'),
    path('api/time/recent/', time_views.GetRecentActivitiesView.as_view(), name='get_recent_activities'),
    # Today's time entries and approval endpoints
    path('api/time/today/', time_entries.GetTodayTimeEntriesView.as_view(), name='get_today_entries'),
    path('api/time/update-status/', time_entries.UpdateTimeEntryStatusView.as_view(), name='update_time_entry_status'),
    path('api/time/approve-all/', time_entries.ApproveAllTimeEntriesView.as_view(), name='approve_all_time_entries'),
      # Clear and undo operations
    path('api/time/clear/', time_entries.ClearTimeEntriesView.as_view(), name='clear_time_entries'),
    path('api/time/undo-clear/', time_entries.UndoClearTimeEntriesView.as_view(), name='undo_clear_time_entries'),
    
    # Dashboard stats endpoint
    path('api/dashboard/stats/', time_views.DashboardStatsView.as_view(), name='dashboard_stats'),
    
    # Employee stats endpoint
    path('api/employees/stats/', time_entries.GetEmployeeStatsView.as_view(), name='get_employee_stats'),
    
    # Active employees endpoint (those who sent approval in last 24 hours)
    path('api/time/active-employees/', time_entries.GetActiveEmployeesView.as_view(), name='get_active_employees'),


    # Department management APIs
    path('api/departments/', department_views.DepartmentListView.as_view(), name='list_departments'),
    path('api/departments/create/', department_views.DepartmentCreateView.as_view(), name='create_department'),
    path('api/departments/<int:department_id>/update/', department_views.DepartmentUpdateView.as_view(), name='update_department'),
    path('api/departments/<int:department_id>/delete/', department_views.DepartmentDeleteView.as_view(), name='delete_department'),
    path('api/departments/<int:department_id>/employees/', department_views.DepartmentEmployeesView.as_view(), name='department_employees'),
    
    path('api/export/preview/', export_views.ExportPreviewView.as_view(), name='export_preview'),
    path('api/export/generate/', export_views.ExportGenerateView.as_view(), name='export_generate'),
    path('api/export/recent/', export_views.ExportRecentView.as_view(), name='export_recent'),
    path('api/export/delete/<int:export_id>/', export_views.ExportDeleteView.as_view(), name='export_delete'),
]
