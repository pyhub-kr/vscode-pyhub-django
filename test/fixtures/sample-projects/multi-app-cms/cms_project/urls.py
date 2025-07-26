"""CMS Project URL Configuration"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('blog/', include('blog.urls')),
    path('users/', include('users.urls')),
    path('', include('pages.urls')),
]