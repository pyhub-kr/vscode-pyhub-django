from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'api'

router = DefaultRouter()
router.register(r'posts', views.PostViewSet, basename='post')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    path('v1/', include(router.urls)),
    path('v1/auth/', include('rest_framework.urls')),
]