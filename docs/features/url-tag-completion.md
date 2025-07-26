# URL 태그 자동 완성 구현

## 개요

Django 템플릿에서 `{% url %}` 태그 사용 시 URL 이름을 자동 완성하여 오타를 방지하고 개발 생산성을 향상시킵니다.

## 주요 기능

### 1. URL 패턴 자동 탐지
- 프로젝트 내 모든 `urls.py` 파일 스캔
- `path()` 및 `re_path()` 함수의 `name` 파라미터 추출
- `app_name` 설정 인식
- 실시간 파일 변경 감지

### 2. 템플릿 내 자동 완성
```django
<!-- Django 템플릿 -->
<a href="{% url 'home' %}">Home</a>
<a href="{% url 'blog:post_detail' pk=post.pk %}">Read More</a>

<!-- 자동 완성 제공 -->
{% url '|' %}  <!-- 커서 위치에서 사용 가능한 URL 이름 목록 표시 -->
```

### 3. Python 코드 내 자동 완성
```python
# views.py
from django.urls import reverse
from django.shortcuts import redirect

def my_view(request):
    # reverse() 함수에서도 자동 완성 지원
    url = reverse('blog:post_list')
    return redirect('user_profile')
```

### 4. URL 패턴 정보 제공
- URL 패턴 표시 (예: `user/<int:user_id>/`)
- 연결된 뷰 함수/클래스 표시
- 필요한 파라미터 정보
- 소스 파일 위치

## 구현 세부사항

### UrlPatternAnalyzer 클래스
```typescript
export class UrlPatternAnalyzer {
    // URL 패턴 파싱 및 캐싱
    async analyzeUrlFile(content: string, filePath: string): Promise<void>
    
    // 전체 워크스페이스 스캔
    async scanWorkspace(): Promise<void>
    
    // URL 패턴 조회
    getAllUrlPatterns(): UrlPattern[]
}
```

### UrlTagCompletionProvider 클래스
```typescript
export class UrlTagCompletionProvider implements vscode.CompletionItemProvider {
    // 컨텍스트 인식 자동 완성
    provideCompletionItems(...): Promise<vscode.CompletionItem[]>
    
    // URL 컨텍스트 판별
    private isUrlContext(linePrefix: string, languageId: string): boolean
}
```

## 지원하는 패턴

### 기본 URL 패턴
```python
urlpatterns = [
    path('', views.index, name='home'),
    path('about/', views.about, name='about'),
    path('contact/', views.ContactView.as_view(), name='contact'),
]
```

### 파라미터가 있는 URL
```python
urlpatterns = [
    path('user/<int:user_id>/', views.user_detail, name='user_detail'),
    path('blog/<slug:slug>/', views.post_detail, name='post_detail'),
    re_path(r'^article/(?P<year>[0-9]{4})/$', views.year_archive, name='year_archive'),
]
```

### app_name이 있는 URL
```python
app_name = 'blog'

urlpatterns = [
    path('', views.post_list, name='post_list'),
    path('<int:pk>/', views.post_detail, name='post_detail'),
]
```

템플릿에서 사용:
```django
{% url 'blog:post_list' %}
{% url 'blog:post_detail' pk=post.pk %}
```

## 성능 최적화

### 캐싱
- 파일별 5초 캐시
- 변경되지 않은 파일은 재분석하지 않음
- 메모리 효율적인 패턴 저장

### 파일 감시
- `urls.py` 파일 변경 시 자동 업데이트
- 새 파일 생성 시 즉시 인덱싱
- 파일 삭제 시 패턴 제거

## 사용 방법

1. Django 프로젝트 열기
2. 템플릿 파일에서 `{% url '` 입력
3. 자동 완성 목록에서 URL 이름 선택
4. 필요한 경우 파라미터 추가

## 설정

### `djangoPowerTools.enableUrlTagCompletion`
- **타입**: boolean
- **기본값**: true
- **설명**: Django URL 태그 자동 완성 활성화

## 트리거 컨텍스트

### Django 템플릿
- `{% url '|' %}` - 작은따옴표
- `{% url "|" %}` - 큰따옴표
- `<a href="{% url '|' %}">` - HTML 속성 내

### Python 코드
- `reverse('|')` - reverse 함수
- `redirect('|')` - redirect 함수

## 향후 개선 계획

1. **URL 유효성 검사**: 존재하지 않는 URL 이름 경고
2. **파라미터 유효성 검사**: 필수 파라미터 누락 경고
3. **Go to Definition**: URL 이름에서 정의로 이동
4. **Rename Refactoring**: URL 이름 일괄 변경
5. **미리보기**: URL 패턴의 실제 경로 미리보기