from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from .models import Post, Comment


def post_list(request, tag_slug=None):
    posts = Post.published.all()
    
    paginator = Paginator(posts, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'blog/post_list.html', {
        'page_obj': page_obj,
        'posts': page_obj,
    })


def post_detail(request, post):
    post = get_object_or_404(Post, slug=post, status='published')
    comments = post.comments.filter(active=True)
    
    return render(request, 'blog/post_detail.html', {
        'post': post,
        'comments': comments,
    })


def post_archive_year(request, year):
    posts = Post.published.filter(publish__year=year)
    return render(request, 'blog/post_archive.html', {
        'posts': posts,
        'year': year,
    })


def post_archive_month(request, year, month):
    posts = Post.published.filter(publish__year=year, publish__month=month)
    return render(request, 'blog/post_archive.html', {
        'posts': posts,
        'year': year,
        'month': month,
    })