# Django Power Tools 테스트 전략

## 개요
각 기능 개발 시 TDD(Test-Driven Development) 방식을 적용하여 안정적인 확장 개발을 보장합니다.

## 테스트 구조

### 1. 단위 테스트 (Unit Tests)
각 모듈과 컴포넌트에 대한 독립적인 테스트를 작성합니다.

#### Python Integration Tests (`pythonIntegration.test.ts`)
- ✅ Python Extension API 연동 성공 케이스
- ✅ Python Extension 없을 때 graceful degradation
- ✅ Python 환경 변경 감지 및 대응
- ✅ Python 실행 및 manage.py 명령 실행

#### Django Project Analyzer Tests (`djangoProjectAnalyzer.test.ts`)
- ✅ Django 프로젝트 감지 (manage.py 존재 여부)
- ✅ 모델 파일 파싱 및 정보 추출
- ✅ URL 패턴 파싱 및 추출
- ✅ settings.py에서 INSTALLED_APPS 추출
- ✅ 파일 변경 시 캐시 업데이트

#### Completion Provider Tests (`djangoModelCompletionProvider.test.ts`)
- ✅ QuerySet 메서드 자동 완성
- ✅ 체인된 QuerySet 메서드 자동 완성
- ✅ Django 필드 타입 자동 완성
- ✅ 관계 필드 스니펫 제공
- ✅ 모델 import 자동 완성

### 2. 통합 테스트 (Integration Tests)
실제 Django 프로젝트를 사용한 end-to-end 테스트

#### 테스트 Django 프로젝트 구조
```
test-django-project/
├── manage.py
├── myproject/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── blog/
│   ├── __init__.py
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
└── accounts/
    ├── __init__.py
    ├── models.py
    ├── views.py
    └── urls.py
```

### 3. 성능 테스트 (Performance Tests)
대규모 Django 프로젝트에서의 성능을 측정합니다.

- 초기 프로젝트 스캔 시간
- 자동 완성 응답 시간
- 메모리 사용량
- 파일 변경 시 업데이트 시간

## 테스트 실행 방법

### 단위 테스트 실행
```bash
# 모든 테스트 실행
npm test

# 특정 테스트 파일만 실행
npm test -- --grep "Python Integration"

# 디버그 모드로 실행
npm run test:debug
```

### VS Code에서 테스트 실행
1. F5를 눌러 Extension Development Host 실행
2. 새 창에서 Command Palette 열기 (Cmd+Shift+P)
3. "Developer: Run Extension Tests" 실행

## 테스트 커버리지 목표

### Phase 1 (MVP)
- 핵심 기능 80% 이상 커버리지
- 주요 사용 시나리오 테스트
- 에러 케이스 처리 검증

### Phase 2
- 전체 코드 90% 이상 커버리지
- 엣지 케이스 포함
- 성능 벤치마크 추가

## 모킹 전략

### Sinon.js 사용
- VS Code API 모킹
- 파일 시스템 모킹
- Python 프로세스 실행 모킹

### 테스트 데이터
- 실제 Django 코드 패턴 사용
- 다양한 Django 버전의 코드 스타일 포함
- 일반적인 사용 패턴과 엣지 케이스 모두 포함

## CI/CD 통합

### GitHub Actions 설정
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        vscode-version: [stable, insiders]
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 16
    - run: npm ci
    - run: npm test
```

## 이슈별 테스트 체크리스트

### 이슈 #2: Python Extension API 통합 ✅
- [x] Python Extension 연동 테스트
- [x] Python 환경 변경 감지 테스트
- [x] manage.py 실행 테스트

### 이슈 #3: 스마트 프로젝트 경로 설정
- [ ] Django 프로젝트 자동 감지 테스트
- [ ] Python 경로 자동 설정 테스트
- [ ] 가상환경 감지 테스트

### 이슈 #4: 핵심 ORM 및 모델 자동 완성
- [ ] 모델 필드 자동 완성 테스트
- [ ] QuerySet 메서드 자동 완성 테스트
- [ ] 모델 관계 추적 테스트

### 이슈 #5: manage.py 커맨드 팔레트
- [ ] 명령어 목록 표시 테스트
- [ ] 명령어 실행 테스트
- [ ] 에러 처리 테스트

### 이슈 #6: URL 태그 자동 완성
- [ ] URL 패턴 추출 테스트
- [ ] reverse() 함수 자동 완성 테스트
- [ ] 템플릿 내 URL 태그 테스트

## 베스트 프랙티스

1. **테스트 우선**: 기능 구현 전에 테스트 작성
2. **독립성**: 각 테스트는 독립적으로 실행 가능해야 함
3. **명확한 이름**: 테스트가 검증하는 내용을 명확히 표현
4. **AAA 패턴**: Arrange, Act, Assert 구조 준수
5. **빠른 실행**: 단위 테스트는 빠르게 실행되어야 함
6. **결정적**: 동일한 입력에 대해 항상 동일한 결과

## 문제 해결

### 일반적인 문제

1. **테스트가 실패하는 경우**
   - 의존성이 모두 설치되었는지 확인
   - TypeScript 컴파일 에러 확인
   - 모킹이 올바르게 설정되었는지 확인

2. **테스트가 느린 경우**
   - 불필요한 파일 시스템 접근 제거
   - 무거운 작업은 모킹으로 대체
   - 병렬 실행 고려

3. **간헐적 실패**
   - 비동기 작업이 올바르게 처리되는지 확인
   - 타이밍에 의존하는 테스트 제거
   - 테스트 간 상태 공유 제거