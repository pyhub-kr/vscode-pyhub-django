from django import forms
from django.forms import ModelForm
from .models import Post, Comment


class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['title', 'slug', 'body', 'status']
        widgets = {
            'body': forms.Textarea(attrs={'rows': 10, 'cols': 80}),
            'status': forms.Select(choices=Post.STATUS_CHOICES),
        }
        labels = {
            'title': 'Post Title',
            'slug': 'URL Slug',
        }
        help_texts = {
            'slug': 'Enter a URL-friendly version of the title',
        }


class CommentForm(ModelForm):
    class Meta:
        model = Comment
        fields = ['name', 'email', 'body']
        exclude = ['post', 'created', 'updated', 'active']
        

class ContactForm(forms.Form):
    name = forms.CharField(max_length=100, required=True)
    email = forms.EmailField(required=True)
    subject = forms.CharField(max_length=200)
    message = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 5}),
        required=True
    )
    cc_myself = forms.BooleanField(required=False)
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and not email.endswith('@example.com'):
            raise forms.ValidationError('Please use a valid email address.')
        return email


class SearchForm(forms.Form):
    query = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Search posts...',
            'class': 'form-control',
        })
    )
    category = forms.ChoiceField(
        choices=[
            ('all', 'All Categories'),
            ('tech', 'Technology'),
            ('life', 'Lifestyle'),
            ('travel', 'Travel'),
        ],
        required=False,
        initial='all'
    )