# Python Extension API 통합 연구

## 개요
이 문서는 Django Power Tools VS Code 확장이 Microsoft Python Extension 및 Pylance Language Server와 통합하는 방법을 연구한 내용을 담고 있습니다.

## 1. Microsoft Python Extension 통합

### 1.1 의존성 선언
VS Code 확장은 `package.json`에서 다른 확장에 대한 의존성을 선언할 수 있습니다:

```json
{
  "extensionDependencies": [
    "ms-python.python",
    "ms-python.vscode-pylance"
  ]
}
```

### 1.2 Python Extension API 접근
Python Extension은 API를 통해 다른 확장이 Python 환경 정보에 접근할 수 있도록 합니다:

```typescript
import { extensions } from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
    const pythonApi = await getPythonExtensionAPI();
    if (pythonApi) {
        // Python 인터프리터 정보 가져오기
        const activeInterpreter = pythonApi.environments.getActiveEnvironmentPath();
        // Python 환경 변경 감지
        pythonApi.environments.onDidChangeActiveEnvironmentPath((e) => {
            console.log('Python environment changed:', e);
        });
    }
}

async function getPythonExtensionAPI() {
    const extension = extensions.getExtension('ms-python.python');
    if (!extension) {
        return undefined;
    }
    
    const api = await extension.activate();
    return api;
}
```

### 1.3 주요 API 기능
- **환경 관리**: Python 인터프리터 선택 및 가상 환경 감지
- **디버깅 통합**: Python 디버거와의 통합
- **테스트 통합**: pytest, unittest 등과의 통합
- **린팅/포매팅**: Pylint, Black 등과의 통합

## 2. Pylance Language Server 확장

### 2.1 Language Server Protocol (LSP) 이해
Pylance는 LSP를 구현한 Language Server로, VS Code와 통신하여 다음 기능을 제공합니다:
- 자동 완성 (Completion)
- 호버 정보 (Hover)
- 정의로 이동 (Go to Definition)
- 참조 찾기 (Find References)
- 리팩토링 (Refactoring)

### 2.2 Pylance 확장 방법
Pylance 자체를 직접 확장하는 것은 제한적이지만, 다음 방법들을 사용할 수 있습니다:

1. **Completion Item Provider 등록**
```typescript
vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'python' },
    {
        provideCompletionItems(document, position) {
            // Django 특화 자동 완성 항목 제공
            return getDjangoCompletions(document, position);
        }
    },
    '.', // 트리거 문자
);
```

2. **Hover Provider 등록**
```typescript
vscode.languages.registerHoverProvider(
    { scheme: 'file', language: 'python' },
    {
        provideHover(document, position) {
            // Django 특화 호버 정보 제공
            return getDjangoHoverInfo(document, position);
        }
    }
);
```

3. **Definition Provider 등록**
```typescript
vscode.languages.registerDefinitionProvider(
    { scheme: 'file', language: 'python' },
    {
        provideDefinition(document, position) {
            // Django URL 패턴, 템플릿 등으로 이동
            return getDjangoDefinitions(document, position);
        }
    }
);
```

## 3. Django 특화 기능 구현 전략

### 3.1 프로젝트 구조 분석
1. Django 프로젝트 자동 감지 (manage.py 파일 존재 여부)
2. settings.py 파싱을 통한 설정 정보 추출
3. INSTALLED_APPS 분석을 통한 앱 구조 파악

### 3.2 모델 및 ORM 자동 완성
1. models.py 파일 파싱
2. 모델 클래스 및 필드 정보 추출
3. QuerySet 메서드 자동 완성 제공

### 3.3 URL 패턴 분석
1. urls.py 파일 파싱
2. URL 이름 및 뷰 함수 매핑
3. reverse() 함수에서 URL 이름 자동 완성

### 3.4 템플릿 지원
1. 템플릿 디렉토리 위치 파악
2. 템플릿 태그 및 필터 자동 완성
3. 컨텍스트 변수 추적

## 4. 기술적 제약사항

### 4.1 Pylance의 제한사항
- Pylance는 closed-source이므로 직접적인 수정 불가
- Type stub 파일을 통한 타입 정보 제공이 제한적

### 4.2 성능 고려사항
- 대규모 Django 프로젝트에서의 파싱 성능
- 실시간 분석과 캐싱 전략 필요

### 4.3 호환성 문제
- Django 버전별 차이점 처리
- Python 버전별 호환성 유지

## 5. 프로토타입 구현 계획

### 5.1 Phase 1: 기본 통합
- Python Extension API 연동
- Django 프로젝트 감지

### 5.2 Phase 2: 자동 완성
- 모델 필드 자동 완성
- QuerySet 메서드 자동 완성

### 5.3 Phase 3: 고급 기능
- URL 패턴 분석 및 자동 완성
- 템플릿 지원

## 6. 다음 단계
1. Python Extension API 프로토타입 코드 작성
2. Django 프로젝트 파서 구현
3. 자동 완성 프로바이더 개발
4. 성능 테스트 및 최적화