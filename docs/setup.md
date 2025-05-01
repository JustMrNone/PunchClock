# Setup Guide

This guide will help you set up the Punch Clock project for local development.

## Prerequisites

- Docker and Docker Compose (recommended)
- Python 3.10+ (for local development without Docker)
- Node.js and npm (for TailwindCSS)
- Git

## Clone the Repository

```bash
git clone https://github.com/JustMrNone/PunchClock.git
cd PunchClock/ClockingInAndOut
```

## Docker Setup (Recommended)

The easiest way to set up and run the Punch Clock project is using Docker:

```bash
# Build and start the containers
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create a superuser
docker-compose exec web python manage.py createsuperuser

# Generate sample data (optional)
docker-compose exec web python manage.py generate_time_entries
```

The application will be available at http://localhost:8000/

### Docker Environment Configuration

You can modify the PostgreSQL configuration in the `docker-compose.yml` file:

```yaml
db:
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: 1234
```

## Local Development Setup (Alternative)

If you prefer to run the application without Docker:

### Using Poetry (Recommended for local setup)

```bash
# Install Poetry if you don't have it
pip install poetry

# Install dependencies
poetry install

# Activate the virtual environment
poetry shell
```

### Using pip and venv

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
DEBUG=True
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///db.sqlite3  # For local SQLite database
# Use this instead if you want to connect to PostgreSQL manually
# DATABASE_URL=postgres://postgres:1234@localhost:5432/punch_clock
```

### Database Setup (Local)

```bash
# Apply migrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser
```

### Frontend Assets

The project uses TailwindCSS for styling:

```bash
# Install Node.js dependencies
npm install

# Build CSS
npm run build
```

### Running the Development Server (Local)

```bash
python manage.py runserver
```

## Loading Initial Data (Optional)

You can populate the database with sample data:

```bash
# Using Docker
docker-compose exec web python manage.py generate_time_entries

# Local setup
python manage.py generate_time_entries
```

## Troubleshooting

### Docker Issues

1. If containers fail to start:
   ```bash
   # Check container logs
   docker-compose logs
   ```

2. If database connection fails:
   ```bash
   # Ensure the database container is running
   docker ps
   ```

3. To reset the environment:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Local Setup Issues

If you encounter any issues during local setup:

1. Ensure all prerequisites are installed correctly
2. Check that environment variables are set properly
3. Try removing the virtual environment and recreating it
4. Check the Django debug page for specific errors