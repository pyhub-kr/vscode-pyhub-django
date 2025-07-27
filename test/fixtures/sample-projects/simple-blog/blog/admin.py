from django.contrib import admin
from .models import Post, Comment, Category, Tag


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ['author', 'email', 'content', 'created_at', 'is_approved']
    readonly_fields = ['created_at']
    can_delete = True
    show_change_link = True


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'status', 'created_at', 'is_featured']
    list_filter = ['status', 'created_at', 'category', 'is_featured']
    search_fields = ['title', 'content', 'author__username']
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = [
        (None, {
            'fields': ['title', 'slug', 'author', 'category']
        }),
        ('Content', {
            'fields': ['content', 'excerpt']
        }),
        ('Status', {
            'fields': ['status', 'is_featured'],
            'classes': ['collapse']
        }),
        ('Tags', {
            'fields': ['tags']
        })
    ]
    
    filter_horizontal = ['tags']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [CommentInline]
    actions = ['make_published', 'make_featured']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('author', 'category').prefetch_related('tags')
    
    def make_published(self, request, queryset):
        updated = queryset.update(status='published')
        self.message_user(request, f'{updated} posts were successfully marked as published.')
    make_published.short_description = 'Mark selected posts as published'
    
    def make_featured(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} posts were successfully marked as featured.')
    make_featured.short_description = 'Mark selected posts as featured'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name', 'description']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


class CommentAdmin(admin.ModelAdmin):
    list_display = ['post', 'author', 'email', 'created_at', 'is_approved']
    list_filter = ['is_approved', 'created_at']
    search_fields = ['content', 'author', 'email']
    date_hierarchy = 'created_at'
    actions = ['approve_comments', 'reject_comments']
    
    def approve_comments(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(request, f'{updated} comments were approved.')
    approve_comments.short_description = 'Approve selected comments'
    
    def reject_comments(self, request, queryset):
        updated = queryset.update(is_approved=False)
        self.message_user(request, f'{updated} comments were rejected.')
    reject_comments.short_description = 'Reject selected comments'


admin.site.register(Comment, CommentAdmin)
