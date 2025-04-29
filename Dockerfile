# Use the official Python image with Alpine as the base image
FROM python:3.13-alpine

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev openssl-dev

# Copy the Poetry configuration files
COPY pyproject.toml poetry.lock /app/

# Install Poetry
RUN pip install --no-cache-dir poetry

# Install dependencies
RUN poetry config virtualenvs.create false && poetry install --only main --no-root --no-interaction --no-ansi

# Copy the application code
COPY . /app/

# Expose the port the app runs on
EXPOSE 8000

# Run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]