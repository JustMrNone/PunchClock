# Testing Guide

This document outlines the testing strategy for the Punch Clock application and provides instructions for running tests.

## Testing Strategy

The Punch Clock application employs multiple testing approaches:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test the interaction between components
3. **Functional Tests**: Test complete features from a user perspective

## Test Structure

Tests are organized in the Django standard structure:

```
PunchClock/
├── tests.py            # Main test file
└── tests/              # Additional test modules (if applicable)
    ├── test_models.py
    ├── test_views.py
    └── test_forms.py
```

## Running Tests

### Using Docker

```bash
# Run all tests
docker-compose exec web python manage.py test

# Run specific test module
docker-compose exec web python manage.py test PunchClock.tests.test_models

# Run specific test class
docker-compose exec web python manage.py test PunchClock.tests.test_models.TimeEntryModelTests

# Run specific test method
docker-compose exec web python manage.py test PunchClock.tests.test_models.TimeEntryModelTests.test_create_time_entry
```

### Local Development

```bash
# Run all tests
python manage.py test

# Run specific tests
python manage.py test PunchClock.tests.test_views
```

### Test Coverage

To measure test coverage:

```bash
# Using Docker
docker-compose exec web coverage run --source='.' manage.py test
docker-compose exec web coverage report

# Local development
coverage run --source='.' manage.py test
coverage report
coverage html  # For a detailed HTML report
```

The coverage report will show which parts of the codebase are covered by tests and which need additional testing.

## Writing Tests

### Model Tests Example

```python
from django.test import TestCase
from django.contrib.auth.models import User
from PunchClock.models import TimeEntry, Employee

class TimeEntryModelTests(TestCase):
    def setUp(self):
        # Set up test data
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com',
            password='password123'
        )
        self.employee = Employee.objects.create(
            user=self.user,
            department='Engineering',
            admin=False
        )

    def test_create_time_entry(self):
        # Test creating a time entry
        entry = TimeEntry.objects.create(
            employee=self.employee,
            date='2025-01-01',
            start_time='09:00:00',
            end_time='17:00:00'
        )
        self.assertEqual(entry.total_hours, 8)
        self.assertEqual(entry.status, 'pending')
```

### View Tests Example

```python
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User

class LoginViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.login_url = reverse('login')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

    def test_login_success(self):
        response = self.client.post(
            self.login_url, 
            {'username': 'testuser', 'password': 'password123'}
        )
        self.assertEqual(response.status_code, 302)  # Redirect after login
```

## Continuous Integration

Tests are automatically run in the CI/CD pipeline whenever changes are pushed to the repository.

To set up CI testing with GitHub Actions:

1. Create a `.github/workflows/tests.yml` file
2. Configure the workflow to run tests in a Docker environment
3. Push to GitHub to trigger the workflow

## Mocking

For tests that interact with external services or APIs, use the `unittest.mock` library to mock those interactions:

```python
from unittest.mock import patch
from django.test import TestCase

class ExternalServiceTests(TestCase):
    @patch('PunchClock.services.external_api.send_request')
    def test_service_integration(self, mock_send_request):
        mock_send_request.return_value = {'status': 'success'}
        # Test code that uses the external API
        # ...
        mock_send_request.assert_called_once()
```

## Test Data Management

### Fixtures

For complex test data, use Django fixtures:

```bash
# Create fixtures from existing data
python manage.py dumpdata PunchClock.TimeEntry --indent 2 > PunchClock/fixtures/time_entries.json

# Load fixtures in tests
python manage.py loaddata time_entries
```

### Factory Boy

Consider using Factory Boy for test data factories:

```python
import factory
from django.contrib.auth.models import User
from PunchClock.models import Employee

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda o: f'{o.username}@example.com')
    password = factory.PostGenerationMethodCall('set_password', 'password')

class EmployeeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Employee
    
    user = factory.SubFactory(UserFactory)
    department = 'Engineering'
    admin = False
```

## Performance Testing

For performance-critical areas, consider implementing performance tests:

```python
import time
from django.test import TestCase

class PerformanceTests(TestCase):
    def test_time_entries_query_performance(self):
        # Create test data
        # ...
        
        start_time = time.time()
        # Run the query or function to test
        result = self.client.get(reverse('time_entries_report'))
        execution_time = time.time() - start_time
        
        self.assertLess(execution_time, 0.5)  # Should execute in under 0.5 seconds
```

## Common Testing Issues

1. **Database conflicts**: Ensure each test cleans up its data
2. **Authentication issues**: Use `self.client.login()` or force_login for authenticated views
3. **Time-sensitive tests**: Use freezegun to fix the current time during tests