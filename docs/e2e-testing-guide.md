# E2E Testing Guide for Django Power Tools

이 문서는 Django Power Tools VS Code 확장의 End-to-End (E2E) 테스트를 실행하고 관리하는 방법을 설명합니다.

## 📋 개요

E2E 테스트는 실제 VS Code 환경에서 확장의 기능을 테스트합니다. 이는 사용자 관점에서 전체 워크플로우를 검증합니다.

## 🛠️ 설정

### 1. 의존성 설치

```bash
npm install --save-dev vscode-extension-tester
```

### 2. 테스트 빌드

```bash
npm run compile
```

## 🧪 테스트 실행

### 모든 E2E 테스트 실행

```bash
npm run test:e2e
```

### 개별 시나리오 실행

```bash
# 초기 설정 테스트만
npm run test:e2e -- --grep "Initial Setup"

# ORM 자동완성 테스트만
npm run test:e2e -- --grep "ORM Autocomplete"

# 성능 테스트만
npm run test:e2e -- --grep "Performance"
```

### 디버그 모드로 실행

```bash
npm run test:e2e -- --debug
```

## 📁 테스트 구조

```
test/
├── e2e/
│   ├── setup.ts                    # 공통 설정 및 유틸리티
│   ├── scenarios/                  # 사용자 시나리오 테스트
│   │   ├── 01-initial-setup.test.ts
│   │   ├── 02-orm-autocomplete.test.ts
│   │   ├── 03-url-tag-autocomplete.test.ts
│   │   ├── 04-forms-autocomplete.test.ts
│   │   ├── 05-modelform-autocomplete.test.ts
│   │   ├── 06-cross-file-navigation.test.ts
│   │   ├── 07-static-files.test.ts
│   │   ├── 08-manage-commands.test.ts
│   │   └── 09-multi-project.test.ts
│   └── performance/               # 성능 벤치마크 테스트
│       └── benchmark.test.ts
```

## 📊 테스트 시나리오

### 1. Django 프로젝트 초기 설정
- 프로젝트 자동 감지
- Python 경로 구성
- import 오류 해결

### 2. Django ORM 자동완성
- QuerySet 메서드 자동완성
- 모델 필드 자동완성
- 필드 lookup 자동완성
- 커스텀 매니저 지원

### 3. URL 태그 자동완성
- 템플릿에서 URL 이름 자동완성
- 네임스페이스 지원
- 파라미터 힌트

### 4. Django Forms 자동완성
- Form 필드 타입
- 필드 옵션
- 위젯 선택

### 5. ModelForm 자동완성
- Meta 클래스 옵션
- 모델 선택
- fields/exclude 자동완성

### 6. Cross-file Navigation
- URL 이름에서 정의로 이동
- View에서 템플릿으로 이동
- 빠른 응답 시간

### 7. 정적 파일 경로
- 정적 파일 자동완성
- 디렉토리 탐색
- 파일 정보 표시

### 8. manage.py 명령
- Command Palette 통합
- 명령 실행
- 터미널 출력

### 9. 다중 프로젝트
- 여러 Django 프로젝트 지원
- 독립적인 경로 설정
- 프로젝트 간 격리

## ⚡ 성능 기준

| 측정 항목 | 목표 시간 | 설명 |
|-----------|-----------|------|
| 자동완성 응답 | < 100ms | 자동완성 목록이 나타나는 시간 |
| Go to Definition | < 200ms | 파일 간 이동 시간 |
| 초기 프로젝트 스캔 | < 5s | 프로젝트 분석 완료 시간 |
| 메모리 사용량 | < 100MB | 최대 메모리 사용량 |

## 🔧 문제 해결

### 테스트가 실패하는 경우

1. **타임아웃 오류**
   ```bash
   # 타임아웃 늘리기
   npm run test:e2e -- --timeout 120000
   ```

2. **VS Code 버전 문제**
   - `.vscode-test.json`에서 `vscodeVersion` 확인
   - 최신 버전으로 업데이트

3. **확장 로드 실패**
   ```bash
   # 확장 다시 빌드
   npm run compile
   npm run package
   ```

### 디버깅 팁

1. **스크린샷 캡처**
   ```typescript
   await setup.getDriver().takeScreenshot();
   ```

2. **콘솔 로그 확인**
   ```typescript
   const logs = await setup.getDriver().manage().logs().get('browser');
   ```

3. **느린 실행**
   ```bash
   npm run test:e2e -- --slow 10000
   ```

## 📝 새로운 테스트 추가

1. `test/e2e/scenarios/` 디렉토리에 새 파일 생성
2. 기본 템플릿 사용:

```typescript
import { expect } from 'chai';
import * as path from 'path';
import { E2ETestSetup } from '../setup';

describe('New Test Scenario', () => {
    let setup: E2ETestSetup;
    
    before(async function() {
        this.timeout(30000);
        setup = new E2ETestSetup();
        await setup.initialize();
    });
    
    after(async function() {
        await setup.cleanup();
    });
    
    it('should test something', async function() {
        // 테스트 구현
    });
});
```

## 🚀 CI/CD 통합

GitHub Actions에서 E2E 테스트 실행:

```yaml
- name: Run E2E Tests
  run: |
    npm ci
    npm run compile
    xvfb-run -a npm run test:e2e
  env:
    DISPLAY: ':99.0'
```

## 📊 테스트 리포트

테스트 실행 후 리포트 생성:

```bash
npm run test:e2e -- --reporter mocha-junit-reporter
```

결과는 `test-results.xml`에 저장됩니다.