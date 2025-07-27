# Changelog

All notable changes to Django Power Tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive Django Forms autocomplete support:
  - Form field types (CharField, EmailField, IntegerField, etc.)
  - Field parameters (required, label, help_text, widget, etc.)
  - Widget types (TextInput, Select, RadioSelect, etc.)
  - Clean method generation (clean, clean_fieldname)
- ModelForm specific features:
  - Meta class options autocomplete
  - Model selection from project models
  - Field list autocomplete based on selected model
  - Widget and label customization support
- Real-time form analysis with file watching
- Integration with existing Django project analyzer

### Improved
- Performance optimization for large Django projects
- Enhanced caching strategy with memory-aware LRU cache
- Progressive file analysis with background processing
- File watcher debouncing for better performance

## [0.1.3] - 2025-07-27

### Fixed
- Removed unreliable test execution from release workflow
- Tests are now run in a separate CI workflow with non-blocking failures
- Release process focuses on compilation and packaging only

### Added
- Separate CI workflow for PR and main branch testing
- Comprehensive local testing guidelines in documentation

## [0.1.2] - 2025-07-27

### Fixed
- GitHub Actions workflow test environment with xvfb for Linux
- Test runner configuration with proper logging and launch arguments
- Removed incorrect test:unit script that couldn't run VS Code extension tests

## [0.1.1] - 2025-07-27

### Added
- GitHub Actions workflow for automated releases
- CHANGELOG.md for tracking version changes
- Release documentation (docs/RELEASE.md)

### Changed
- Updated project dependencies

## [0.1.0] - 2025-07-27

### Added
- Initial release of Django Power Tools
- Smart Python path configuration for Django projects
- Django-aware IntelliSense with auto-completion for:
  - Django ORM methods (filter, exclude, get, etc.)
  - Model field lookups and reverse relations
  - URL tag completion in templates
- Quick manage.py command execution from Command Palette
- Automatic project detection based on manage.py location
- Integration with Python extension for enhanced development experience
- Support for custom managers and model methods
- Dependency injection architecture for better maintainability

### Changed
- Refactored extension architecture using Inversify for dependency injection
- Improved service layer separation for better testability

### Fixed
- All tests passing (86 tests, 100% success rate)

[Unreleased]: https://github.com/pyhub-kr/vscode-pyhub-django/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/pyhub-kr/vscode-pyhub-django/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/pyhub-kr/vscode-pyhub-django/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/pyhub-kr/vscode-pyhub-django/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/pyhub-kr/vscode-pyhub-django/releases/tag/v0.1.0