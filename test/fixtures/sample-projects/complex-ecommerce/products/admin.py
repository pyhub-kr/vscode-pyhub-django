from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product, ProductImage, ProductReview


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['image', 'alt_text', 'is_primary', 'display_order']
    ordering = ['display_order']


class ProductReviewInline(admin.StackedInline):
    model = ProductReview
    extra = 0
    fields = ['user', 'rating', 'comment', 'created_at']
    readonly_fields = ['created_at']
    can_delete = True


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'is_active', 'product_count']
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['name']
    
    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Number of Products'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price_display', 'stock', 'is_available', 
                    'is_featured', 'created_at', 'view_on_site_link']
    list_filter = ['category', 'is_available', 'is_featured', 'created_at']
    search_fields = ['name', 'description', 'sku']
    prepopulated_fields = {'slug': ('name',)}
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['name', 'slug', 'sku', 'category', 'description']
        }),
        ('Pricing & Inventory', {
            'fields': ['price', 'compare_at_price', 'stock'],
            'classes': ['wide']
        }),
        ('Status', {
            'fields': ['is_available', 'is_featured'],
        }),
        ('SEO', {
            'fields': ['meta_title', 'meta_description'],
            'classes': ['collapse']
        })
    ]
    
    readonly_fields = ['created_at', 'updated_at', 'view_count']
    inlines = [ProductImageInline, ProductReviewInline]
    actions = ['make_featured', 'make_unfeatured', 'mark_as_available', 'mark_as_unavailable']
    
    # Custom admin methods
    def price_display(self, obj):
        return f'${obj.price}'
    price_display.short_description = 'Price'
    price_display.admin_order_field = 'price'
    
    def view_on_site_link(self, obj):
        return format_html(
            '<a href="/products/{}" target="_blank">View</a>',
            obj.slug
        )
    view_on_site_link.short_description = 'View on site'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('category').prefetch_related('images', 'reviews')
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
    
    def make_featured(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} products marked as featured.')
    make_featured.short_description = 'Mark as featured'
    
    def make_unfeatured(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'{updated} products unmarked as featured.')
    make_unfeatured.short_description = 'Unmark as featured'
    
    def mark_as_available(self, request, queryset):
        updated = queryset.update(is_available=True)
        self.message_user(request, f'{updated} products marked as available.')
    mark_as_available.short_description = 'Mark as available'
    
    def mark_as_unavailable(self, request, queryset):
        updated = queryset.update(is_available=False)
        self.message_user(request, f'{updated} products marked as unavailable.')
    mark_as_unavailable.short_description = 'Mark as unavailable'
    
    # Override formfield customization
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "category":
            kwargs["queryset"] = Category.objects.filter(is_active=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    # Permission methods
    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete products
        return request.user.is_superuser


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'image_thumbnail', 'alt_text', 'is_primary', 'display_order']
    list_filter = ['is_primary', 'product__category']
    search_fields = ['product__name', 'alt_text']
    ordering = ['product', 'display_order']
    
    def image_thumbnail(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="50" height="50" />',
                obj.image.url
            )
        return '-'
    image_thumbnail.short_description = 'Thumbnail'


@admin.register(ProductReview)  
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'created_at', 'is_verified']
    list_filter = ['rating', 'is_verified', 'created_at']
    search_fields = ['product__name', 'user__username', 'comment']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
    
    actions = ['verify_reviews', 'unverify_reviews']
    
    def verify_reviews(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} reviews verified.')
    verify_reviews.short_description = 'Mark as verified'
    
    def unverify_reviews(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f'{updated} reviews unverified.')
    unverify_reviews.short_description = 'Mark as unverified'


# Customize admin site
admin.site.site_header = 'E-Commerce Admin'
admin.site.site_title = 'E-Commerce Admin Portal'
admin.site.index_title = 'Welcome to E-Commerce Administration'
