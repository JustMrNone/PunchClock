# Deployment

This document outlines the steps to deploy the Punch Clock application to production environments.

## Deployment Options

The Punch Clock application can be deployed in several ways:

1. **Docker-based deployment** (recommended)
2. Traditional server deployment
3. Platform as a Service (PaaS) deployment

## Docker-based Deployment

### Prerequisites

- Docker and Docker Compose installed on the production server
- Domain name (optional but recommended)
- SSL certificate (recommended for production)

### Basic Production Setup

1. Clone the repository on your production server:

```bash
git clone https://github.com/JustMrNone/PunchClock.git
cd PunchClock/ClockingInAndOut
```

2. Create a production `.env` file:

```bash
cp .env.example .env.prod
```

3. Edit the `.env.prod` file with production settings:

```
DEBUG=False
SECRET_KEY=<secure-random-key>
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
DATABASE_URL=postgres://postgres:password@db:5432/punch_clock
STATIC_ROOT=/app/static
MEDIA_ROOT=/app/media
```

4. Create a production `docker-compose.prod.yml` file:

```yaml
version: '3.8'

services:
  db:
    image: postgres:latest
    container_name: postgres_db_prod
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: <secure-password>
      POSTGRES_DB: punch_clock_prod
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
    restart: always

  web:
    build: .
    container_name: punch_clock_web_prod
    command: gunicorn ClockingInAndOut.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - static_volume:/app/static
      - media_volume:/app/media
    env_file:
      - .env.prod
    depends_on:
      - db
    restart: always

  nginx:
    image: nginx:latest
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
      - static_volume:/app/static
      - media_volume:/app/media
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - web
    restart: always

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data_prod:
  static_volume:
  media_volume:
```

5. Create Nginx configuration:

```bash
mkdir -p nginx
```

Create `nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /static/ {
        alias /app/static/;
    }

    location /media/ {
        alias /app/media/;
    }

    location / {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

6. Start the production services:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

7. Apply migrations and collect static files:

```bash
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --no-input
```

8. Create a superuser for the production site:

```bash
docker-compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

### SSL Certificate Setup

1. Initialize SSL certificates:

```bash
mkdir -p certbot/conf certbot/www
```

2. Obtain SSL certificate:

```bash
docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email your-email@example.com \
    -d your-domain.com -d www.your-domain.com \
    --agree-tos --no-eff-email" certbot
```

3. Reload Nginx to apply the certificate:

```bash
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Alternative Deployment: Platform as a Service

If you prefer not to manage your own Docker infrastructure, you can deploy to a Platform as a Service (PaaS) like Heroku:

1. Create a `Procfile` in the root directory:

```
web: gunicorn ClockingInAndOut.wsgi:application --bind 0.0.0.0:$PORT
```

2. Follow the platform-specific deployment instructions (e.g., for Heroku, use the Heroku CLI).

## Maintenance

### Database Backups

Set up regular database backups:

```bash
# Create a backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres punch_clock_prod > backup_$(date +%Y-%m-%d).sql

# Restore from backup
cat backup_file.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres punch_clock_prod
```

### Updating the Application

To update the application with new code:

```bash
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build web
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --no-input
```

### Monitoring

Consider setting up monitoring solutions like:

- Docker container monitoring (e.g., Prometheus + Grafana)
- Application performance monitoring (e.g., Sentry)
- Log management (e.g., ELK Stack)