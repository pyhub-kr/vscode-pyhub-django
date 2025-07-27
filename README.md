# Django Power Tools for VS Code

[![CI](https://github.com/pyhub-kr/vscode-pyhub-django/actions/workflows/ci.yml/badge.svg)](https://github.com/pyhub-kr/vscode-pyhub-django/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/pyhub-kr/vscode-pyhub-django/branch/main/graph/badge.svg)](https://codecov.io/gh/pyhub-kr/vscode-pyhub-django)
[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/pyhub-kr.django-power-tools.svg)](https://marketplace.visualstudio.com/items?itemName=pyhub-kr.django-power-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **Django Power Tools**는 VS Code에서 PyCharm과 같은 강력한 Django 개발 경험을 제공하는 확장 프로그램입니다.

## 🎯 핵심 기능 요약

| 기능 | 설명 | 지원 상태 |
|------|------|-----------|
| **자동 Import 경로 설정** | Django 프로젝트를 자동 감지하여 Python 경로 구성 | ✅ 완료 |
| **Django ORM 자동완성** | `objects.filter()`, `exclude()` 등 30+ QuerySet 메서드 | ✅ 완료 |
| **모델 필드 IntelliSense** | 모델 필드 및 lookup 자동완성 (`title__icontains` 등) | ✅ 완료 |
| **Related Name 자동완성** | ForeignKey/ManyToMany의 related_name 지원 | ✅ 완료 |
| **URL 태그 자동완성** | 템플릿에서 `{% url 'name' %}` 태그 자동완성 | ✅ 완료 |
| **커스텀 매니저 지원** | 사용자 정의 매니저 메서드 인식 및 자동완성 | ✅ 완료 |
| **manage.py 명령 통합** | VS Code에서 직접 Django 명령 실행 | ✅ 완료 |
| **다중 프로젝트 지원** | 하나의 워크스페이스에서 여러 Django 프로젝트 관리 | ✅ 완료 |

### 🔥 주요 차별점
- **제로 구성**: 프로젝트를 열면 자동으로 Django 환경 감지 및 설정
- **실시간 업데이트**: 모델 변경 시 즉시 자동완성 목록 갱신
- **PyCharm 수준의 IntelliSense**: Django 전용 코드 완성 기능
- **경량화**: 빠른 시작과 낮은 메모리 사용량

## 📌 주요 기능

### 🔧 스마트 경로 구성
Django 프로젝트를 자동으로 감지하고 Python 경로를 구성하여 import 오류를 해결합니다.

- ✅ `manage.py` 자동 감지
- ✅ Python 분석 경로 자동 설정
- ✅ 다중 Django 프로젝트 지원
- ✅ 가상환경 자동 인식

### 🧠 Django 인식 IntelliSense
Django의 모든 구성 요소에 대한 지능적인 자동 완성을 제공합니다.

- ✅ **ORM 메서드**: `filter()`, `exclude()`, `annotate()` 등 30+ QuerySet 메서드
- ✅ **모델 필드**: 모든 필드 타입과 lookup 지원
- ✅ **URL 태그**: 템플릿에서 `{% url %}` 태그 자동 완성
- ✅ **커스텀 매니저**: 사용자 정의 매니저 메서드 인식

### 🎯 워크플로우 자동화
반복적인 Django 작업을 간소화합니다.

- ✅ **manage.py 명령 팔레트**: VS Code에서 직접 Django 명령 실행
- ✅ **빠른 액세스 명령**: runserver, migrate, makemigrations 등
- ✅ **명령 히스토리**: 최근 사용한 명령 기억
- ✅ **전용 터미널 관리**: runserver를 위한 별도 터미널

## 📦 설치

### VS Code Marketplace에서 설치 (권장)
1. VS Code를 열고 Extensions 뷰로 이동 (`Ctrl+Shift+X`)
2. "Django Power Tools" 검색
3. Install 버튼 클릭
4. Reload 버튼을 클릭하여 VS Code 재시작

### 수동 설치
```bash
# 저장소 클론
git clone https://github.com/pyhub-kr/vscode-pyhub-django.git
cd vscode-pyhub-django

# 의존성 설치
npm install

# 확장 빌드
npm run compile

# VS Code에서 열기
code .
```

## 🚀 빠른 시작

### 1. Django 프로젝트 열기
```bash
# Django 프로젝트 폴더를 VS Code에서 열기
code my-django-project
```

### 2. Python 인터프리터 선택
- `Ctrl+Shift+P` → "Python: Select Interpreter"
- 프로젝트의 가상환경 선택

### 3. 자동 기능 활성화 확인
프로젝트를 열면 자동으로:
- Django 프로젝트 감지
- Python 경로 구성
- IntelliSense 활성화

## 💡 사용 예제

### Django ORM 자동 완성
```python
from myapp.models import Post

# QuerySet 메서드 자동 완성
posts = Post.objects.filter(title__icontains='django')
posts.exclude(is_published=False).order_by('-created_at')

# 모델 필드 자동 완성
post = Post.objects.first()
post.title  # 필드 제안
post.save()  # 메서드 제안
```

### URL 태그 자동 완성
```django
<!-- templates/blog/post_list.html -->
<a href="{% url 'blog:post_detail' pk=post.pk %}">
    {{ post.title }}
</a>

<!-- URL 이름이 자동 완성됩니다 -->
{% url '|' %}  <!-- 여기서 자동 완성 목록 표시 -->
```

### manage.py 명령 실행
```
# Command Palette (Ctrl+Shift+P)
> Django Power Tools: Run manage.py Command
> Django Power Tools: Run Server
> Django Power Tools: Make Migrations
> Django Power Tools: Migrate Database
```

## ⚙️ 설정

`settings.json`에서 다음 옵션을 구성할 수 있습니다:

```json
{
    // 자동 import 경로 구성 활성화
    "djangoPowerTools.enableAutoImportConfig": true,
    
    // Django 자동 완성 기능 활성화
    "djangoPowerTools.enableAutoCompletion": true,
    
    // 모델 및 ORM IntelliSense 활성화
    "djangoPowerTools.enableModelIntelliSense": true,
    
    // URL 태그 자동 완성 활성화
    "djangoPowerTools.enableUrlTagCompletion": true
}
```

## 🔍 기능 상세

### 스마트 프로젝트 경로 설정
- 워크스페이스에서 `manage.py` 파일 자동 탐지
- `python.analysis.extraPaths`에 프로젝트 루트 자동 추가
- 다중 Django 프로젝트 동시 지원
- 파일 변경 시 실시간 업데이트

### 고급 ORM 자동 완성
- 30개 이상의 QuerySet 메서드 지원
- 필드 타입별 적절한 lookup 제안
- 커스텀 매니저 및 메서드 인식
- 모델 상속 체인 완벽 지원

### URL 패턴 분석
- 모든 `urls.py` 파일 자동 스캔
- `app_name` 네임스페이스 지원
- URL 파라미터 정보 제공
- 실시간 URL 패턴 업데이트

## 🐛 문제 해결

### 자동 완성이 작동하지 않는 경우
1. Python 인터프리터가 올바르게 선택되었는지 확인
2. `Ctrl+Shift+P` → "Django Power Tools: Rescan Django Project" 실행
3. VS Code 재시작

### Import 오류가 계속 발생하는 경우
1. `python.analysis.extraPaths` 설정 확인
2. 가상환경이 활성화되어 있는지 확인
3. `pip install -r requirements.txt` 실행

### manage.py 명령이 실행되지 않는 경우
1. 프로젝트 루트에 `manage.py`가 있는지 확인
2. Python 인터프리터 경로 확인
3. 터미널에서 수동으로 명령 테스트

## 🤝 기여하기

기여를 환영합니다! 다음 과정을 따라주세요:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- **이슈**: [GitHub Issues](https://github.com/pyhub-kr/vscode-pyhub-django/issues)
- **토론**: [GitHub Discussions](https://github.com/pyhub-kr/vscode-pyhub-django/discussions)
- **이메일**: support@pyhub.kr

## 🗺️ 로드맵

- [ ] Django REST Framework 지원
- [ ] 템플릿 태그/필터 자동 완성
- [ ] Django Admin 통합
- [ ] 마이그레이션 시각화
- [ ] Docker 통합

## 👥 기여자

<a href="https://github.com/pyhub-kr/vscode-pyhub-django/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=pyhub-kr/vscode-pyhub-django" />
</a>

---

Made with ❤️ by [PyHub Korea](https://github.com/pyhub-kr)