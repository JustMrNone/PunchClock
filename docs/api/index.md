# API Documentation

This document provides an overview of the Punch Clock API endpoints, authentication, and usage examples.

## API Overview

The Punch Clock API allows programmatic access to time entries, employee data, and other application features. This enables integration with other systems such as HR software, payroll systems, or custom dashboards.

## Authentication

API requests require authentication using token-based authentication. To obtain a token:

1. Make a POST request to `/api/token/` with your credentials:

```bash
curl -X POST \
  http://localhost:8000/api/token/ \
  -H 'Content-Type: application/json' \
  -d '{"username": "your_username", "password": "your_password"}'
```

2. The response will contain an access token and a refresh token:

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

3. Include the access token in subsequent requests:

```bash
curl -X GET \
  http://localhost:8000/api/time-entries/ \
  -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
```

## API Endpoints

> Note: This is a placeholder for future API documentation. As the API is developed, detailed endpoint information will be added here.

### Time Entries

#### List Time Entries

```
GET /api/time-entries/
```

Returns a list of time entries for the authenticated user or all entries for administrators.

#### Retrieve a Time Entry

```
GET /api/time-entries/{id}/
```

Returns details for a specific time entry.

#### Create a Time Entry

```
POST /api/time-entries/
```

Creates a new time entry.

Example request body:
```json
{
  "date": "2025-05-01",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "status": "pending"
}
```

#### Update a Time Entry

```
PUT /api/time-entries/{id}/
```

Updates an existing time entry.

#### Delete a Time Entry

```
DELETE /api/time-entries/{id}/
```

Deletes a time entry.

### Employees

#### List Employees

```
GET /api/employees/
```

Returns a list of employees (admin only).

#### Retrieve an Employee

```
GET /api/employees/{id}/
```

Returns details for a specific employee.

### Calendar Settings

#### Retrieve Calendar Settings

```
GET /api/calendar-settings/
```

Returns calendar settings for the authenticated user.

#### Update Calendar Settings

```
PUT /api/calendar-settings/
```

Updates calendar settings for the authenticated user.

### Company Settings

#### Retrieve Company Settings

```
GET /api/company-settings/
```

Returns company settings (admin only).

#### Update Company Settings

```
PUT /api/company-settings/
```

Updates company settings (admin only).

## Pagination

API responses that return multiple items are paginated with the following format:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/time-entries/?page=2",
  "previous": null,
  "results": [
    // Array of items
  ]
}
```

## Error Handling

The API uses standard HTTP status codes to indicate success or failure:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication failed
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a message explaining the error:

```json
{
  "detail": "Authentication credentials were not provided."
}
```

## Rate Limiting

API requests are limited to 100 requests per minute per user. If you exceed this limit, you'll receive a `429 Too Many Requests` response.

## Future API Documentation

As the API evolves, more detailed documentation will be provided, including:

- Request/response schemas
- Filter parameters
- Sorting options
- Authentication scopes
- API versioning

Consider using tools like Swagger UI or ReDoc for interactive API documentation.