# Changelog

All notable changes to Django Power Tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## [0.1.0] - TBD
- Initial beta release

[Unreleased]: https://github.com/pyhub-kr/vscode-pyhub-django/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/pyhub-kr/vscode-pyhub-django/releases/tag/v0.1.0