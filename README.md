# Punch Clock

![Punch Clock Logo](PunchClock/static/punch/img/favicon.png)

Punch Clock is a comprehensive time-tracking solution built with Django and Docker, designed for remote teams, freelancers, and businesses of all sizes.

[![GitHub License](https://img.shields.io/github/license/JustMrNone/PunchClock)](https://github.com/JustMrNone/PunchClock/blob/main/LICENSE)

## 🚀 Features

- **Time Entry Management**: Clock in/out with ease and track working hours
- **Holiday & Calendar Integration**: Plan and track holidays and time off
- **Team Overview**: Visualize your team's attendance and productivity
- **Administrative Dashboard**: Comprehensive tools for managers
- **User Profiles**: Personalized settings and preferences
- **Reporting & Exports**: Generate custom reports and export data
- **Containerized**: Easy deployment with Docker
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Requirements

- Docker and Docker Compose (for containerized setup)
- Python 3.10+ (for local development)
- PostgreSQL (handled by Docker)
- Node.js and npm (for frontend assets)

## 🛠️ Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/JustMrNone/PunchClock.git
cd PunchClock/ClockingInAndOut

# Start the application
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Access the application at http://localhost:8000
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/JustMrNone/PunchClock.git
cd PunchClock/ClockingInAndOut

# Set up Python environment (using Poetry)
poetry install
poetry shell

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Build frontend assets
npm install
npm run build

# Run the development server
python manage.py runserver
```

## 📖 Documentation

Comprehensive documentation is available to help you get started, understand the architecture, and contribute to Punch Clock.

### Viewing Documentation

The documentation is built using MkDocs with the Material theme:

1. **Using the convenience scripts (recommended):**
   ```bash
   # On Windows
   .\serve-docs.ps1
   
   # On Linux/macOS
   chmod +x serve-docs.sh
   ./serve-docs.sh
   ```
   This will install required packages if needed and start the documentation server on port 8080.

2. **Access the documentation** by navigating to:
   ```
   http://localhost:8080/
   ```

Documentation includes:
- Setup instructions
- Architecture overview
- Deployment guides
- User guides
- API documentation
- Space-themed Git workflow

## 🧪 Testing

```bash
# Run tests using Docker
docker-compose exec web python manage.py test

# Run tests locally
python manage.py test
```

## 🚢 Deployment

See [deployment documentation](docs/deployment.md) for detailed instructions on deploying Punch Clock to production environments.

## 🧩 Project Structure

```
ClockingInAndOut/        # Django project container
├── PunchClock/          # Main application
│   ├── models.py        # Data models
│   ├── views.py         # View controllers
│   ├── templates/       # HTML templates
│   └── static/          # Static assets
├── docs/                # Documentation
├── docker-compose.yml   # Docker configuration
└── Dockerfile           # Container definition
```

## 👥 Contributing

We welcome contributions to Punch Clock! Please see our [contributing guide](docs/contributing.md) for details on our space-themed Git workflow, coding standards, and pull request process.

## 📝 License

Punch Clock is open source software licensed under the GNU General Public License v3.0 (GPL-3.0). See the [LICENSE](LICENSE) for more information.

## 🔮 Roadmap

- Mobile application
- Advanced reporting features
- Integration with payroll systems
- Multi-language support
- Team messaging features

## 📞 Support

If you encounter any issues or have questions, please [create an issue](https://github.com/JustMrNone/PunchClock/issues) on our GitHub repository.