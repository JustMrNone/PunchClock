# Architecture Overview

This document provides an overview of the Punch Clock application's architecture, components, and data model.

## Project Structure

The project follows a standard Django application structure:

```
ClockingInAndOut/          # Project root
├── ClockingInAndOut/      # Django project folder
│   ├── settings.py        # Project settings
│   ├── urls.py            # Main URL configuration
│   ├── asgi.py            # ASGI configuration 
│   └── wsgi.py            # WSGI configuration
├── PunchClock/            # Main application
│   ├── migrations/        # Database migrations
│   ├── static/            # Static assets (CSS, JS)
│   ├── templates/         # HTML templates
│   ├── management/        # Custom management commands
│   ├── admin.py           # Admin interface configuration
│   ├── models.py          # Data models
│   ├── views.py           # View controllers
│   ├── urls.py            # URL routing for the app
│   └── tests.py           # Test cases
├── media/                 # User-uploaded files (e.g., profile pictures)
├── docs/                  # Documentation
├── manage.py              # Django management script
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker image configuration
├── pyproject.toml         # Poetry dependency management
├── poetry.lock            # Poetry lockfile
├── package.json           # NPM configuration for frontend assets
├── tailwind.config.js     # TailwindCSS configuration
└── postcss.config.js      # PostCSS configuration
```

## Docker Architecture

The application runs in a containerized environment using Docker:

- **Web Service**: Python 3.13 Alpine-based container running the Django application
- **Database Service**: PostgreSQL container for data persistence
- **Volume Mapping**: Docker volumes for database persistence and code synchronization

```
┌────────────────────┐      ┌────────────────────┐
│                    │      │                    │
│   Django Web App   │◄────►│   PostgreSQL DB    │
│    (container)     │      │    (container)     │
│                    │      │                    │
└────────────────────┘      └────────────────────┘
         ▲                            ▲
         │                            │
         ▼                            ▼
┌────────────────────┐      ┌────────────────────┐
│                    │      │                    │
│   App Directory    │      │   postgres_data    │
│  (volume mapping)  │      │      (volume)      │
│                    │      │                    │
└────────────────────┘      └────────────────────┘
```

## Key Apps

- **ClockingInAndOut**: The Django project container
- **PunchClock**: The main application handling time tracking functionality

## Data Models

### Core Models

1. **TimeEntry**
   - Tracks employee clock in/out events
   - Fields: employee, date, start_time, end_time, total_hours, status

2. **Employee**
   - Extends Django's User model with additional fields
   - Fields: user (OneToOne), admin, department, hire_date

3. **CalendarSettings**
   - Stores user calendar configurations
   - Fields: user, holidays, notes, weekend_days

4. **CompanySettings**
   - Stores organization-level settings
   - Fields: user, company_name, work_hours, rest_hours

5. **PersonalNote**
   - Stores user-specific notes
   - Fields: user, notes (JSON)

6. **ProfilePicture**
   - Stores user profile images
   - Fields: user, image

## Database Schema

```
User (Django built-in)
└── Employee (1:1)
    └── TimeEntry (1:N)
User
└── CalendarSettings (1:N)
User
└── PersonalNote (1:N)
User
└── CompanySettings (1:1)
User
└── ProfilePicture (1:1)
```

## Authentication Flow

The application uses Django's built-in authentication system with custom user profiles:

1. Users register or are created by admins
2. Employee records are linked to user accounts
3. Authentication determines access level (admin vs regular employee)

## Request Flow

1. HTTP request arrives at the server
2. Django's URL dispatcher routes to appropriate view
3. View function processes request and interacts with models
4. Template is rendered with context data
5. Response is returned to the client

## Frontend Architecture

The frontend is built using:
- Django templates for HTML structure
- TailwindCSS for styling
- Custom JavaScript for interactive features

## Technology Stack

- **Backend**: Django (Python web framework)
- **Database**: PostgreSQL (via Docker)
- **Frontend**: HTML, TailwindCSS, JavaScript
- **Development Environment**: Docker, Docker Compose
- **Package Management**: Poetry (Python dependencies), NPM (frontend dependencies)
- **CSS Processing**: PostCSS with TailwindCSS