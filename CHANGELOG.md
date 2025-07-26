# Change Log

All notable changes to the "Django Power Tools" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-XX

### Added
- 🔧 **Smart Project Path Configuration**
  - Automatic Django project detection via `manage.py` location
  - Auto-configuration of Python analysis paths
  - Support for multiple Django projects in workspace
  - Real-time path updates on file changes

- 🧠 **Django-aware IntelliSense**
  - Complete Django ORM method auto-completion (30+ QuerySet methods)
  - Model field suggestions with appropriate lookups
  - Custom manager and method recognition
  - Model inheritance support

- 🎯 **URL Tag Auto-completion**
  - Template `{% url %}` tag completion
  - Python `reverse()` function support
  - Namespace-aware URL patterns
  - URL parameter hints

- 🚀 **manage.py Command Palette**
  - Quick access to all Django management commands
  - Dedicated terminal for development server
  - Recent command history
  - Automatic virtual environment activation

- 📦 **Python Extension Integration**
  - Seamless integration with Microsoft Python Extension
  - Virtual environment auto-detection
  - Shared Python interpreter configuration

- 🧪 **Comprehensive Testing**
  - Unit test coverage >80%
  - Integration tests with sample Django projects
  - Performance benchmarks
  - CI/CD pipeline with GitHub Actions

### Infrastructure
- TypeScript-based extension architecture
- Mocha test framework with NYC coverage
- Multi-platform CI testing (Windows, macOS, Linux)
- Comprehensive documentation in Korean and English

## [Unreleased]

### Planned
- Django REST Framework support
- Template tag/filter auto-completion
- Django Admin integration
- Migration visualization
- Docker integration
- Multi-language documentation

---

[0.1.0]: https://github.com/pyhub-kr/vscode-pyhub-django/releases/tag/v0.1.0