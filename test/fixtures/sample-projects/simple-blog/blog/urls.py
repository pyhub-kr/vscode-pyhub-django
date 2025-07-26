from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
    path('', views.post_list, name='post_list'),
    path('<slug:post>/', views.post_detail, name='post_detail'),
    path('tag/<slug:tag_slug>/', views.post_list, name='post_list_by_tag'),
    path('archive/<int:year>/', views.post_archive_year, name='post_archive_year'),
    path('archive/<int:year>/<int:month>/', views.post_archive_month, name='post_archive_month'),
]