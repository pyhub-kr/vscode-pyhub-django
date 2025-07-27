from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    # Product list views
    path('', views.ProductListView.as_view(), name='product_list'),
    path('category/<slug:category_slug>/', views.ProductListView.as_view(), name='category_products'),
    path('featured/', views.featured_products, name='featured_products'),
    path('sale/', views.sale_products, name='sale_products'),
    
    # Product detail
    path('product/<slug:slug>/', views.ProductDetailView.as_view(), name='product_detail'),
    
    # Cart actions
    path('product/<slug:slug>/add-to-cart/', views.add_to_cart, name='add_to_cart'),
]