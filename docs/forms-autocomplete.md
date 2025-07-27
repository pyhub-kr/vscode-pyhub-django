# Django Forms Autocomplete

Django Power Tools provides comprehensive autocomplete support for Django forms, making form development faster and more efficient.

## Features

### 1. Form Field Autocomplete

When typing `forms.` in a Django form class, you'll get autocomplete suggestions for all Django form field types:

- **Basic Fields**: CharField, EmailField, IntegerField, FloatField, BooleanField
- **Date/Time Fields**: DateField, DateTimeField, TimeField
- **Choice Fields**: ChoiceField, MultipleChoiceField, TypedChoiceField
- **File Fields**: FileField, ImageField
- **Advanced Fields**: URLField, SlugField, RegexField
- **Model Fields**: ModelChoiceField, ModelMultipleChoiceField

Example:
```python
from django import forms

class ContactForm(forms.Form):
    name = forms.  # Autocomplete shows all field types
```

### 2. Field Parameter Autocomplete

Inside field constructors, get autocomplete for common field parameters:

- `required` - Whether the field is required
- `label` - Human-readable label
- `help_text` - Help text displayed with the field
- `initial` - Initial value
- `widget` - Widget to use for rendering
- `validators` - List of validation functions
- `error_messages` - Custom error messages
- `disabled` - Whether the field is disabled

Example:
```python
email = forms.EmailField(
    req  # Autocomplete suggests 'required'
)
```

### 3. Widget Autocomplete

When specifying `widget=forms.`, get autocomplete for all Django widgets:

- **Text Widgets**: TextInput, Textarea, PasswordInput
- **Number Widgets**: NumberInput
- **Email/URL Widgets**: EmailInput, URLInput
- **Date/Time Widgets**: DateInput, DateTimeInput, TimeInput
- **Choice Widgets**: Select, SelectMultiple, RadioSelect, CheckboxSelectMultiple
- **File Widgets**: FileInput, ClearableFileInput
- **Other Widgets**: HiddenInput, CheckboxInput

Example:
```python
message = forms.CharField(
    widget=forms.  # Autocomplete shows all widget types
)
```

### 4. Clean Method Generation

When defining validation methods, get autocomplete for:

- `clean()` - General form validation method
- `clean_<fieldname>()` - Field-specific validation methods

The autocomplete automatically detects fields in your form and suggests appropriate clean methods:

```python
class MyForm(forms.Form):
    email = forms.EmailField()
    name = forms.CharField()
    
    def clean_  # Autocomplete suggests: clean, clean_email, clean_name
```

### 5. ModelForm Support

Enhanced support for ModelForm classes:

#### Meta Class Options
Get autocomplete for all Meta class options:
- `model` - The model class to use
- `fields` - Fields to include (`'__all__'` or list of field names)
- `exclude` - Fields to exclude
- `widgets` - Custom widgets for fields
- `labels` - Custom labels for fields
- `help_texts` - Custom help texts
- `error_messages` - Custom error messages
- `field_classes` - Override default field classes

#### Model Selection
When typing `model = ` in a Meta class, get autocomplete for all available Django models in your project.

#### Field Selection
When specifying fields in `fields` or `exclude`, get autocomplete for all model fields:

```python
class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['  # Autocomplete shows all User model fields
```

## Usage Tips

1. **Import Forms Module**: Make sure to import Django forms module:
   ```python
   from django import forms
   # or
   from django.forms import ModelForm
   ```

2. **File Naming**: The extension provides enhanced support in files named `forms.py`, but also works in any Python file with Django forms imports.

3. **Custom Fields**: While the extension provides autocomplete for built-in Django fields, you can still use custom field classes as normal.

4. **Validation Methods**: The clean method autocomplete helps you follow Django's validation patterns correctly.

## Examples

### Basic Form Example
```python
from django import forms

class ContactForm(forms.Form):
    name = forms.CharField(
        max_length=100,
        required=True,
        help_text="Your full name"
    )
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={'class': 'form-control'})
    )
    message = forms.CharField(
        widget=forms.Textarea,
        help_text="Your message"
    )
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        # Custom validation logic
        return email
```

### ModelForm Example
```python
from django import forms
from .models import Post

class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['title', 'content', 'category']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 10}),
            'title': forms.TextInput(attrs={'class': 'form-control'})
        }
        labels = {
            'title': 'Post Title',
            'content': 'Post Content'
        }
    
    def clean_title(self):
        title = self.cleaned_data.get('title')
        if Post.objects.filter(title=title).exists():
            raise forms.ValidationError("A post with this title already exists")
        return title
```

## Troubleshooting

If autocomplete is not working:

1. Ensure the Django Power Tools extension is activated
2. Check that your project has been properly analyzed (you should see "Django project analysis completed" in the output)
3. Make sure you have the correct imports at the top of your file
4. Try reloading the VS Code window (Command Palette → "Developer: Reload Window")

## Future Enhancements

- FormSet and InlineFormSet support
- Custom widget parameter suggestions
- Form inheritance support
- Integration with Django crispy forms