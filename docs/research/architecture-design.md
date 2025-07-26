# Django Power Tools 아키텍처 설계

## 1. 전체 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension Host                   │
├─────────────────────────────────────────────────────────────┤
│                    Django Power Tools                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Extension Core                       │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │   Project   │  │   Command    │  │  Settings  │ │   │
│  │  │  Detector   │  │   Handler    │  │  Manager   │ │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Language Service Providers              │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ Completion  │  │    Hover     │  │ Definition │ │   │
│  │  │  Provider   │  │   Provider   │  │  Provider  │ │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Django Analyzers                     │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │   Model     │  │     URL      │  │  Template  │ │   │
│  │  │  Analyzer   │  │   Analyzer   │  │  Analyzer  │ │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Utilities                         │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │    Cache    │  │    Parser    │  │   Logger   │ │   │
│  │  │   Manager   │  │   Utilities  │  │            │ │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Dependencies                     │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐│
│  │   MS Python     │  │   Pylance    │  │  Django Project││
│  │   Extension     │  │              │  │     Files      ││
│  └─────────────────┘  └──────────────┘  └────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 2. 컴포넌트 상세 설명

### 2.1 Extension Core

#### Project Detector
- Django 프로젝트 자동 감지 (manage.py 파일 검색)
- 프로젝트 구조 분석 및 설정 파일 파싱
- 가상 환경 및 Python 인터프리터 감지

#### Command Handler
- VS Code 명령 팔레트 통합
- manage.py 명령어 실행
- 사용자 입력 처리 및 검증

#### Settings Manager
- 확장 설정 관리
- 프로젝트별 설정 오버라이드
- 설정 변경 감지 및 적용

### 2.2 Language Service Providers

#### Completion Provider
- Django 모델 필드 자동 완성
- QuerySet 메서드 자동 완성
- URL 이름 및 템플릿 태그 자동 완성

#### Hover Provider
- 모델 필드 타입 정보 표시
- Django 메서드 문서화 표시
- 설정 값 설명 표시

#### Definition Provider
- 모델 정의로 이동
- URL 패턴에서 뷰로 이동
- 템플릿에서 뷰 컨텍스트로 이동

### 2.3 Django Analyzers

#### Model Analyzer
- models.py 파일 파싱
- 모델 클래스 및 필드 정보 추출
- 모델 간 관계 분석
- 커스텀 매니저 및 메서드 감지

#### URL Analyzer
- urls.py 파일 파싱
- URL 패턴 및 이름 추출
- include된 URL 설정 재귀적 분석
- 뷰 함수/클래스 매핑

#### Template Analyzer
- 템플릿 디렉토리 검색
- 템플릿 상속 구조 분석
- 사용된 템플릿 태그 및 필터 추출
- 컨텍스트 변수 추적

### 2.4 Utilities

#### Cache Manager
- 분석된 데이터 캐싱
- 파일 변경 감지 및 캐시 무효화
- 메모리 사용량 관리

#### Parser Utilities
- Python AST 파싱 헬퍼
- Django 특화 파싱 로직
- 정규식 기반 패턴 매칭

#### Logger
- 디버깅 및 오류 추적
- 성능 모니터링
- 사용자 활동 로깅

## 3. 데이터 흐름

### 3.1 초기화 플로우
1. 확장 활성화
2. Python Extension API 연결
3. Django 프로젝트 감지
4. 프로젝트 구조 분석
5. 초기 캐시 구축

### 3.2 자동 완성 플로우
1. 사용자 타이핑 감지
2. 현재 컨텍스트 분석
3. 관련 Django 요소 검색
4. 자동 완성 항목 생성
5. VS Code에 제안 목록 전달

### 3.3 명령 실행 플로우
1. 명령 팔레트에서 명령 선택
2. 필요한 매개변수 수집
3. Python 환경에서 manage.py 실행
4. 출력 캡처 및 표시
5. 오류 처리 및 사용자 피드백

## 4. 인터페이스 정의

### 4.1 Extension API
```typescript
interface DjangoPowerToolsAPI {
    // 프로젝트 정보
    getProjectInfo(): Promise<DjangoProjectInfo>;
    
    // 모델 정보
    getModels(): Promise<DjangoModel[]>;
    getModelFields(modelName: string): Promise<ModelField[]>;
    
    // URL 정보
    getUrlPatterns(): Promise<UrlPattern[]>;
    getUrlByName(name: string): Promise<UrlPattern | undefined>;
    
    // 명령 실행
    runManageCommand(command: string, args?: string[]): Promise<CommandResult>;
}
```

### 4.2 내부 인터페이스
```typescript
interface DjangoAnalyzer {
    analyze(): Promise<void>;
    getResults(): AnalysisResult;
    onDidChange(callback: () => void): Disposable;
}

interface CacheManager {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    invalidate(pattern?: string): void;
}
```

## 5. 확장성 고려사항

### 5.1 플러그인 시스템
- 커스텀 분석기 추가 가능
- 서드파티 Django 앱 지원
- 사용자 정의 자동 완성 규칙

### 5.2 성능 최적화
- 증분 분석 (변경된 파일만 재분석)
- 백그라운드 작업 큐
- 지연 로딩 및 페이지네이션

### 5.3 에러 처리
- 우아한 실패 (Graceful Degradation)
- 상세한 오류 메시지
- 복구 메커니즘

## 6. 보안 고려사항

### 6.1 코드 실행 격리
- manage.py 명령 샌드박싱
- 사용자 입력 검증
- 경로 탐색 공격 방지

### 6.2 데이터 프라이버시
- 로컬 캐시만 사용
- 외부 서버 통신 없음
- 민감한 정보 마스킹

## 7. 테스트 전략

### 7.1 단위 테스트
- 각 분석기별 독립 테스트
- 파서 유틸리티 테스트
- 캐시 매니저 테스트

### 7.2 통합 테스트
- 실제 Django 프로젝트 사용
- 엔드투엔드 시나리오 테스트
- 성능 벤치마크

### 7.3 호환성 테스트
- Django 버전별 테스트 (3.2, 4.0, 4.1, 4.2)
- Python 버전별 테스트 (3.8, 3.9, 3.10, 3.11)
- VS Code 버전 호환성