# Django Power Tools 테스트 가이드

## 🚀 빠른 시작

### 방법 1: VS Code에서 직접 실행 (개발자용)

1. **터미널에서 프로젝트 디렉토리로 이동**
   ```bash
   cd /Users/allieus/Work/vscode-pyhub-django
   ```

2. **VS Code 열기**
   ```bash
   code .
   ```

3. **F5 키 누르기**
   - 새로운 VS Code 창(Extension Development Host)이 열립니다
   - 이 창에서 확장이 활성화된 상태입니다

### 방법 2: VSIX 파일로 설치 (사용자용)

1. **VSIX 파일 생성** (이미 생성됨)
   ```bash
   vsce package
   ```

2. **VS Code에서 VSIX 설치**
   - VS Code 열기
   - 명령 팔레트 열기 (Cmd+Shift+P 또는 Ctrl+Shift+P)
   - "Extensions: Install from VSIX..." 입력
   - `django-power-tools-0.0.1.vsix` 파일 선택

3. **또는 명령줄에서 설치**
   ```bash
   code --install-extension django-power-tools-0.0.1.vsix
   ```

## 🧪 테스트할 기능들

### 1. Django 프로젝트 자동 감지
- Django 프로젝트 폴더를 열면 자동으로 감지
- "Django Power Tools가 Django 프로젝트를 감지했습니다!" 메시지 확인

### 2. Python 경로 자동 설정
- 프로젝트를 열었을 때 Python 경로 추가 확인 메시지
- "예"를 선택하면 자동으로 import 경로 설정

### 3. Django ORM 자동완성
Python 파일에서 다음을 입력해보세요:
```python
from myapp.models import MyModel

# "MyModel.objects." 입력 후 자동완성 목록 확인
MyModel.objects.  # <- 여기서 자동완성 팝업이 나타남
```

사용 가능한 메서드들:
- `all()`, `filter()`, `get()`, `create()`
- `exclude()`, `update()`, `delete()`
- `count()`, `exists()`, `order_by()`
- 그 외 다수

### 4. Django 필드 타입 자동완성
```python
from django.db import models

class MyModel(models.Model):
    # "models." 입력 후 자동완성 목록 확인
    title = models.  # <- 여기서 필드 타입 목록이 나타남
```

### 5. Hover 정보
Django 필드 타입이나 ORM 메서드 위에 마우스를 올려보세요:
- 상세한 설명과 사용 예제가 표시됩니다

### 6. Django 명령어 실행
명령 팔레트(Cmd+Shift+P)에서:
- "Django: 개발 서버 시작" - `runserver` 실행
- "Django: 마이그레이션 생성" - `makemigrations` 실행
- "Django: 마이그레이션 적용" - `migrate` 실행

## 📋 체크리스트

- [ ] Django 프로젝트 자동 감지 확인
- [ ] Python 경로 설정 다이얼로그 표시 확인
- [ ] `.objects.` 자동완성 작동 확인
- [ ] `models.` 필드 타입 자동완성 확인
- [ ] Hover 문서 표시 확인
- [ ] Django 명령어 실행 확인

## 🐛 문제 해결

### Python Extension이 없다는 오류
- VS Code Marketplace에서 "Python" 확장 설치
- 확장 ID: `ms-python.python`

### Django 프로젝트가 감지되지 않음
- 프로젝트 루트에 `manage.py` 파일이 있는지 확인
- 워크스페이스 폴더가 올바르게 설정되었는지 확인

### 자동완성이 작동하지 않음
- Python 파일(.py)인지 확인
- 파일을 저장한 후 다시 시도
- VS Code를 재시작

## 📝 피드백

문제가 있거나 개선 사항이 있으면 GitHub Issues에 등록해주세요:
https://github.com/pyhub-kr/vscode-pyhub-django/issues