# Use Debian-based image with Python 3.12
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies including wkhtmltopdf with all required dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libssl-dev \
    wkhtmltopdf \
    xvfb \
    xfonts-75dpi \
    xfonts-base \
    fontconfig \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libjpeg62-turbo \
    libpng16-16 \
    zlib1g \
    bash \
    xauth \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a wrapper script for wkhtmltopdf with xvfb for headless rendering
RUN echo -e '#!/bin/bash\nxvfb-run -a --server-args="-screen 0, 1024x768x24" /usr/bin/wkhtmltopdf "$@"' > /usr/local/bin/wkhtmltopdf-xvfb \
    && chmod +x /usr/local/bin/wkhtmltopdf-xvfb \
    && chmod +x /usr/bin/wkhtmltopdf \
    && ln -sf /usr/bin/wkhtmltopdf /usr/local/bin/wkhtmltopdf

# Copy the Poetry configuration files
COPY pyproject.toml poetry.lock /app/

# Install Poetry
RUN pip install --no-cache-dir poetry

# Install dependencies
RUN poetry config virtualenvs.create false && poetry install --only main --no-root --no-interaction --no-ansi

# Copy the application code
COPY . /app/

# Make entry point script executable
RUN chmod +x /app/docker-entrypoint.sh

# Expose the port the app runs on
EXPOSE 8000

# The entrypoint script will be used in docker-compose.yml
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]