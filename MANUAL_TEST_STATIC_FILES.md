# Manual Test Guide: Static File Path Autocomplete

This guide provides manual testing steps for the static file path autocomplete feature in Django Power Tools.

## Prerequisites

1. VS Code with Django Power Tools extension installed
2. A Django project with static files
3. Python extension installed and configured

## Setup Test Environment

### 1. Create Static File Structure

Create the following directory structure in your Django project:

```
myproject/
├── static/
│   ├── css/
│   │   ├── base.css
│   │   ├── components/
│   │   │   ├── header.css
│   │   │   └── footer.css
│   │   └── pages/
│   │       ├── home.css
│   │       └── about.css
│   ├── js/
│   │   ├── main.js
│   │   └── utils.js
│   └── images/
│       ├── logo.png
│       └── icons/
│           ├── facebook.svg
│           └── twitter.svg
├── myapp/
│   └── static/
│       └── myapp/
│           ├── style.css
│           └── script.js
└── settings.py
```

### 2. Configure Settings

In your `settings.py`:

```python
STATIC_URL = '/static/'

STATICFILES_DIRS = [
    BASE_DIR / 'static',
]
```

## Test Scenarios

### 1. Basic Static File Autocomplete

**Test Steps:**
1. Create a new template file: `templates/test.html`
2. Add `{% load static %}` at the top
3. Type `<link rel="stylesheet" href="{% static '` and wait for autocomplete
4. Verify that top-level directories appear: `css/`, `js/`, `images/`

**Expected Results:**
- Directories should show with folder icons
- Files should show with appropriate icons
- Autocomplete should trigger on quote character

### 2. Navigate Nested Directories

**Test Steps:**
1. In the template, type `{% static 'css/` 
2. Wait for autocomplete to show CSS subdirectories
3. Select `components/` and continue typing
4. Verify nested files appear

**Expected Results:**
- Should see `components/` and `pages/` directories
- After selecting `components/`, should see `header.css` and `footer.css`
- Directory navigation should work seamlessly

### 3. File Type Icons

**Test Steps:**
1. Type `{% static '` and observe the icons
2. Check different file types:
   - CSS files: should show code icon
   - JS files: should show code icon
   - Image files: should show media icon

**Expected Results:**
- Each file type should have an appropriate icon
- Icons should be clearly visible

### 4. App-Specific Static Files

**Test Steps:**
1. Ensure you have app-specific static files (e.g., `myapp/static/myapp/`)
2. In a template, type `{% static 'myapp/`
3. Verify app-specific files appear

**Expected Results:**
- Should see files from app-specific static directories
- Path should be relative to the static root

### 5. File Size Information

**Test Steps:**
1. Type `{% static 'css/base.css` and hover over the suggestion
2. Check the documentation popup

**Expected Results:**
- Should show file size (e.g., "Size: 2.5 KB")
- Size should be formatted appropriately (B, KB, MB)

### 6. Real-time Updates

**Test Steps:**
1. Open a template with static tag autocomplete
2. Add a new file to the static directory (e.g., `static/css/new.css`)
3. Go back to the template and trigger autocomplete again

**Expected Results:**
- New file should appear in suggestions immediately
- No need to restart VS Code

### 7. Without {% load static %}

**Test Steps:**
1. Create a template without `{% load static %}`
2. Type `{% static '` and try to trigger autocomplete

**Expected Results:**
- No autocomplete should appear
- Feature only works when static is loaded

### 8. Performance Test

**Test Steps:**
1. Add 100+ static files to your project
2. Trigger autocomplete in a template
3. Measure response time

**Expected Results:**
- Autocomplete should appear within 100ms
- Performance should remain good with many files

### 9. STATICFILES_DIRS Configuration

**Test Steps:**
1. Add custom directories to STATICFILES_DIRS:
   ```python
   STATICFILES_DIRS = [
       BASE_DIR / 'static',
       BASE_DIR / 'assets',
       '/absolute/path/to/static',
   ]
   ```
2. Add files to these directories
3. Trigger autocomplete

**Expected Results:**
- Files from all configured directories should appear
- Both relative and absolute paths should work

### 10. Edge Cases

**Test File Names:**
- Files with spaces: `my file.css`
- Files with special characters: `style-v2.0.css`
- Very long file names
- Files without extensions

**Expected Results:**
- All files should be handled correctly
- Special characters should not break autocomplete

## Troubleshooting

### Static files not appearing:
1. Ensure Django project is properly detected (check for manage.py)
2. Verify STATICFILES_DIRS is configured correctly
3. Check VS Code output panel for any errors
4. Try restarting VS Code

### Slow performance:
1. Check the number of static files
2. Verify file watcher is not consuming too many resources
3. Check for circular symbolic links in static directories

## Performance Benchmarks

| Scenario | Expected Time |
|----------|---------------|
| Initial scan (100 files) | < 500ms |
| Autocomplete trigger | < 100ms |
| Directory navigation | < 50ms |
| File system update | < 200ms |