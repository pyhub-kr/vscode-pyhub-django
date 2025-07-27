# Manual Test Guide: Cross-File Navigation

This guide explains how to test the cross-file navigation (Go to Definition) feature for Django Power Tools.

## Prerequisites

1. Make sure the extension is compiled: `npm run compile`
2. Open the extension in development mode: Press `F5` in VS Code with the extension project open
3. In the new VS Code window, open the test Django project at `/Users/allieus/test-django-project`

## Test Scenarios

### 1. Template URL Tag → URL Pattern Definition

1. Open `/Users/allieus/test-django-project/blog/templates/blog/post_list.html`
2. Find the line with `{% url 'blog:post-detail' pk=post.pk %}`
3. Place your cursor on `'blog:post-detail'` (anywhere within the quotes)
4. Press `Cmd+Click` (Mac) or `Ctrl+Click` (Windows/Linux)
5. **Expected**: VS Code should navigate to `/blog/urls.py` and position the cursor at the line containing `name='post-detail'`

### 2. URL Pattern View Reference → View Definition

1. Open `/Users/allieus/test-django-project/blog/urls.py`
2. Find the line with `path('', views.PostListView.as_view(), name='post-list')`
3. Place your cursor on `PostListView`
4. Press `Cmd+Click` (Mac) or `Ctrl+Click` (Windows/Linux)
5. **Expected**: VS Code should navigate to `/blog/views.py` and position the cursor at the `class PostListView` definition

### 3. Template Path in View → Template File

1. Open `/Users/allieus/test-django-project/blog/views.py`
2. Find the line with `template_name = 'blog/post_list.html'`
3. Place your cursor on `'blog/post_list.html'` (anywhere within the quotes)
4. Press `Cmd+Click` (Mac) or `Ctrl+Click` (Windows/Linux)
5. **Expected**: VS Code should navigate to `/blog/templates/blog/post_list.html`

### 4. Function-based View Reference → View Definition

1. Open `/Users/allieus/test-django-project/blog/urls.py`
2. Find the line with `path('create/', views.create_post, name='post-create')`
3. Place your cursor on `create_post`
4. Press `Cmd+Click` (Mac) or `Ctrl+Click` (Windows/Linux)
5. **Expected**: VS Code should navigate to `/blog/views.py` and position the cursor at the `def create_post` definition

## Troubleshooting

If navigation doesn't work:

1. Check the Output panel (View → Output) and select "Django Power Tools" from the dropdown
2. Look for any error messages
3. Ensure the Django project was detected (you should see "Django project detected!" notification)
4. Try reloading the VS Code window (Cmd+R or Ctrl+R)

## Known Limitations

- Navigation only works for:
  - Django template files (HTML)
  - Python files
- The extension must detect a Django project (presence of `manage.py`)
- URL patterns must use the `name` parameter
- Template paths must be string literals (not variables)