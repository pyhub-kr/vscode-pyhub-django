# Django Power Tools 통합 아키텍처 설계

## 개요

이 문서는 Django Power Tools 확장의 전체 아키텍처와 Python Extension/Pylance와의 통합 설계를 정의합니다.

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        VS Code                              │
├─────────────────────────────────────────────────────────────┤
│  Django Power Tools Extension                               │
│  ┌─────────────────────┬──────────────────────────────┐   │
│  │   Core Module       │    Provider Module            │   │
│  ├─────────────────────┼──────────────────────────────┤   │
│  │ - Django Detector   │ - Completion Provider        │   │
│  │ - Path Configurator │ - Hover Provider             │   │
│  │ - Command Registry  │ - Definition Provider        │   │
│  │ - Python Extension  │ - Code Action Provider       │   │
│  │   Integration       │                              │   │
│  └─────────────────────┴──────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Python Extension (ms-python.python)                        │
│  ┌─────────────────────┬──────────────────────────────┐   │
│  │ Python Interpreter  │    Pylance Language Server   │   │
│  │ Management          │    (Closed Source)           │   │
│  └─────────────────────┴──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 핵심 모듈

### 1. Django Project Detector

**책임**: Django 프로젝트 자동 감지 및 구조 분석

```typescript
interface DjangoProjectInfo {
    rootPath: string;
    managePyPath: string;
    settingsPath?: string;
    apps: DjangoApp[];
    version?: string;
}

interface DjangoApp {
    name: string;
    path: string;
    hasModels: boolean;
    hasUrls: boolean;
    hasViews: boolean;
}
```

**구현 전략**:
- `manage.py` 파일 탐색
- `settings.py` 분석을 통한 앱 목록 추출
- 각 앱의 구조 분석 (models.py, urls.py, views.py)

### 2. Python Path Configurator

**책임**: Python 경로 자동 설정 및 관리

```typescript
class PythonPathConfigurator {
    async configurePaths(projectInfo: DjangoProjectInfo): Promise<void> {
        // 1. 현재 python.analysis.extraPaths 읽기
        // 2. Django 프로젝트 루트 추가
        // 3. 각 앱 디렉토리 추가 (옵션)
        // 4. 사용자 확인 후 설정 업데이트
    }
}
```

### 3. Django Model Parser

**책임**: Django 모델 분석 및 메타데이터 추출

```typescript
interface ModelInfo {
    name: string;
    fields: FieldInfo[];
    methods: MethodInfo[];
    meta?: MetaInfo;
}

interface FieldInfo {
    name: string;
    type: string;
    isRequired: boolean;
    hasDefault: boolean;
    relatedModel?: string;
}
```

**구현 전략**:
- AST(Abstract Syntax Tree) 기반 Python 파일 파싱
- 정규식을 통한 간단한 패턴 매칭 (폴백)
- 증분 업데이트 지원

### 4. Provider System

#### Completion Provider
- Django ORM 메서드 자동완성
- 모델 필드 자동완성
- URL 패턴 이름 자동완성
- 템플릿 태그 자동완성

#### Hover Provider
- Django 필드 타입 문서
- ORM 메서드 설명
- 빠른 예제 제공

#### Definition Provider
- URL 이름 → URL 정의
- 뷰 함수 → 뷰 구현
- 템플릿 이름 → 템플릿 파일

#### Code Action Provider
- Import 오류 자동 수정
- 모델 필드 타입 힌트 추가
- Django 관련 린트 수정

## Python Extension 통합

### API 통합 포인트

```typescript
interface PythonExtensionIntegration {
    // Python 인터프리터 정보 획득
    async getInterpreter(): Promise<InterpreterInfo>;
    
    // 가상환경 감지
    async getEnvironment(): Promise<EnvironmentInfo>;
    
    // Python 경로 설정 동기화
    async syncPythonPaths(): Promise<void>;
}
```

### 이벤트 기반 통합

```typescript
// Python 인터프리터 변경 감지
pythonApi.onDidChangeInterpreter((e) => {
    // Django 프로젝트 재분석
    // 경로 재설정
});

// 파일 변경 감지
vscode.workspace.onDidSaveTextDocument((document) => {
    if (isDjangoFile(document)) {
        // 증분 업데이트
        updateDjangoMetadata(document);
    }
});
```

## 성능 최적화 전략

### 1. 지연 로딩 (Lazy Loading)

```typescript
class DjangoFeatureManager {
    private featuresLoaded = false;
    
    async ensureFeaturesLoaded() {
        if (!this.featuresLoaded) {
            await this.loadFeatures();
            this.featuresLoaded = true;
        }
    }
    
    private async loadFeatures() {
        // Provider 등록
        // 명령어 등록
        // 파서 초기화
    }
}
```

### 2. 캐싱 시스템

```typescript
class DjangoMetadataCache {
    private cache = new Map<string, CacheEntry>();
    private readonly TTL = 5 * 60 * 1000; // 5분
    
    set(key: string, value: any) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
    
    get(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.value;
    }
}
```

### 3. 증분 업데이트

```typescript
class IncrementalUpdater {
    async updateFile(filePath: string) {
        // 변경된 파일만 재분석
        if (isModelFile(filePath)) {
            await this.updateModelInfo(filePath);
        } else if (isUrlFile(filePath)) {
            await this.updateUrlPatterns(filePath);
        }
    }
}
```

## 에러 처리 및 복구

### 1. Graceful Degradation

```typescript
async function activateWithFallback() {
    try {
        // 전체 기능 활성화 시도
        await activateFullFeatures();
    } catch (error) {
        console.error('Full activation failed:', error);
        
        try {
            // 기본 기능만 활성화
            await activateBasicFeatures();
        } catch (basicError) {
            // 최소 기능 모드
            vscode.window.showWarningMessage(
                'Django Power Tools: 일부 기능이 제한될 수 있습니다.'
            );
        }
    }
}
```

### 2. 에러 복구 전략

- Python Extension 없음 → 설치 안내
- Django 프로젝트 아님 → 기능 비활성화
- 파싱 실패 → 폴백 파서 사용
- 네트워크 오류 → 캐시된 데이터 사용

## 보안 고려사항

### 1. 경로 검증

```typescript
function validatePath(path: string): boolean {
    // 경로 순회 공격 방지
    if (path.includes('..')) return false;
    
    // 절대 경로 차단
    if (path.startsWith('/') || path.includes(':')) return false;
    
    return true;
}
```

### 2. 코드 실행 격리

- `eval()` 사용 금지
- 사용자 입력 검증
- 안전한 정규식 패턴 사용

## 테스트 전략

### 1. 단위 테스트

```typescript
describe('DjangoModelParser', () => {
    it('should parse simple model', async () => {
        const modelCode = `
class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
        `;
        
        const result = await parser.parse(modelCode);
        expect(result.fields).toHaveLength(2);
    });
});
```

### 2. 통합 테스트

- 실제 Django 프로젝트로 테스트
- Python Extension과의 통합 테스트
- 다양한 Django 버전 테스트

### 3. 성능 테스트

- 대규모 프로젝트 로딩 시간
- 자동완성 응답 시간
- 메모리 사용량 모니터링

## 배포 전략

### 1. 버전 관리

- Semantic Versioning 사용
- Python Extension 버전 호환성 명시
- Django 버전 호환성 명시

### 2. 점진적 롤아웃

1. Alpha: 내부 테스트
2. Beta: 제한된 사용자 그룹
3. RC: 공개 베타
4. Stable: 정식 릴리스

## 향후 확장 계획

### Phase 1 (MVP)
- 기본 경로 설정
- ORM 자동완성
- manage.py 명령어

### Phase 2
- 고급 자동완성
- Cross-file navigation
- 템플릿 지원

### Phase 3
- Django admin 통합
- 테스트 러너 통합
- 디버깅 지원

### Phase 4
- AI 기반 코드 제안
- 프로젝트 템플릿
- 배포 도구 통합

## 결론

이 아키텍처는 Django Power Tools가 기존 Python 개발 환경과 조화롭게 통합되면서도 Django 특화 기능을 효과적으로 제공할 수 있도록 설계되었습니다. 모듈화된 구조와 점진적 기능 확장을 통해 안정적이고 확장 가능한 시스템을 구축할 수 있습니다.