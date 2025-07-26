# Django Power Tools 트러블슈팅 가이드

## 목차

1. [설치 문제](#설치-문제)
2. [자동 완성 문제](#자동-완성-문제)
3. [Import 오류](#import-오류)
4. [manage.py 명령 문제](#managepy-명령-문제)
5. [성능 문제](#성능-문제)
6. [호환성 문제](#호환성-문제)
7. [디버깅 방법](#디버깅-방법)

## 설치 문제

### 확장이 활성화되지 않음

**증상**: Django Power Tools가 Extensions 목록에는 있지만 기능이 작동하지 않음

**해결책**:
1. VS Code 재시작
2. 개발자 도구 열기 (`Ctrl+Shift+I`)
3. Console 탭에서 오류 메시지 확인
4. Python Extension 설치 확인
   ```
   code --install-extension ms-python.python
   ```

### Python Extension 의존성 오류

**증상**: "Cannot activate the 'Django Power Tools' extension because it depends on the 'Python' extension"

**해결책**:
1. Python Extension 설치:
   ```bash
   code --install-extension ms-python.python
   ```
2. VS Code 재시작
3. Python 인터프리터 선택 (`Ctrl+Shift+P` → "Python: Select Interpreter")

## 자동 완성 문제

### Django ORM 자동 완성이 작동하지 않음

**증상**: 모델이나 QuerySet 메서드가 제안되지 않음

**체크리스트**:
1. **Python 인터프리터 확인**
   ```json
   // .vscode/settings.json
   {
     "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python"
   }
   ```

2. **프로젝트 재스캔**
   - `Ctrl+Shift+P` → "Django Power Tools: Rescan Django Project"

3. **모델 파일 확인**
   - 모델이 정의된 파일이 `models.py`인지 확인
   - 또는 `__init__.py`에서 import 되었는지 확인

4. **설정 확인**
   ```json
   {
     "djangoPowerTools.enableModelIntelliSense": true,
     "djangoPowerTools.enableAutoCompletion": true
   }
   ```

### URL 태그 자동 완성이 작동하지 않음

**증상**: 템플릿에서 `{% url %}` 태그 자동 완성이 안 됨

**해결책**:
1. **파일 타입 확인**
   - 파일 확장자가 `.html`인지 확인
   - 언어 모드가 "HTML" 또는 "Django HTML"인지 확인

2. **URL 패턴 확인**
   ```python
   # urls.py에 name 파라미터가 있는지 확인
   path('about/', views.about, name='about'),  # ✅
   path('contact/', views.contact),  # ❌ name 없음
   ```

3. **app_name 설정 확인**
   ```python
   # urls.py
   app_name = 'blog'  # 네임스페이스 설정
   ```

### 자동 완성이 느림

**증상**: 자동 완성 제안이 나타나는데 시간이 오래 걸림

**해결책**:
1. **큰 모델 파일 분할**
   ```python
   # models/__init__.py
   from .user import User
   from .post import Post
   from .comment import Comment
   ```

2. **불필요한 import 제거**
3. **캐시 정리**
   - VS Code 재시작
   - 프로젝트 재스캔

## Import 오류

### "Unable to import" 오류

**증상**: 코드는 실행되지만 VS Code에서 import 오류 표시

**해결책**:
1. **Python 경로 확인**
   ```json
   // .vscode/settings.json
   {
     "python.analysis.extraPaths": [
       "${workspaceFolder}"
     ]
   }
   ```

2. **PYTHONPATH 설정**
   ```bash
   # .env 파일
   PYTHONPATH=${PYTHONPATH}:${PWD}
   ```

3. **__init__.py 파일 확인**
   - 각 패키지 디렉토리에 `__init__.py` 파일 존재 확인

### 순환 import 오류

**증상**: "ImportError: cannot import name X from partially initialized module"

**해결책**:
1. **import 구조 재설계**
   ```python
   # 나쁜 예
   # models.py
   from .views import some_function
   
   # views.py
   from .models import MyModel
   
   # 좋은 예 - 함수 내부에서 import
   def my_view():
       from .models import MyModel
       # ...
   ```

## manage.py 명령 문제

### "manage.py not found" 오류

**증상**: manage.py 명령 실행 시 파일을 찾을 수 없다는 오류

**해결책**:
1. **프로젝트 구조 확인**
   ```
   my-project/
   ├── manage.py  # 루트에 있어야 함
   ├── myproject/
   │   └── settings.py
   └── apps/
   ```

2. **워크스페이스 설정**
   - 프로젝트 루트를 워크스페이스로 열기
   - 하위 폴더가 아닌 manage.py가 있는 폴더 열기

### 가상환경이 활성화되지 않음

**증상**: manage.py 명령 실행 시 패키지를 찾을 수 없음

**해결책**:
1. **Python 인터프리터 확인**
   - 상태 표시줄에서 Python 버전 클릭
   - 가상환경 인터프리터 선택

2. **터미널 설정**
   ```json
   {
     "python.terminal.activateEnvironment": true
   }
   ```

## 성능 문제

### 메모리 사용량이 높음

**증상**: VS Code가 느려지고 메모리를 많이 사용

**해결책**:
1. **대규모 파일 제외**
   ```json
   // .vscode/settings.json
   {
     "files.exclude": {
       "**/node_modules": true,
       "**/.venv": true,
       "**/migrations": true
     }
   }
   ```

2. **분석 범위 제한**
   ```json
   {
     "python.analysis.exclude": [
       "**/migrations/**",
       "**/tests/**"
     ]
   }
   ```

### 프로젝트 스캔이 오래 걸림

**증상**: "Scanning Django project..." 메시지가 오래 지속

**해결책**:
1. **불필요한 파일 제외**
2. **프로젝트 구조 최적화**
3. **SSD 사용 권장**

## 호환성 문제

### Django 버전 호환성

**지원 버전**:
- Django 3.2+
- Django 4.0+
- Django 4.1+
- Django 4.2+

**이전 버전 사용 시**:
- 기본 기능은 작동하지만 일부 최신 기능 미지원
- Django 2.2의 경우 제한적 지원

### Python 버전 호환성

**지원 버전**:
- Python 3.8+
- Python 3.9+
- Python 3.10+
- Python 3.11+

### VS Code 버전

**최소 요구사항**:
- VS Code 1.74.0 이상

## 디버깅 방법

### 확장 로그 확인

1. **출력 패널 열기**
   - `View` → `Output`
   - 드롭다운에서 "Django Power Tools" 선택

2. **상세 로그 활성화**
   ```json
   {
     "djangoPowerTools.logLevel": "debug"
   }
   ```

### 개발자 도구 사용

1. **개발자 도구 열기**: `Ctrl+Shift+I`
2. **Console 탭** 확인
3. **오류 메시지 복사**

### 이슈 보고하기

문제가 해결되지 않는 경우:

1. **정보 수집**
   - VS Code 버전
   - Django Power Tools 버전
   - Python 버전
   - Django 버전
   - 오류 메시지
   - 재현 단계

2. **이슈 생성**
   - [GitHub Issues](https://github.com/pyhub-kr/vscode-pyhub-django/issues)
   - 이슈 템플릿 사용
   - 가능한 많은 정보 제공

3. **임시 해결책**
   - 확장 비활성화/재활성화
   - VS Code 재설치
   - 깨끗한 프로필로 테스트

## 자주 묻는 질문 (FAQ)

**Q: PyCharm에서 마이그레이션한 후 문제가 있습니다**
A: `.idea` 폴더를 삭제하고 VS Code 설정을 새로 구성하세요.

**Q: WSL에서 사용할 수 있나요?**
A: 네, WSL Remote Extension과 함께 사용 가능합니다.

**Q: Docker 컨테이너에서 작동하나요?**
A: Dev Containers Extension과 함께 사용하면 작동합니다.

**Q: 여러 settings 파일을 사용하는 경우?**
A: DJANGO_SETTINGS_MODULE 환경 변수를 설정하세요:
```json
{
  "python.envFile": "${workspaceFolder}/.env"
}
```

---

추가 도움이 필요하시면 [GitHub Discussions](https://github.com/pyhub-kr/vscode-pyhub-django/discussions)에서 질문해 주세요.