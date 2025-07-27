from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import ListView, DetailView
from django.db.models import Q
from django.contrib import messages
from django.urls import reverse
from .models import Product, Category
from .forms import ProductSearchForm, AddToCartForm


class ProductListView(ListView):
    model = Product
    template_name = 'products/product_list.html'
    context_object_name = 'products'
    paginate_by = 12
    
    def get_queryset(self):
        queryset = Product.objects.available()
        
        # Category filter
        category_slug = self.kwargs.get('category_slug')
        if category_slug:
            category = get_object_or_404(Category, slug=category_slug)
            queryset = queryset.filter(category=category)
        
        # Search filter
        search_query = self.request.GET.get('q')
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(tags__name__icontains=search_query)
            ).distinct()
        
        # Sort filter
        sort_by = self.request.GET.get('sort', '-created_at')
        if sort_by in ['price', '-price', 'name', '-name', '-created_at']:
            queryset = queryset.order_by(sort_by)
        
        return queryset
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['categories'] = Category.objects.all()
        context['search_form'] = ProductSearchForm(self.request.GET)
        context['current_category'] = None
        
        category_slug = self.kwargs.get('category_slug')
        if category_slug:
            context['current_category'] = get_object_or_404(Category, slug=category_slug)
        
        return context


class ProductDetailView(DetailView):
    model = Product
    template_name = 'products/product_detail.html'
    context_object_name = 'product'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'
    
    def get_queryset(self):
        return Product.objects.available()
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['add_to_cart_form'] = AddToCartForm(initial={'quantity': 1})
        context['related_products'] = Product.objects.available().filter(
            category=self.object.category
        ).exclude(pk=self.object.pk)[:4]
        return context


def add_to_cart(request, slug):
    product = get_object_or_404(Product, slug=slug)
    
    if request.method == 'POST':
        form = AddToCartForm(request.POST)
        if form.is_valid():
            quantity = form.cleaned_data['quantity']
            # Add to cart logic here (session-based or database)
            messages.success(request, f'{product.name} added to cart!')
            return redirect('products:product_detail', slug=slug)
    
    return redirect('products:product_detail', slug=slug)


def featured_products(request):
    products = Product.objects.featured()[:8]
    return render(request, 'products/featured.html', {
        'products': products,
        'title': 'Featured Products'
    })


def sale_products(request):
    products = Product.objects.on_sale()
    return render(request, 'products/sale.html', {
        'products': products,
        'title': 'On Sale'
    })