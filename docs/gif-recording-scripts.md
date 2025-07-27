# GIF 녹화 스크립트

이 문서는 각 GIF를 녹화할 때 따라야 할 정확한 단계를 설명합니다.

## 사전 준비

1. VS Code 설정:
   - 테마: Dark+ (default dark)
   - 폰트 크기: 14px
   - 미니맵: 숨김
   - 사이드바: 필요시에만 표시

2. 확장 설치:
   - Django Power Tools 확장이 설치되어 있어야 함
   - Python 확장이 설치되어 있어야 함

3. 샘플 프로젝트:
   - `test/fixtures/sample-projects/simple-blog` 폴더 열기

## 1. Django ORM 자동완성 GIF

**파일**: `blog/views.py`

**스크립트**:
```python
# 새로운 view 함수 작성
def published_posts(request):
    # 타이핑 시작 (천천히, 명확하게)
    posts = Post.objects.
    # 여기서 자동완성 목록이 나타남 (2초 대기)
    # 'filter' 선택 (화살표 키 사용)
    posts = Post.objects.filter(
    # 필드 자동완성 나타남
    # 'status' 선택
    posts = Post.objects.filter(status=
    # 값 입력
    posts = Post.objects.filter(status='published')
    # 체이닝 시연을 위해 계속
    posts = Post.objects.filter(status='published').order_by(
    # '-publish' 선택
    posts = Post.objects.filter(status='published').order_by('-publish')
```

**녹화 포인트**:
- 자동완성 목록이 나타날 때 2초 정도 대기
- 마우스가 아닌 키보드로 선택
- 각 단계별로 명확하게 구분

## 2. URL 태그 자동완성 GIF

**파일**: `templates/blog/post_list.html`

**스크립트**:
```django
<!-- 새로운 링크 추가 -->
<a href="{% url '
<!-- 자동완성 목록 표시됨 (2초 대기) -->
<!-- 'blog:post_detail' 선택 -->
<a href="{% url 'blog:post_detail' 
<!-- 파라미터 힌트 표시됨 -->
<a href="{% url 'blog:post_detail' post.slug %}">
```

**녹화 포인트**:
- 템플릿 파일임을 명확히 보여줌
- URL 네임스페이스가 포함된 것을 강조
- 파라미터 힌트 표시 확인

## 3. Manage.py 명령 실행 GIF

**스크립트**:
1. Ctrl/Cmd + Shift + P로 Command Palette 열기
2. "django" 입력 (천천히)
3. "Django: Run Management Command" 선택
4. 명령 목록에서 "makemigrations" 선택
5. 터미널이 열리고 명령이 실행됨
6. 결과 확인 (2초 대기)

**녹화 포인트**:
- Command Palette의 검색 기능 강조
- 명령 목록의 다양성 보여주기
- 터미널 출력 확인

## 4. Cross-file Navigation GIF

**파일 1**: `blog/views.py`
```python
# redirect 사용 예제
return redirect('blog:post_detail', slug=post.slug)
```

**스크립트**:
1. 'blog:post_detail' 위에 마우스 호버
2. Ctrl/Cmd + 클릭 또는 F12 (Go to Definition)
3. `urls.py` 파일의 해당 URL 패턴으로 이동
4. 다시 템플릿 파일로 이동
5. {% url 'blog:post_detail' %} 에서 같은 동작 반복

**녹화 포인트**:
- 파일 간 이동이 부드럽게 이루어짐
- 정확한 위치로 이동함을 보여줌
- 여러 파일 타입에서 작동함을 보여줌

## 5. Django Forms 자동완성 GIF

**파일**: `blog/forms.py`

**스크립트**:
```python
# 새로운 Form 클래스 작성
class NewsletterForm(forms.Form):
    # 필드 타입 자동완성
    email = forms.
    # EmailField 선택
    email = forms.EmailField(
    # 필드 옵션 자동완성
    email = forms.EmailField(required=True, help_text=
    # 완성
    email = forms.EmailField(required=True, help_text='Enter your email')
    
    # ModelForm 예제
class ArticleForm(forms.ModelForm):
    class Meta:
        model = 
        # Post 선택
        model = Post
        fields = 
        # 옵션 보여주기: '__all__', 리스트
        fields = ['title', 'body', 'status']
```

**녹화 포인트**:
- Form과 ModelForm 둘 다 시연
- 필드 타입의 다양성 보여주기
- Meta 클래스 옵션 자동완성 강조

## 6. 프로젝트 초기 설정 GIF

**스크립트**:
1. VS Code 시작
2. "Open Folder"로 Django 프로젝트 열기
3. 자동으로 "Django project detected" 알림 표시
4. "Configure Python Path" 버튼 클릭
5. 상태바에 "Django Ready" 아이콘 표시
6. 이전에 import 오류가 있던 파일 열기
7. import 오류가 해결된 것 확인

**녹화 포인트**:
- 자동 감지 기능 강조
- 설정 과정의 간편함 보여주기
- 실제 문제 해결 확인

## 녹화 팁

1. **타이핑 속도**: 분당 120-150자 정도로 자연스럽게
2. **대기 시간**: 중요한 순간에는 2-3초 대기
3. **마우스 움직임**: 부드럽고 목적이 있게
4. **화면 정리**: 불필요한 패널은 닫기
5. **포커스**: 한 번에 하나의 기능만 보여주기

## 후처리

1. GIF 최적화:
   - 프레임 수 줄이기 (비슷한 프레임 제거)
   - 색상 수 최적화 (256색 이하)
   - 크기 조정 (필요시)

2. 파일명 규칙:
   - `orm-autocomplete.gif`
   - `url-tag-completion.gif`
   - `manage-py-commands.gif`
   - `cross-file-navigation.gif`
   - `forms-autocomplete.gif`
   - `initial-setup.gif`

3. 품질 확인:
   - 텍스트가 읽기 쉬운지
   - 액션이 명확한지
   - 파일 크기가 5MB 이하인지