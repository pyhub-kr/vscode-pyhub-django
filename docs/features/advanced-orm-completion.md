# 고급 ORM 및 모델 자동 완성

## 개요

Django Power Tools는 Django ORM 및 모델에 대한 고급 IntelliSense 기능을 제공합니다. 이는 Django 개발자가 모델과 QuerySet을 다룰 때 생산성을 크게 향상시킵니다.

## 주요 기능

### 1. QuerySet 메서드 자동 완성

Django ORM의 모든 QuerySet 메서드를 지원합니다:

```python
# 기본 QuerySet 메서드
Post.objects.all()
Post.objects.filter(title__icontains='django')
Post.objects.exclude(is_published=False)
Post.objects.get(pk=1)

# 체이닝 지원
Post.objects.filter(is_published=True).order_by('-created_at').first()

# 고급 메서드
Post.objects.annotate(comment_count=Count('comments'))
Post.objects.select_related('author').prefetch_related('tags')
```

지원되는 메서드 카테고리:
- **QuerySet 반환**: filter, exclude, annotate, order_by, distinct, values, values_list
- **단일 객체 반환**: get, first, last, latest, earliest
- **기타 반환 타입**: exists, count, aggregate, create, get_or_create, update_or_create

### 2. 필드 조회(Lookup) 자동 완성

필드 타입에 따른 적절한 lookup 제안:

```python
# CharField/TextField
Post.objects.filter(title__icontains='django')  # 대소문자 무시 포함
Post.objects.filter(title__startswith='Django')  # 시작 문자열
Post.objects.filter(title__regex=r'^[A-Z]')     # 정규식

# DateTimeField
Post.objects.filter(created_at__year=2024)
Post.objects.filter(created_at__month=1)
Post.objects.filter(created_at__gte=datetime.now())

# ForeignKey/관계 필드
Post.objects.filter(author__name='John')
Post.objects.filter(author__email__endswith='@example.com')

# ManyToManyField
Post.objects.filter(tags__name__in=['django', 'python'])
```

### 3. 모델 인스턴스 멤버 자동 완성

모델 인스턴스의 필드, 메서드, 프로퍼티 접근:

```python
post = Post.objects.first()
post.title          # 필드
post.save()         # Django 기본 메서드
post.get_absolute_url()  # 사용자 정의 메서드
post.display_name   # @property
```

### 4. 커스텀 매니저 지원

사용자 정의 매니저와 메서드 인식:

```python
class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_published=True)
    
    def by_author(self, author):
        return self.get_queryset().filter(author=author)

class Post(models.Model):
    objects = models.Manager()
    published = PublishedManager()

# 자동 완성 지원
Post.published.all()
Post.published.by_author(user)  # 커스텀 메서드
```

### 5. 모델 상속 지원

추상 모델과 상속된 필드/메서드 인식:

```python
class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
    
    def touch(self):
        self.save()

class Article(BaseModel):
    title = models.CharField(max_length=200)

# 상속된 멤버도 자동 완성
article = Article()
article.created_at  # 상속된 필드
article.touch()     # 상속된 메서드
```

### 6. 관계 필드 탐색

ForeignKey, OneToOneField, ManyToManyField 관계 탐색:

```python
# Forward relation
book = Book.objects.first()
book.author.name  # 관련 모델 필드 접근

# Reverse relation
author = Author.objects.first()
author.books.all()  # 역방향 관계 QuerySet
author.books.filter(is_published=True)
```

### 7. 컨텍스트 인식 자동 완성

변수 타입을 추론하여 적절한 자동 완성 제공:

```python
# 변수 타입 추론
pending_tasks = Task.objects.filter(is_completed=False)
pending_tasks.  # QuerySet 메서드 제안

task = Task.objects.get(pk=1)
task.  # 모델 인스턴스 멤버 제안

# 반복문에서도 작동
for post in Post.objects.all():
    post.  # Post 모델 멤버 제안
```

## 성능 최적화

### 캐싱 전략
- 분석된 모델 정보는 5초간 캐시
- 파일 변경 시에만 재분석
- 대규모 프로젝트에서도 빠른 응답 속도

### 증분 업데이트
- 변경된 파일만 재분석
- 실시간 자동 완성 제공
- 메모리 효율적인 인덱싱

## 기술적 세부사항

### Python 코드 파싱
- 정규식 기반 파싱 (빠른 성능)
- Python AST 파싱 옵션 (정확성)
- Django 특화 패턴 인식

### Language Server Protocol 통합
- VS Code CompletionItemProvider 구현
- 다중 트리거 문자 지원 (., (, =)
- 스니펫 및 상세 문서 제공

### 확장성
- 플러그인 시스템으로 커스텀 패턴 추가 가능
- Django 버전별 차이점 처리
- 서드파티 Django 앱 지원

## 사용 방법

1. Django 프로젝트 열기
2. 모델 파일 편집 시작
3. `.` 입력 시 자동으로 관련 제안 표시
4. `Ctrl+Space`로 수동으로 자동 완성 트리거

## 설정

### `djangoPowerTools.enableModelIntelliSense`
- **타입**: boolean
- **기본값**: true
- **설명**: Django 모델 및 ORM IntelliSense 활성화

## 문제 해결

### 자동 완성이 작동하지 않는 경우
1. Python 경로가 올바르게 설정되었는지 확인
2. Django 프로젝트가 감지되었는지 확인
3. 프로젝트 재스캔 명령 실행

### 느린 자동 완성
1. 대규모 모델 파일을 작은 파일로 분할
2. 캐시 지우기 및 재시작
3. 불필요한 import 제거

## 향후 개선 계획

1. **타입 힌트 통합**: Python 타입 힌트를 활용한 더 정확한 추론
2. **Django REST Framework 지원**: Serializer 및 ViewSet 자동 완성
3. **마이그레이션 지원**: 마이그레이션 파일 자동 완성
4. **성능 프로파일링**: 더 빠른 응답을 위한 최적화