import * as assert from 'assert';
import * as vscode from 'vscode';
import { createContainer } from '../../container/inversify.config';
import { TYPES } from '../../container/types';
import { DjangoAdminAnalyzer } from '../../analyzers/djangoAdminAnalyzer';
import { mock } from 'ts-mockito';

suite('Django Admin Analyzer Test Suite', () => {
    let container: ReturnType<typeof createContainer>;
    let adminAnalyzer: DjangoAdminAnalyzer;

    setup(() => {
        const context = mock<vscode.ExtensionContext>();
        container = createContainer(context as any);
        adminAnalyzer = container.get<DjangoAdminAnalyzer>(TYPES.DjangoAdminAnalyzer);
    });

    test('Should analyze ModelAdmin class with decorator', async () => {
        const adminContent = `
from django.contrib import admin
from .models import Product, Category

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'category', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['-created_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('category')
`;

        await adminAnalyzer.analyzeAdminFile(adminContent, '/test/admin.py');
        
        const adminClasses = adminAnalyzer.getAdminClasses();
        assert.strictEqual(adminClasses.size, 1, 'Should find one admin class');
        
        const productAdmin = adminAnalyzer.getAdminClass('ProductAdmin');
        assert.ok(productAdmin, 'Should find ProductAdmin');
        assert.strictEqual(productAdmin.modelName, 'Product');
        assert.strictEqual(productAdmin.isRegistered, true);
        
        // Check attributes
        assert.ok(productAdmin.attributes.has('list_display'));
        assert.deepStrictEqual(productAdmin.attributes.get('list_display'), 
            ['name', 'price', 'category', 'is_active']);
        
        // Check methods
        assert.ok(productAdmin.methods.includes('get_queryset'));
    });

    test('Should analyze ModelAdmin with admin.site.register', async () => {
        const adminContent = `
from django.contrib import admin
from .models import Category

class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    
admin.site.register(Category, CategoryAdmin)
`;

        await adminAnalyzer.analyzeAdminFile(adminContent, '/test/admin.py');
        
        const categoryAdmin = adminAnalyzer.getAdminClass('CategoryAdmin');
        assert.ok(categoryAdmin, 'Should find CategoryAdmin');
        assert.strictEqual(categoryAdmin.modelName, 'Category');
        assert.strictEqual(categoryAdmin.isRegistered, true);
    });

    test('Should analyze TabularInline', async () => {
        const adminContent = `
from django.contrib import admin
from .models import Product, ProductImage

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['image', 'caption', 'is_primary']
    
class ProductAdmin(admin.ModelAdmin):
    inlines = [ProductImageInline]
`;

        await adminAnalyzer.analyzeAdminFile(adminContent, '/test/admin.py');
        
        const inlines = adminAnalyzer.getAdminInlines();
        assert.strictEqual(inlines.size, 1, 'Should find one inline');
        
        const imageInline = inlines.get('ProductImageInline');
        assert.ok(imageInline, 'Should find ProductImageInline');
        assert.strictEqual(imageInline.type, 'TabularInline');
        assert.strictEqual(imageInline.modelName, 'ProductImage');
        
        const productAdmin = adminAnalyzer.getAdminClass('ProductAdmin');
        assert.ok(productAdmin, 'Should find ProductAdmin');
        assert.deepStrictEqual(productAdmin!.inlines, ['ProductImageInline']);
    });

    test('Should get admin attributes list', () => {
        const attributes = adminAnalyzer.getAdminAttributes();
        assert.ok(attributes.includes('list_display'));
        assert.ok(attributes.includes('list_filter'));
        assert.ok(attributes.includes('search_fields'));
        assert.ok(attributes.includes('fieldsets'));
        assert.ok(attributes.includes('readonly_fields'));
        assert.ok(attributes.includes('autocomplete_fields'));
    });

    test('Should get admin methods list', () => {
        const methods = adminAnalyzer.getAdminMethods();
        assert.ok(methods.includes('get_queryset'));
        assert.ok(methods.includes('save_model'));
        assert.ok(methods.includes('has_add_permission'));
        assert.ok(methods.includes('formfield_for_foreignkey'));
        assert.ok(methods.includes('get_list_display'));
    });

    test('Should get inline attributes list', () => {
        const attributes = adminAnalyzer.getInlineAttributes();
        assert.ok(attributes.includes('model'));
        assert.ok(attributes.includes('extra'));
        assert.ok(attributes.includes('fields'));
        assert.ok(attributes.includes('readonly_fields'));
        assert.ok(attributes.includes('show_change_link'));
    });

    test('Should handle complex fieldsets', async () => {
        const adminContent = `
from django.contrib import admin
from .models import Product

class ProductAdmin(admin.ModelAdmin):
    fieldsets = [
        (None, {
            'fields': ['name', 'slug', 'category']
        }),
        ('Pricing', {
            'fields': ['price', 'discount_price'],
            'classes': ['collapse']
        }),
        ('Status', {
            'fields': ['is_active', 'featured']
        })
    ]
`;

        await adminAnalyzer.analyzeAdminFile(adminContent, '/test/admin.py');
        
        const productAdmin = adminAnalyzer.getAdminClass('ProductAdmin');
        assert.ok(productAdmin, 'Should find ProductAdmin');
        assert.ok(productAdmin.attributes.has('fieldsets'));
    });
});
