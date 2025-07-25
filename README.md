# Django Power Tools for VS Code

VS Code에서 PyCharm과 같은 강력한 Django 개발 경험을 제공하는 확장 프로그램입니다.

## 주요 기능

이 확장은 VS Code에서 Django 개발자가 겪는 세 가지 주요 문제점을 해결합니다:

1. **스마트 경로 설정** - Python 경로를 자동으로 구성하여 import 오류 해결
2. **Django 인식 IntelliSense** - Django ORM 메서드, 모델 필드, URL 이름, 템플릿 태그에 대한 자동 완성
3. **워크플로우 자동화** - manage.py 명령에 대한 빠른 액세스 및 파일 간 원활한 탐색

## 요구 사항

- VS Code 1.74.0 이상
- Python 3.8 이상
- Django 3.2 이상
- VS Code용 Python 확장 (ms-python.python)

## 설치 방법

1. VS Code Marketplace에서 설치 (준비 중)
2. 또는 소스에서 설치:
   ```bash
   git clone https://github.com/pyhub-kr/vscode-pyhub-django.git
   cd vscode-pyhub-django
   npm install
   npm run compile
   ```

## 사용법

### 스마트 경로 설정
확장 프로그램이 `manage.py`를 찾아 Django 프로젝트 구조를 자동으로 감지하고 Python 경로를 구성합니다.

### Django ORM 자동 완성
다음에 대한 지능적인 제안을 받으세요:
- 모델 매니저 메서드 (예: `Model.objects.filter()`, `Model.objects.get()`)
- 모델 필드 이름
- 템플릿의 URL 이름
- 그 외 더 많은 기능!

### 명령 팔레트 통합
VS Code에서 직접 Django 명령에 액세스:
- `Django: 개발 서버 시작/중지` - `runserver` 실행
- `Django: 마이그레이션 생성` - `makemigrations` 실행
- `Django: 마이그레이션 적용` - `migrate` 실행

## 개발

### 설정
```bash
npm install
```

### 컴파일
```bash
npm run compile
```

### 감시 모드
```bash
npm run watch
```

### 테스트 실행
```bash
npm test
```

## 기여하기

기여를 환영합니다! Pull Request를 자유롭게 제출해 주세요.

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.