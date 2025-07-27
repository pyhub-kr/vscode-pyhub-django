# Manual Test Guide: Context-Aware Template Autocomplete

This guide provides manual testing steps for the context-aware template autocomplete feature in Django Power Tools.

## Prerequisites

1. VS Code with Django Power Tools extension installed
2. A Django project with models, views, and templates
3. Python extension installed and configured

## Test Scenarios

### 1. Basic Context Variable Autocomplete

**Setup:**
Create a simple view that passes context to a template:

```python
# views.py
from django.shortcuts import render
from myapp.models import Post, Category

def post_list(request):
    posts = Post.objects.filter(is_published=True)
    categories = Category.objects.all()
    return render(request, 'blog/post_list.html', {
        'posts': posts,
        'categories': categories,
        'page_title': 'My Blog Posts'
    })
```

**Test Steps:**
1. Open `templates/blog/post_list.html`
2. Type `{{ ` and wait for autocomplete
3. Verify that `posts`, `categories`, and `page_title` appear in the suggestions
4. Select a variable and verify it inserts correctly

**Expected Results:**
- All context variables from the view should appear
- Each variable should show its type (QuerySet, string, etc.) if available

### 2. QuerySet Method Autocomplete

**Test Steps:**
1. In the template, type `{{ posts.`
2. Wait for autocomplete suggestions
3. Verify QuerySet methods appear (count, first, last, exists, all)

**Expected Results:**
- Common QuerySet methods should be suggested
- Methods should have appropriate descriptions

### 3. Form Method Autocomplete

**Setup:**
```python
# views.py
def contact_form(request):
    form = ContactForm()
    return render(request, 'contact.html', {'form': form})
```

**Test Steps:**
1. In the template, type `{{ form.`
2. Verify form rendering methods appear (as_p, as_table, as_ul)
3. Verify form properties appear (errors, is_valid)

**Expected Results:**
- Form-specific methods and properties should be suggested

### 4. Loop Variable Recognition

**Test Steps:**
1. Create a for loop in the template:
   ```django
   {% for post in posts %}
       {{ |
   {% endfor %}
   ```
2. Place cursor at `|` and trigger autocomplete
3. Verify `post` appears in suggestions
4. Verify `forloop` special variable appears

**Expected Results:**
- Loop variable should be recognized and suggested
- `forloop` object should be available

### 5. Nested Loop Variables

**Test Steps:**
1. Create nested loops:
   ```django
   {% for category in categories %}
       {% for post in category.posts.all %}
           {{ |
       {% endfor %}
   {% endfor %}
   ```
2. Place cursor at `|` and trigger autocomplete
3. Verify only the innermost loop variable (`post`) is suggested

**Expected Results:**
- Only the current scope's loop variable should be suggested

### 6. Class-Based View Context

**Setup:**
```python
# views.py
from django.views.generic import ListView

class PostListView(ListView):
    model = Post
    template_name = 'blog/post_list.html'
    context_object_name = 'posts'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['featured_posts'] = Post.objects.filter(featured=True)
        context['total_count'] = Post.objects.count()
        return context
```

**Test Steps:**
1. Open the corresponding template
2. Type `{{ ` and verify `featured_posts` and `total_count` appear
3. Verify the default `posts` variable is available

**Expected Results:**
- Variables added in `get_context_data` should be recognized
- Default context variables from CBV should also appear

### 7. Template Without Matching View

**Test Steps:**
1. Open a template that doesn't have a corresponding view
2. Type `{{ ` and trigger autocomplete
3. Verify no errors occur

**Expected Results:**
- Should gracefully handle templates without context
- No error messages should appear

### 8. Performance Test

**Test Steps:**
1. Open a template in a large project (100+ views)
2. Type `{{ ` and measure response time
3. Navigate between different templates and test autocomplete

**Expected Results:**
- Autocomplete should respond within 1-2 seconds
- Switching between templates should maintain good performance

## Troubleshooting

### Context variables not appearing:
1. Ensure the view file has been saved
2. Check that the template path in `render()` matches the actual file path
3. Try reopening the template file

### Slow performance:
1. Check VS Code's output panel for any errors
2. Verify the project structure is correctly detected
3. Consider restarting VS Code

## Edge Cases to Test

1. **Multiple render() calls in one view** - Should handle all of them
2. **Dynamic template names** - May not be detected
3. **Context passed as variable** - Should attempt to resolve
4. **Include tags** - Context should be inherited
5. **Custom template tags** - Won't affect context detection