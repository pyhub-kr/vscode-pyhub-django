# Testing Django Template Features

## Feature 1: Template Path Navigation (Ctrl+Click)

1. Open `/Users/allieus/test-django-project/blog/views.py`
2. Place cursor on `"blog/post_list.html"` in the render() call (line 9)
3. Ctrl+Click (or Cmd+Click on Mac) on the template path
4. **Expected**: The template file `/Users/allieus/test-django-project/blog/templates/blog/post_list.html` should open

## Feature 2: Template Context Variable Autocomplete

1. Open `/Users/allieus/test-django-project/blog/templates/blog/post_list.html`
2. Type `{{ ` anywhere in the template
3. **Expected**: Autocomplete should show `post_list` (from the view context)
4. Inside the `{% for post in post_list %}` loop, type `{{ post.`
5. **Expected**: Autocomplete should show Post model fields:
   - `title`
   - `author`
   - `content`
   - `created_at`
   - `updated_at`
   - `is_published`
   - `comments` (related_name from Comment model)

## Additional Tests

### Built-in Variables
- Type `{{ ` and check for Django built-in variables like:
  - `request`
  - `user`
  - `csrf_token`
  - `STATIC_URL`
  - `forloop` (inside for loops)

### QuerySet Methods
- Type `{{ post_list.` and check for QuerySet methods:
  - `all`
  - `count`
  - `first`
  - `last`
  - `exists`

### Related Model Fields
- Type `{{ post.author.` and check if User model fields appear
- Type `{{ post.comments.` and check for QuerySet methods

## Running the Extension

1. Open VS Code in the extension directory
2. Press F5 to launch a new VS Code window with the extension loaded
3. Open the test Django project in the new window
4. Follow the test steps above