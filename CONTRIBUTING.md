# Django Power Tools 기여 가이드

Django Power Tools 프로젝트에 기여해 주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 📋 목차

1. [행동 강령](#행동-강령)
2. [시작하기](#시작하기)
3. [개발 환경 설정](#개발-환경-설정)
4. [기여 방법](#기여-방법)
5. [코딩 스타일](#코딩-스타일)
6. [커밋 메시지 규칙](#커밋-메시지-규칙)
7. [테스트 작성](#테스트-작성)
8. [문서화](#문서화)
9. [Pull Request 과정](#pull-request-과정)

## 행동 강령

이 프로젝트는 [Contributor Covenant](https://www.contributor-covenant.org/) 행동 강령을 따릅니다. 프로젝트에 참여함으로써 이 규칙을 준수하는 데 동의하는 것으로 간주됩니다.

## 시작하기

### 필요한 도구

- Node.js 16.x 이상
- npm 또는 yarn
- VS Code
- Git

### 프로젝트 구조 이해

```
django-power-tools/
├── src/                    # 소스 코드
│   ├── analyzers/         # Django 프로젝트 분석기
│   ├── providers/         # 자동 완성 제공자
│   ├── commands/          # VS Code 명령
│   └── extension.ts       # 확장 진입점
├── test/                  # 테스트 코드
│   ├── suite/            # 단위 테스트
│   └── fixtures/         # 테스트 픽스처
└── docs/                 # 문서
```

## 개발 환경 설정

1. **저장소 Fork 및 Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/vscode-pyhub-django.git
   cd vscode-pyhub-django
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **개발 모드 실행**
   ```bash
   npm run watch
   ```

4. **VS Code에서 디버깅**
   - VS Code에서 프로젝트 열기
   - `F5` 키를 눌러 Extension Development Host 실행
   - 새 창에서 Django 프로젝트를 열어 테스트

## 기여 방법

### 1. 이슈 확인

기여하기 전에 다음을 확인하세요:
- [기존 이슈](https://github.com/pyhub-kr/vscode-pyhub-django/issues) 확인
- 작업하려는 내용이 이미 진행 중이 아닌지 확인
- 새로운 기능이나 큰 변경사항은 먼저 이슈를 생성하여 논의

### 2. 브랜치 생성

```bash
git checkout -b feature/your-feature-name
# 또는
git checkout -b fix/issue-number
```

### 3. 변경사항 작성

- 하나의 PR은 하나의 기능/수정에 집중
- 관련 없는 변경사항은 별도 PR로 분리
- 기존 코드 스타일 준수

## 코딩 스타일

### TypeScript 스타일 가이드

```typescript
// ✅ Good
export class DjangoAnalyzer {
    private readonly CACHE_DURATION = 5000;
    
    constructor(private workspace: vscode.WorkspaceFolder) {}
    
    async analyze(): Promise<AnalysisResult> {
        // 구현
    }
}

// ❌ Bad
export class djangoAnalyzer {
    CACHE_DURATION = 5000;
    
    analyze() {
        // 구현
    }
}
```

### 명명 규칙

- **클래스**: PascalCase (예: `ModelAnalyzer`)
- **인터페이스**: PascalCase with 'I' prefix 지양 (예: `ModelInfo`)
- **함수/메서드**: camelCase (예: `analyzeProject`)
- **상수**: UPPER_SNAKE_CASE (예: `DEFAULT_TIMEOUT`)
- **파일명**: camelCase (예: `djangoProjectAnalyzer.ts`)

## 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅, 세미콜론 누락 등
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스, 도구 설정 등

### 예시
```
feat(completion): Django URL 태그 자동 완성 추가

- 템플릿 파일에서 {% url %} 태그 지원
- app_name 네임스페이스 처리
- URL 파라미터 힌트 제공

Closes #15
```

## 테스트 작성

### 단위 테스트

모든 새로운 기능은 테스트를 포함해야 합니다:

```typescript
suite('URL Pattern Analyzer', () => {
    test('should parse basic URL patterns', async () => {
        const analyzer = new UrlPatternAnalyzer();
        const patterns = await analyzer.analyze(urlsContent);
        
        assert.strictEqual(patterns.length, 3);
        assert.ok(patterns.some(p => p.name === 'home'));
    });
});
```

### 테스트 실행

```bash
# 모든 테스트
npm test

# 특정 테스트
npm test -- --grep "URL Pattern"

# 커버리지 포함
npm run test:coverage
```

### 테스트 커버리지

- 새로운 코드는 80% 이상의 커버리지 유지
- 중요한 로직은 100% 커버리지 목표

## 문서화

### 코드 문서화

```typescript
/**
 * Django 프로젝트의 URL 패턴을 분석합니다.
 * 
 * @param content - urls.py 파일 내용
 * @param filePath - 파일 경로
 * @returns 파싱된 URL 패턴 배열
 * 
 * @example
 * ```typescript
 * const patterns = await analyzer.analyzeUrlFile(content, 'app/urls.py');
 * ```
 */
async analyzeUrlFile(content: string, filePath: string): Promise<UrlPattern[]> {
    // 구현
}
```

### 사용자 문서

- 새로운 기능은 README.md 업데이트
- 복잡한 기능은 별도 문서 작성 (`docs/features/`)
- 스크린샷이나 GIF 추가 권장

## Pull Request 과정

1. **PR 생성 전 체크리스트**
   - [ ] 모든 테스트 통과
   - [ ] 린트 에러 없음 (`npm run lint`)
   - [ ] 문서 업데이트
   - [ ] 커밋 메시지 규칙 준수

2. **PR 템플릿 작성**
   ```markdown
   ## 변경사항
   - 무엇을 변경했는지 설명

   ## 이유
   - 왜 이 변경이 필요한지 설명

   ## 테스트
   - 어떻게 테스트했는지 설명

   ## 스크린샷 (해당되는 경우)
   - UI 변경사항이 있다면 스크린샷 첨부

   ## 체크리스트
   - [ ] 테스트 추가/업데이트
   - [ ] 문서 업데이트
   - [ ] 변경사항이 기존 기능을 깨뜨리지 않음
   ```

3. **리뷰 프로세스**
   - 최소 1명의 리뷰어 승인 필요
   - CI 테스트 모두 통과
   - 리뷰 코멘트에 적극적으로 응답

## 도움 요청

도움이 필요하신가요?

- [GitHub Discussions](https://github.com/pyhub-kr/vscode-pyhub-django/discussions)에서 질문
- [Discord 채널](https://discord.gg/pyhub) 참여
- 이메일: contributors@pyhub.kr

## 라이선스

기여하신 코드는 프로젝트의 MIT 라이선스를 따릅니다.

---

감사합니다! 여러분의 기여가 Django Power Tools를 더 나은 도구로 만듭니다. 🚀