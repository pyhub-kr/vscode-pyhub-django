# VS Code Marketplace 비주얼 자산 가이드

## 🎨 필수 자산

### 1. 확장 아이콘 (icon.png)
- **크기**: 128x128px
- **포맷**: PNG (투명 배경 권장)
- **위치**: `images/icon.png`
- **현재 상태**: ✅ 이미 생성됨

### 2. 갤러리 배너 (banner.png)
- **크기**: 1280x640px
- **포맷**: PNG
- **색상**: Django 그린 (#092E20) 배경
- **내용**: 
  - Django Power Tools 로고/텍스트
  - 태그라인: "PyCharm-like Django development in VS Code"
  - VS Code와 Django 로고 포함

### 3. 갤러리 이미지
마켓플레이스 페이지에 표시될 스크린샷들:

#### gallery-1.png - Overview
- **크기**: 1280x800px 이상
- **내용**: VS Code 전체 화면에서 Django 프로젝트 작업 중인 모습
- **포함 요소**:
  - 파일 탐색기에 Django 프로젝트 구조
  - 편집기에 models.py 파일
  - 자동완성 드롭다운 표시
  - 터미널에 Django 서버 실행 중

#### gallery-2.png - ORM Autocomplete
- **크기**: 1280x800px 이상
- **내용**: Django ORM 자동완성 기능 하이라이트
- **포함 요소**:
  - QuerySet 메서드 자동완성
  - 메서드 설명 툴팁
  - 파라미터 힌트

#### gallery-3.png - Template Features
- **크기**: 1280x800px 이상
- **내용**: 템플릿 관련 기능들
- **포함 요소**:
  - URL 태그 자동완성
  - 컨텍스트 변수 자동완성
  - 정적 파일 경로 자동완성

#### gallery-4.png - Cross-file Navigation
- **크기**: 1280x800px 이상
- **내용**: Go to Definition 기능
- **포함 요소**:
  - URL 이름에서 정의로 이동
  - View에서 템플릿으로 이동
  - 멀티 파일 표시

#### gallery-5.png - Forms Support
- **크기**: 1280x800px 이상
- **내용**: Django Forms 자동완성
- **포함 요소**:
  - Form 필드 자동완성
  - ModelForm Meta 옵션
  - 위젯 선택

## 🛠️ 제작 도구

### 디자인 도구
- **Figma**: 웹 기반 디자인 도구 (무료)
- **Canva**: 템플릿 기반 디자인 (부분 무료)
- **Photoshop**: 전문가용 (유료)
- **GIMP**: 오픈소스 대안 (무료)

### 스크린샷 도구
- **Mac**: CleanShot X, Shottr
- **Windows**: ShareX, Greenshot
- **Linux**: Flameshot, Spectacle

## 📐 디자인 가이드라인

### 색상 팔레트
```css
--django-green: #092E20;
--django-light-green: #44B78B;
--vscode-dark: #1E1E1E;
--vscode-blue: #007ACC;
--text-primary: #CCCCCC;
--text-secondary: #999999;
```

### 폰트
- **제목**: Segoe UI Semibold, 24-32px
- **본문**: Segoe UI Regular, 14-16px
- **코드**: Consolas, Monaco, 'Courier New', 14px

### 레이아웃 원칙
1. **여백**: 충분한 여백으로 깔끔한 디자인
2. **대비**: 텍스트와 배경의 충분한 대비
3. **일관성**: 모든 이미지에 일관된 스타일
4. **포커스**: 주요 기능을 명확히 강조

## 🎯 배너 디자인 예시

### banner.png 레이아웃
```
+------------------------------------------+
|                                          |
|     Django Power Tools for VS Code       |
|                                          |
|   PyCharm-like Django development        |
|          in Visual Studio Code           |
|                                          |
|    [Django Logo]    [VS Code Logo]       |
|                                          |
+------------------------------------------+
```

### 텍스트 배치
- 중앙 정렬
- 메인 타이틀: 48px, 흰색
- 서브 타이틀: 24px, 연한 녹색
- 로고: 하단에 작게 배치

## ✅ 체크리스트

제작 전:
- [ ] 색상 팔레트 준비
- [ ] VS Code 다크 테마 스크린샷
- [ ] Django 로고 다운로드 (SVG)
- [ ] VS Code 로고 다운로드 (SVG)

제작 시:
- [ ] 1280x640px 배너 제작
- [ ] 5개 이상의 갤러리 이미지
- [ ] 일관된 스타일 유지
- [ ] 텍스트 가독성 확인

최적화:
- [ ] PNG 압축 (TinyPNG)
- [ ] 파일 크기 확인 (각 2MB 이하)
- [ ] 다양한 화면에서 테스트

## 📋 파일 체크리스트

```
images/
├── icon.png ✅ (이미 존재)
├── icon.svg ✅ (이미 존재)
└── marketplace/
    ├── banner.png (1280x640)
    ├── gallery-1-overview.png
    ├── gallery-2-orm-autocomplete.png
    ├── gallery-3-template-features.png
    ├── gallery-4-navigation.png
    └── gallery-5-forms-support.png
```

## 🚀 마켓플레이스 업로드

1. [VS Code Marketplace Publisher](https://marketplace.visualstudio.com/manage)에 로그인
2. 확장 관리 페이지로 이동
3. "Edit" 클릭
4. "Gallery" 섹션에서 이미지 업로드
5. 순서 조정 (드래그 앤 드롭)
6. "Save" 클릭

## 💡 팁

- **첫 번째 이미지가 가장 중요**: 검색 결과에 표시됨
- **GIF 지원**: 갤러리에 GIF도 업로드 가능
- **다크 테마 사용**: 대부분의 개발자가 다크 테마 사용
- **실제 코드 표시**: 더미 데이터보다 실제 Django 코드 사용
- **Before/After**: 확장 설치 전후 비교 효과적