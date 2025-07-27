# Django Power Tools - 시각적 콘텐츠 제작 가이드

이 문서는 Django Power Tools VS Code 확장의 기능을 보여주는 GIF 애니메이션과 스크린샷 제작을 위한 가이드입니다.

## 🎯 목표

- 각 주요 기능의 동작을 명확하게 보여주는 GIF 애니메이션 제작
- 고품질 스크린샷으로 기능 설명 보완
- VS Code Marketplace에서 사용자 관심을 끌 수 있는 시각적 자료 제작

## 🛠️ 제작 도구

### GIF 녹화 도구
- **Mac**: [Kap](https://getkap.co/) (추천), [GIPHY Capture](https://giphy.com/apps/giphycapture)
- **Windows**: [ScreenToGif](https://www.screentogif.com/), [LICEcap](https://www.cockos.com/licecap/)
- **Linux**: [Peek](https://github.com/phw/peek), [Byzanz](https://github.com/GNOME/byzanz)

### 스크린샷 도구
- **Mac**: Command + Shift + 4 (내장), [Shottr](https://shottr.cc/)
- **Windows**: Windows + Shift + S (내장), [ShareX](https://getsharex.com/)
- **Cross-platform**: [Flameshot](https://flameshot.org/)

## 📋 제작 가이드라인

### 환경 설정
1. **VS Code 테마**: Dark+ (기본 다크 테마) 사용
2. **폰트 크기**: 14px 이상 (가독성 확보)
3. **창 크기**: 1280x720 또는 1920x1080
4. **사이드바**: 필요시에만 표시 (공간 절약)

### GIF 설정
- **프레임 레이트**: 15-30 fps
- **파일 크기**: 5MB 이하 (최적화 필수)
- **길이**: 10-20초 (핵심만 간결하게)
- **반복**: 무한 반복 설정

### 스크린샷 설정
- **해상도**: 최소 1280x720
- **포맷**: PNG (투명 배경 불필요)
- **주석**: 필요시 화살표나 박스로 강조

## 📸 제작할 콘텐츠

### 1. Django ORM 자동완성 GIF (`orm-autocomplete.gif`)

**시나리오**:
```python
# blog/views.py에서
from .models import Post

def post_list(request):
    posts = Post.objects.  # 여기서 자동완성 시연
```

**녹화 내용**:
1. `Post.objects.` 입력
2. 자동완성 목록 표시 (all, filter, exclude, get 등)
3. `filter` 선택
4. `filter(` 입력 후 필드 자동완성 표시
5. `status='published'` 완성

### 2. URL 태그 자동완성 GIF (`url-tag-completion.gif`)

**시나리오**:
```django
<!-- templates/blog/post_list.html에서 -->
<a href="{% url ' %}">자세히 보기</a>
```

**녹화 내용**:
1. `{% url '` 입력
2. URL 이름 자동완성 목록 표시
3. `blog:post_detail` 선택
4. 파라미터 힌트 표시

### 3. Manage.py 명령 실행 GIF (`manage-py-commands.gif`)

**녹화 내용**:
1. Command Palette 열기 (Ctrl/Cmd + Shift + P)
2. "Django" 입력
3. "Django: Run Management Command" 선택
4. 명령 목록에서 "makemigrations" 선택
5. 터미널에서 실행되는 모습

### 4. Cross-file Navigation GIF (`cross-file-navigation.gif`)

**녹화 내용**:
1. views.py에서 URL 이름 우클릭
2. "Go to Definition" 선택
3. urls.py의 해당 패턴으로 이동
4. 다시 템플릿에서 URL 태그 우클릭
5. urls.py로 이동

### 5. Django Forms 자동완성 GIF (`forms-autocomplete.gif`)

**녹화 내용**:
1. forms.py에서 새로운 Form 클래스 생성
2. 필드 타입 자동완성 (CharField, EmailField 등)
3. 필드 옵션 자동완성 (max_length, required 등)
4. ModelForm의 Meta 클래스 자동완성

### 6. 프로젝트 초기 설정 GIF (`initial-setup.gif`)

**녹화 내용**:
1. Django 프로젝트 폴더 열기
2. 자동 경로 설정 알림 표시
3. import 오류가 해결되는 모습
4. 설정 확인 (상태바 아이콘)

## 📷 스크린샷 목록

### 1. 확장 개요 (`overview.png`)
- VS Code 전체 화면
- Django 프로젝트 열린 상태
- 주요 기능들이 작동하는 모습

### 2. ORM 자동완성 (`autocomplete-orm.png`)
- QuerySet 메서드 자동완성 드롭다운
- 메서드 설명 툴팁 포함

### 3. 모델 필드 자동완성 (`autocomplete-fields.png`)
- 모델 필드 자동완성 목록
- 필드 타입 정보 표시

### 4. URL 태그 자동완성 (`autocomplete-urls.png`)
- 템플릿에서 URL 이름 자동완성
- 네임스페이스 포함된 목록

### 5. 설정 화면 (`settings.png`)
- VS Code 설정에서 Django Power Tools 섹션
- 주요 설정 옵션들

## 🎨 시각적 일관성

### 색상 가이드
- Django 그린: #092E20
- 강조 색상: VS Code 테마 기본 색상 사용
- 경고/오류: 표준 VS Code 색상 사용

### 애니메이션 가이드
- 부드러운 전환 효과
- 마우스 커서 표시 (클릭 시각화)
- 타이핑 속도: 자연스럽게 (너무 빠르지 않게)

## 📁 파일 명명 규칙

```
images/
├── gifs/
│   ├── orm-autocomplete.gif
│   ├── url-tag-completion.gif
│   ├── manage-py-commands.gif
│   ├── cross-file-navigation.gif
│   ├── forms-autocomplete.gif
│   └── initial-setup.gif
├── screenshots/
│   ├── overview.png
│   ├── autocomplete-orm.png
│   ├── autocomplete-fields.png
│   ├── autocomplete-urls.png
│   └── settings.png
└── marketplace/
    ├── banner.png (1280x640)
    └── gallery-1.png
```

## 🔧 최적화 팁

### GIF 최적화
1. [ezgif.com](https://ezgif.com/optimize)에서 최적화
2. 불필요한 프레임 제거
3. 색상 수 줄이기 (품질 유지하면서)

### 스크린샷 최적화
1. [TinyPNG](https://tinypng.com/)로 압축
2. 메타데이터 제거

## ✅ 체크리스트

제작 전:
- [ ] VS Code 다크 테마 설정
- [ ] 샘플 프로젝트 준비
- [ ] 녹화 도구 설치 및 테스트
- [ ] 창 크기 조정

제작 중:
- [ ] 부드러운 마우스 움직임
- [ ] 명확한 액션 수행
- [ ] 적절한 대기 시간
- [ ] 핵심 기능에 집중

제작 후:
- [ ] 파일 크기 확인 (5MB 이하)
- [ ] 최적화 수행
- [ ] README.md 업데이트
- [ ] 마켓플레이스 자료 준비

## 📚 참고 자료

- [VS Code Extension 마켓플레이스 가이드](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#marketplace-presentation-tips)
- [GIF 제작 베스트 프랙티스](https://www.cockos.com/licecap/howto.php)