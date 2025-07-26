# Django Power Tools 사용자 가이드

## 목차

1. [시작하기](#시작하기)
2. [스마트 경로 구성](#스마트-경로-구성)
3. [Django ORM 자동 완성](#django-orm-자동-완성)
4. [URL 태그 자동 완성](#url-태그-자동-완성)
5. [manage.py 명령 팔레트](#managepy-명령-팔레트)
6. [고급 기능](#고급-기능)
7. [팁과 트릭](#팁과-트릭)

## 시작하기

### 설치 후 첫 단계

1. **Django 프로젝트 열기**
   ```bash
   code /path/to/your/django-project
   ```

2. **Python 인터프리터 설정**
   - `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
   - "Python: Select Interpreter" 입력
   - 프로젝트의 가상환경 선택

3. **확장 활성화 확인**
   - 상태 표시줄에 "Django project detected!" 메시지 확인
   - 출력 패널에서 "Django Power Tools" 채널 확인

## 스마트 경로 구성

### 자동 경로 설정

Django Power Tools는 프로젝트를 열면 자동으로:
- `manage.py` 파일 위치 탐지
- 프로젝트 루트를 Python 분석 경로에 추가
- import 오류 즉시 해결

### 수동 경로 구성

여러 Django 프로젝트가 있는 경우:

1. **Command Palette** 열기 (`Ctrl+Shift+P`)
2. "Django Power Tools: Configure Python Paths" 실행
3. 추가할 프로젝트 선택

### 경로 제거

불필요한 경로 제거:
1. "Django Power Tools: Remove Project from Python Paths" 실행
2. 제거할 경로 선택

## Django ORM 자동 완성

### QuerySet 메서드

```python
from myapp.models import Article

# 기본 쿼리
articles = Article.objects.all()
articles = Article.objects.filter(status='published')
articles = Article.objects.exclude(author=None)

# 체이닝
recent_articles = Article.objects.filter(
    status='published'
).order_by('-created_at').select_related('author')

# 집계 함수
from django.db.models import Count, Avg
stats = Article.objects.aggregate(
    total=Count('id'),
    avg_views=Avg('view_count')
)
```

### 필드 Lookup

```python
# 문자열 필드
Article.objects.filter(title__icontains='django')
Article.objects.filter(title__startswith='Tutorial')
Article.objects.filter(slug__regex=r'^[a-z]+$')

# 날짜/시간 필드
Article.objects.filter(created_at__year=2024)
Article.objects.filter(created_at__month=1)
Article.objects.filter(created_at__date__gte='2024-01-01')

# 관계 필드
Article.objects.filter(author__username='john')
Article.objects.filter(tags__name__in=['django', 'python'])
```

### 커스텀 매니저

```python
# models.py
class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(status='published')
    
    def by_author(self, author):
        return self.get_queryset().filter(author=author)

class Article(models.Model):
    # ... fields ...
    
    objects = models.Manager()
    published = PublishedManager()  # 커스텀 매니저

# views.py
# 커스텀 매니저 메서드도 자동 완성됩니다
articles = Article.published.by_author(request.user)
```

### 모델 인스턴스

```python
article = Article.objects.first()

# 필드 접근
article.title
article.content
article.created_at

# 메서드 호출
article.save()
article.delete()
article.get_absolute_url()

# 관계 접근
article.author.username
article.comments.all()
article.tags.add(tag)
```

## URL 태그 자동 완성

### 템플릿에서 사용

```django
<!-- 기본 URL 태그 -->
<a href="{% url 'home' %}">Home</a>

<!-- 네임스페이스가 있는 URL -->
<a href="{% url 'blog:post_list' %}">Blog</a>

<!-- 파라미터가 있는 URL -->
<a href="{% url 'blog:post_detail' slug=post.slug %}">{{ post.title }}</a>
<a href="{% url 'blog:archive_year' year=2024 %}">2024 Archive</a>

<!-- 자동 완성 트리거 -->
{% url '|' %}  <!-- 여기서 Ctrl+Space -->
```

### Python 코드에서 사용

```python
from django.urls import reverse
from django.shortcuts import redirect

# reverse 함수
url = reverse('blog:post_list')
url = reverse('blog:post_detail', kwargs={'slug': 'my-post'})

# redirect 함수
return redirect('home')
return redirect('blog:post_detail', slug=post.slug)
```

### URL 패턴 정의

```python
# urls.py
from django.urls import path
from . import views

app_name = 'blog'  # 네임스페이스 설정

urlpatterns = [
    path('', views.PostListView.as_view(), name='post_list'),
    path('<slug:slug>/', views.PostDetailView.as_view(), name='post_detail'),
    path('tag/<str:tag>/', views.PostByTagView.as_view(), name='posts_by_tag'),
]
```

## manage.py 명령 팔레트

### 명령 실행하기

1. **Command Palette** 열기 (`Ctrl+Shift+P`)
2. "Django Power Tools: Run manage.py Command" 선택
3. 원하는 명령 선택 또는 검색

### 빠른 액세스 명령

자주 사용하는 명령에 대한 단축키:

- **개발 서버 실행**: "Django Power Tools: Run Server"
- **마이그레이션 생성**: "Django Power Tools: Make Migrations"
- **마이그레이션 적용**: "Django Power Tools: Migrate Database"
- **Django Shell**: "Django Power Tools: Open Django Shell"

### 명령 옵션

일부 명령은 추가 입력이 필요합니다:

```bash
# runserver - 포트 번호 입력
> Enter port number (default: 8000): 8080

# makemigrations - 앱 이름 입력 (선택사항)
> Enter app name (optional): blog

# test - 테스트 경로 입력
> Enter test path (optional): myapp.tests.TestModels
```

### 터미널 관리

- **runserver**: 전용 터미널에서 실행 (재시작 시 자동 중지)
- **기타 명령**: 공유 터미널에서 실행
- 터미널은 자동으로 가상환경 활성화

## 고급 기능

### 프로젝트 재스캔

모델이나 URL이 업데이트되었지만 자동 완성이 반영되지 않을 때:

1. `Ctrl+Shift+P`
2. "Django Power Tools: Rescan Django Project" 실행

### 다중 Django 프로젝트

하나의 워크스페이스에 여러 Django 프로젝트가 있는 경우:
- 각 프로젝트가 자동으로 감지됨
- 파일 위치에 따라 적절한 컨텍스트 제공
- 프로젝트별 독립적인 자동 완성

### 성능 최적화

대규모 프로젝트에서 성능 향상을 위해:
- 모델 분석 결과는 5초간 캐싱
- URL 패턴은 파일 변경 시에만 재분석
- 불필요한 파일은 `.gitignore`에 추가

## 팁과 트릭

### 1. 효율적인 모델 쿼리 작성

```python
# select_related로 JOIN 최적화
posts = Post.objects.select_related('author').all()

# prefetch_related로 N+1 문제 해결
posts = Post.objects.prefetch_related('comments').all()

# only()로 필요한 필드만 선택
posts = Post.objects.only('title', 'created_at').all()
```

### 2. URL 네이밍 컨벤션

```python
# 일관된 네이밍으로 자동 완성 효율 향상
urlpatterns = [
    path('', views.PostListView.as_view(), name='post_list'),
    path('create/', views.PostCreateView.as_view(), name='post_create'),
    path('<int:pk>/', views.PostDetailView.as_view(), name='post_detail'),
    path('<int:pk>/update/', views.PostUpdateView.as_view(), name='post_update'),
    path('<int:pk>/delete/', views.PostDeleteView.as_view(), name='post_delete'),
]
```

### 3. 모델 메서드 활용

```python
class Post(models.Model):
    # ... fields ...
    
    def get_absolute_url(self):
        return reverse('blog:post_detail', kwargs={'pk': self.pk})
    
    @property
    def is_published(self):
        return self.status == 'published' and self.publish_date <= timezone.now()
    
    class Meta:
        ordering = ['-created_at']
```

### 4. 키보드 단축키

- **자동 완성 트리거**: `Ctrl+Space`
- **Quick Fix**: `Ctrl+.` (import 문 자동 추가)
- **정의로 이동**: `F12`
- **참조 찾기**: `Shift+F12`

### 5. 디버깅 팁

Django 코드 디버깅 시:
1. VS Code Python 디버거 설정
2. `launch.json`에 Django 구성 추가
3. 브레이크포인트 설정 후 디버깅 시작

## 문제 해결

### 일반적인 문제와 해결책

**Q: 자동 완성이 작동하지 않습니다**
- Python 인터프리터 확인
- 프로젝트 재스캔 실행
- 확장 설정 확인

**Q: Import 오류가 표시됩니다**
- `python.analysis.extraPaths` 확인
- 가상환경 활성화 확인
- requirements.txt 설치 확인

**Q: manage.py 명령이 실패합니다**
- Python 경로 확인
- 가상환경 활성화 상태 확인
- 터미널에서 직접 명령 테스트

자세한 문제 해결은 [트러블슈팅 가이드](./troubleshooting.md)를 참조하세요.