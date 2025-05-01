# Contributing Guide

This document provides guidelines for contributing to the Punch Clock project.

## Getting Started

1. **Fork the repository** on [GitHub](https://github.com/JustMrNone/PunchClock)
2. **Clone your fork** locally
3. **Set up the development environment** as described in the [setup guide](setup.md)

## Development Workflow

### Branching Strategy

We follow a space-themed Git flow with the following stages:

- **Assembly** (`assembly/*`) - Building and planning features
- **Testing** (`testing/*`) - Integration and verification
- **Countdown** (`countdown/*`) - Final preparation and validation
- **Liftoff** (`liftoff`) - Production release
- **Orbit** (`orbit/*`) - Maintenance, long-term support, and fixes

### Branch Naming Convention

```
assembly/add-export-functionality
testing/export-feature-integration
countdown/v1.2.0-prep
orbit/fix-time-calculation
```

### Stage Transitions

1. **Assembly → Testing**
   - Feature is complete and ready for integration testing
   - All unit tests pass
   - Code has been reviewed

2. **Testing → Countdown**
   - All features are integrated
   - Integration tests pass
   - Ready for final validation

3. **Countdown → Liftoff**
   - Final verification complete
   - Release candidate approved
   - Documentation updated

4. **Liftoff → Orbit**
   - Release deployed to production
   - Version tagged
   - Ongoing maintenance begins

### Making Changes

1. Create a new branch from the appropriate stage branch for your feature or bugfix
2. Make your changes, following the coding standards
3. Write or update tests for your changes
4. Run the tests to ensure they pass
5. Update documentation if necessary

## Code Style

### Python

We follow the [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide for Python code.

- Use 4 spaces for indentation
- Maximum line length of 79 characters
- Use docstrings for all public modules, functions, classes, and methods
- Use snake_case for variables and function names
- Use CamelCase for class names

You can check your code style with:

```bash
# Using Docker
docker-compose exec web flake8

# Local development
flake8
```

### JavaScript

For JavaScript, we follow a modified version of the Airbnb JavaScript Style Guide:

- Use 2 spaces for indentation
- Use semicolons
- Use camelCase for variables and functions
- Use PascalCase for classes and React components

### HTML/CSS

- Use 2 spaces for indentation
- Use kebab-case for class names
- Follow BEM methodology for CSS class naming

## Commit Guidelines

- Use clear, descriptive commit messages
- Start with a short summary line (50 chars or less)
- Follow with a more detailed explanation if necessary
- Reference issue numbers in the message when applicable

Example:
```
Add export to PDF feature for time entries

- Implements PDF generation using ReportLab
- Adds user interface elements for export options
- Includes unit tests for the export functionality

Fixes #123
```

## Pull Requests

1. **Update your branch** with the latest changes from the appropriate stage branch
2. **Push your branch** to your fork
3. **Submit a pull request** to the appropriate stage branch of the main repository
4. **Add a clear description** of the changes
5. **Link any related issues**

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Target Stage
- [ ] Assembly - Building and planning features
- [ ] Testing - Integration and verification
- [ ] Countdown - Final preparation and validation
- [ ] Orbit - Maintenance and fixes

## How to Test
1. Step-by-step instructions to test your changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## Testing

- All new features should include tests
- Bug fixes should include tests that verify the fix
- Run the test suite before submitting a PR
- Aim to maintain or improve test coverage

See the [Testing Guide](tests.md) for more details.

## Documentation

- Update documentation for any new features or changes
- Use Markdown for documentation files
- Keep language clear and concise
- Include examples where appropriate

## Code Review

- All code changes require review
- Address review comments promptly
- Be respectful and constructive in code reviews
- Focus on the code, not the person

## Continuous Integration

The project uses CI to automatically run tests and style checks. Ensure your changes pass the CI workflow before requesting a review.

## Getting Help

If you need help with your contribution:

1. Check the documentation
2. Look for similar issues or discussions
3. Create an issue with a clear description of your problem
4. Tag it appropriately (e.g., "help wanted", "question")

Thank you for contributing to the Punch Clock project!