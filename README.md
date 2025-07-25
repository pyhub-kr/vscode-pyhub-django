# Django Power Tools for VS Code

Powerful Django development tools for VS Code that brings PyCharm-like features to your favorite editor.

## Features

This extension aims to solve three major pain points for Django developers in VS Code:

1. **Smart Path Configuration** - Automatically configure Python paths to resolve import errors
2. **Django-aware IntelliSense** - Auto-completion for Django ORM methods, model fields, URL names, and template tags  
3. **Workflow Automation** - Quick access to manage.py commands and seamless navigation between files

## Requirements

- VS Code 1.74.0 or higher
- Python 3.8 or higher
- Django 3.2 or higher
- Python extension for VS Code (ms-python.python)

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or install from source:
   ```bash
   git clone https://github.com/pyhub-kr/vscode-pyhub-django.git
   cd vscode-pyhub-django
   npm install
   npm run compile
   ```

## Usage

### Smart Path Configuration
The extension automatically detects your Django project structure by finding `manage.py` and configures Python paths accordingly.

### Django ORM Auto-completion
Get intelligent suggestions for:
- Model manager methods (e.g., `Model.objects.filter()`, `Model.objects.get()`)
- Model field names
- URL names in templates
- And more!

### Command Palette Integration
Access Django commands directly from VS Code:
- `Django: Start/Stop Development Server` - Run `runserver`
- `Django: Create Migrations` - Run `makemigrations`
- `Django: Apply Migrations` - Run `migrate`

## Development

### Setup
```bash
npm install
```

### Compile
```bash
npm run compile
```

### Watch
```bash
npm run watch
```

### Run Tests
```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.