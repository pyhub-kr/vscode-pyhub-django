# 단위 테스트 프레임워크 개요

## 테스트 환경

### 프레임워크
- **Test Runner**: Mocha
- **Assertion Library**: Node.js built-in assert
- **Mocking Library**: Sinon.js
- **Coverage Tool**: NYC (Istanbul)
- **VS Code Test**: @vscode/test-electron

### 테스트 구조
```
src/test/
├── suite/
│   ├── advancedOrmCompletion.test.ts     # ORM 자동 완성 테스트
│   ├── djangoModelCompletionProvider.test.ts  # 모델 자동 완성 테스트
│   ├── djangoProjectAnalyzer.test.ts     # 프로젝트 분석기 테스트
│   ├── extension.test.ts                  # 확장 활성화 테스트
│   ├── integration.test.ts                # 통합 테스트
│   ├── managePyCommands.test.ts           # manage.py 명령어 테스트
│   ├── projectPathConfiguration.test.ts   # 경로 설정 테스트
│   ├── pythonIntegration.test.ts          # Python 통합 테스트
│   └── urlTagCompletion.test.ts           # URL 태그 자동 완성 테스트
├── fixtures/                              # 테스트 픽스처
└── runTest.ts                            # 테스트 실행 진입점
```

## 테스트 커버리지 목표

### 전체 목표
- **라인 커버리지**: 80% 이상
- **함수 커버리지**: 80% 이상
- **브랜치 커버리지**: 70% 이상
- **구문 커버리지**: 80% 이상

### 기능별 테스트 현황

#### 1. Python Extension API 통합 ✅
- **파일**: pythonIntegration.test.ts
- **테스트 케이스**: 7개
- **커버리지**: PythonIntegration, PythonExecutor 클래스

#### 2. 스마트 프로젝트 경로 설정 ✅
- **파일**: projectPathConfiguration.test.ts
- **테스트 케이스**: 12개
- **커버리지**: ProjectPathConfigurator 클래스

#### 3. 핵심 ORM 및 모델 자동 완성 ✅
- **파일**: advancedOrmCompletion.test.ts
- **테스트 케이스**: 9개
- **커버리지**: AdvancedModelAnalyzer, EnhancedCompletionProvider

#### 4. manage.py 커맨드 팔레트 ✅
- **파일**: managePyCommands.test.ts
- **테스트 케이스**: 13개
- **커버리지**: ManagePyCommandHandler 클래스

#### 5. URL 태그 자동 완성 ✅
- **파일**: urlTagCompletion.test.ts
- **테스트 케이스**: 11개
- **커버리지**: UrlPatternAnalyzer, UrlTagCompletionProvider

## 테스트 작성 가이드라인

### 1. 테스트 구조
```typescript
suite('Feature Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    
    setup(() => {
        sandbox = sinon.createSandbox();
        // 테스트 설정
    });
    
    teardown(() => {
        sandbox.restore();
        // 정리 작업
    });
    
    test('should do something', async () => {
        // Given
        const input = 'test';
        
        // When
        const result = await someFunction(input);
        
        // Then
        assert.strictEqual(result, 'expected');
    });
});
```

### 2. Mocking VS Code API
```typescript
// vscode.window 모킹
sandbox.stub(vscode.window, 'showInformationMessage').resolves();

// vscode.workspace 모킹
sandbox.stub(vscode.workspace, 'findFiles').resolves([
    vscode.Uri.file('/path/to/file.py')
]);

// 문서 모킹
const mockDocument = {
    getText: () => 'file content',
    lineAt: (line: number) => ({
        text: 'line content'
    })
};
```

### 3. 비동기 테스트
```typescript
test('should handle async operations', async () => {
    const promise = analyzer.analyzeProject();
    
    // 비동기 작업 완료 대기
    await promise;
    
    // 또는 Promise 검증
    await assert.doesNotReject(promise);
});
```

## CI/CD 파이프라인

### GitHub Actions Workflow
1. **테스트 매트릭스**
   - OS: Ubuntu, Windows, macOS
   - Node.js: 16.x, 18.x
   - VS Code: Stable, Insiders

2. **품질 검사**
   - ESLint 린팅
   - TypeScript 컴파일
   - Prettier 포맷 검사
   - npm 보안 감사

3. **빌드 및 패키징**
   - PR 머지 시 자동 빌드
   - VSIX 파일 생성
   - 아티팩트 업로드

## 테스트 실행 명령어

### 로컬 테스트
```bash
# 모든 테스트 실행
npm test

# 단위 테스트만 실행
npm run test:unit

# 커버리지 포함 테스트
npm run test:coverage

# 특정 테스트만 실행
npm test -- --grep "URL Tag Completion"
```

### 디버깅
1. VS Code에서 F5로 Extension Development Host 실행
2. Debug Console에서 로그 확인
3. 브레이크포인트 설정 가능

## 모범 사례

### 1. 격리된 테스트
- 각 테스트는 독립적으로 실행 가능해야 함
- 전역 상태에 의존하지 않음
- setup/teardown으로 깨끗한 상태 유지

### 2. 의미 있는 테스트 이름
- 테스트하는 동작을 명확히 설명
- "should + 동사 + 기대 결과" 패턴 사용

### 3. AAA 패턴
- **Arrange**: 테스트 데이터 준비
- **Act**: 테스트 대상 실행
- **Assert**: 결과 검증

### 4. 엣지 케이스 테스트
- 빈 입력, null, undefined 처리
- 경계값 테스트
- 오류 상황 테스트

## 향후 개선 사항

1. **E2E 테스트 추가**
   - 실제 VS Code 환경에서 전체 워크플로우 테스트
   - Playwright 또는 Selenium 활용

2. **성능 테스트**
   - 대규모 프로젝트에서의 응답 시간 측정
   - 메모리 사용량 모니터링

3. **통합 테스트 강화**
   - 실제 Django 프로젝트와의 통합
   - 다양한 Django 버전 지원 테스트