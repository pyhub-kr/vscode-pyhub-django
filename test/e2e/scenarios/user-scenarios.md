# E2E Test Scenarios for Django Power Tools

## 시나리오 1: Django 프로젝트 초기 설정

### 목적
Django 프로젝트를 열었을 때 자동으로 경로가 설정되고 import 오류가 해결되는지 확인

### 테스트 단계
1. VS Code 시작
2. `test/fixtures/sample-projects/simple-blog` 폴더 열기
3. 자동 경로 설정 알림 확인
4. `blog/views.py` 파일 열기
5. import 오류가 없는지 확인

### 예상 결과
- "Django project detected" 알림 표시
- Python 경로가 자동으로 설정됨
- import 오류 없음

---

## 시나리오 2: Django ORM 자동완성

### 목적
Model과 QuerySet 메서드 자동완성이 올바르게 작동하는지 확인

### 테스트 단계
1. `products/views.py` 파일 열기
2. 새로운 함수 작성:
   ```python
   def test_autocomplete(request):
       products = Product.objects.
   ```
3. `.` 입력 후 자동완성 목록 확인
4. `filter` 선택 후 `(` 입력
5. 필드 자동완성 확인

### 예상 결과
- QuerySet 메서드 목록 표시 (all, filter, exclude, get 등)
- filter 내부에서 모델 필드 자동완성 (name, price, category 등)
- 필드 lookup 자동완성 (__icontains, __gte 등)

---

## 시나리오 3: URL 태그 자동완성

### 목적
템플릿에서 URL 태그 자동완성이 네임스페이스와 함께 작동하는지 확인

### 테스트 단계
1. `templates/products/product_list.html` 생성
2. 다음 코드 입력:
   ```django
   {% url '
   ```
3. 자동완성 목록 확인
4. `products:product_detail` 선택

### 예상 결과
- URL 이름 목록 표시
- 네임스페이스 포함된 이름 표시 (products:product_list, products:product_detail 등)
- 파라미터 힌트 표시

---

## 시나리오 4: Django Forms 자동완성

### 목적
Form 클래스와 필드 자동완성이 작동하는지 확인

### 테스트 단계
1. `products/forms.py` 파일 열기
2. 새로운 Form 클래스 작성:
   ```python
   class ReviewForm(forms.Form):
       rating = forms.
   ```
3. 필드 타입 자동완성 확인
4. `IntegerField` 선택 후 `(` 입력
5. 파라미터 자동완성 확인

### 예상 결과
- Form 필드 타입 목록 표시 (CharField, IntegerField, EmailField 등)
- 필드 파라미터 자동완성 (min_value, max_value, required 등)
- 위젯 옵션 자동완성

---

## 시나리오 5: ModelForm 자동완성

### 목적
ModelForm의 Meta 클래스 옵션 자동완성이 작동하는지 확인

### 테스트 단계
1. `products/forms.py`에서 새 ModelForm 작성:
   ```python
   class ProductReviewForm(forms.ModelForm):
       class Meta:
           model = 
   ```
2. 모델 자동완성 확인
3. `fields = ` 입력 후 자동완성 확인

### 예상 결과
- 사용 가능한 모델 목록 표시
- fields 옵션에서 모델 필드 목록 표시
- exclude, widgets 등 Meta 옵션 자동완성

---

## 시나리오 6: Cross-file Navigation

### 목적
URL 이름, View, Template 간 Go to Definition이 작동하는지 확인

### 테스트 단계
1. `products/views.py`에서 `reverse('products:product_list')` 찾기
2. 'products:product_list' 위에서 Ctrl/Cmd + Click
3. urls.py의 해당 패턴으로 이동하는지 확인
4. 템플릿에서 {% url %} 태그로 동일 테스트

### 예상 결과
- urls.py의 정확한 URL 패턴으로 이동
- 빠른 응답 시간 (<100ms)
- 네임스페이스가 있는 URL도 정확히 찾기

---

## 시나리오 7: 정적 파일 경로 자동완성

### 목적
템플릿에서 정적 파일 경로 자동완성이 작동하는지 확인

### 테스트 단계
1. `static/css/` 디렉토리에 `style.css` 생성
2. 템플릿에서 다음 입력:
   ```django
   {% static 'css/
   ```
3. 파일 목록 확인

### 예상 결과
- css 디렉토리 내 파일 목록 표시
- 파일 타입별 아이콘 표시
- 중첩된 디렉토리 탐색 가능

---

## 시나리오 8: manage.py 명령 실행

### 목적
VS Code에서 Django 명령을 직접 실행할 수 있는지 확인

### 테스트 단계
1. Ctrl/Cmd + Shift + P로 Command Palette 열기
2. "Django" 검색
3. "Django: Run Management Command" 선택
4. "makemigrations" 선택
5. 터미널 출력 확인

### 예상 결과
- Django 관련 명령 목록 표시
- 선택한 명령이 터미널에서 실행
- 별도 터미널 윈도우 생성
- 명령 실행 결과 표시

---

## 시나리오 9: 다중 Django 프로젝트

### 목적
하나의 워크스페이스에서 여러 Django 프로젝트를 관리할 수 있는지 확인

### 테스트 단계
1. 워크스페이스에 3개 프로젝트 추가:
   - simple-blog
   - multi-app-cms
   - complex-ecommerce
2. 각 프로젝트의 파일 열기
3. 각 프로젝트별 자동완성 확인

### 예상 결과
- 각 프로젝트의 경로가 독립적으로 설정
- 프로젝트별 모델/URL 자동완성이 올바르게 작동
- 프로젝트 간 간섭 없음

---

## 시나리오 10: 성능 테스트

### 목적
대규모 프로젝트에서도 성능이 유지되는지 확인

### 테스트 단계
1. complex-ecommerce 프로젝트에 추가 앱 생성 (10개)
2. 각 앱에 5개 모델, 20개 URL 패턴 추가
3. 자동완성 응답 시간 측정
4. Go to Definition 응답 시간 측정

### 예상 결과
- 자동완성 응답 시간 <100ms
- Go to Definition 응답 시간 <200ms
- 초기 프로젝트 스캔 시간 <5s
- 메모리 사용량 <100MB