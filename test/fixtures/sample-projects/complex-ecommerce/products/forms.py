from django import forms
from django.core.validators import MinValueValidator, MaxValueValidator
from .models import Product, Category


class ProductSearchForm(forms.Form):
    q = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Search products...',
            'class': 'form-control',
        })
    )
    category = forms.ModelChoiceField(
        queryset=Category.objects.all(),
        required=False,
        empty_label='All Categories',
        widget=forms.Select(attrs={
            'class': 'form-select',
        })
    )
    sort = forms.ChoiceField(
        choices=[
            ('-created_at', 'Newest First'),
            ('price', 'Price: Low to High'),
            ('-price', 'Price: High to Low'),
            ('name', 'Name: A to Z'),
            ('-name', 'Name: Z to A'),
        ],
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-select',
        })
    )


class AddToCartForm(forms.Form):
    quantity = forms.IntegerField(
        min_value=1,
        max_value=10,
        initial=1,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'style': 'width: 80px;',
        })
    )
    
    def __init__(self, *args, **kwargs):
        product = kwargs.pop('product', None)
        super().__init__(*args, **kwargs)
        
        if product:
            self.fields['quantity'].max_value = min(product.stock, 10)
            self.fields['quantity'].validators = [
                MinValueValidator(1),
                MaxValueValidator(self.fields['quantity'].max_value)
            ]


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'price', 'discount_percentage',
            'stock', 'category', 'tags', 'is_available', 'is_featured'
        ]
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
            'tags': forms.CheckboxSelectMultiple(),
        }
        help_texts = {
            'discount_percentage': 'Enter a percentage between 0 and 100',
            'stock': 'Current inventory count',
            'is_featured': 'Featured products appear on the homepage',
        }
    
    def clean_discount_percentage(self):
        discount = self.cleaned_data.get('discount_percentage')
        if discount < 0 or discount > 100:
            raise forms.ValidationError('Discount must be between 0 and 100')
        return discount