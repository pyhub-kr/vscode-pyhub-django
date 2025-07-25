# Pylance 확장 가능성 분석

## 개요

Pylance는 Microsoft의 Python language server로, VS Code에서 Python 개발을 위한 고급 IntelliSense 기능을 제공합니다. 이 문서는 Django Power Tools가 Pylance와 어떻게 협력할 수 있는지 분석합니다.

## Pylance 아키텍처

### 핵심 특징

1. **Closed Source**
   - Pylance는 proprietary 소프트웨어로 직접 수정 불가
   - 공식 확장 API 없음

2. **Language Server Protocol (LSP) 기반**
   - 표준 LSP 구현
   - VS Code와 JSON-RPC로 통신

3. **Pyright 기반**
   - 오픈소스 타입 체커 Pyright를 기반으로 구축
   - 정적 타입 분석 제공

## 통합 전략

### 1. 보완적 접근 (Complementary Approach)

Pylance를 대체하는 것이 아닌 보완하는 전략:

```typescript
// Django 특화 기능만 제공
const djangoCompletionProvider = vscode.languages.registerCompletionItemProvider(
    'python',
    {
        async provideCompletionItems(document, position, token, context) {
            // Pylance가 제공하지 않는 Django 특화 완성 항목
            const line = document.lineAt(position).text;
            
            // Django ORM 패턴 감지
            if (line.includes('.objects.')) {
                return getDjangoORMCompletions();
            }
            
            // 템플릿 태그 패턴 감지
            if (line.includes('{% url')) {
                return getUrlNameCompletions();
            }
            
            return [];
        }
    },
    '.', ' ', "'"
);
```

### 2. Language Feature 우선순위

VS Code는 여러 확장이 동일한 language feature를 제공할 때 우선순위를 관리:

1. **Completion Items 병합**
   - 여러 provider의 결과를 병합하여 표시
   - Django 특화 항목이 Pylance 결과와 함께 표시됨

2. **Score 기반 정렬**
   - `sortText` 속성으로 우선순위 조정 가능
   - Django 관련 항목을 상위에 표시

### 3. 설정 통합

Pylance 설정과의 호환성 유지:

```typescript
// Pylance 설정 확인 및 호환성 유지
const pylanceConfig = vscode.workspace.getConfiguration('python.analysis');
const typeCheckingMode = pylanceConfig.get('typeCheckingMode');

// Django 프로젝트에 맞는 설정 권장
if (typeCheckingMode === 'strict') {
    // Django 프로젝트에서는 'basic' 모드 권장
    vscode.window.showInformationMessage(
        'Django 프로젝트에서는 type checking mode를 "basic"으로 설정하는 것을 권장합니다.'
    );
}
```

## 기술적 구현 방안

### 1. Hover Provider

Django 특화 문서 제공:

```typescript
vscode.languages.registerHoverProvider('python', {
    provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);
        
        // Django 모델 필드 타입
        if (isDjangoField(word)) {
            return new vscode.Hover(
                new vscode.MarkdownString(getDjangoFieldDocumentation(word))
            );
        }
        
        return null;
    }
});
```

### 2. Definition Provider

Django 특화 정의 찾기:

```typescript
vscode.languages.registerDefinitionProvider('python', {
    async provideDefinition(document, position, token) {
        const line = document.lineAt(position).text;
        
        // URL 패턴 이름에서 URL 정의로 이동
        const urlMatch = line.match(/{% url ['"](\w+)['"]/);
        if (urlMatch) {
            const urlName = urlMatch[1];
            return await findUrlDefinition(urlName);
        }
        
        return null;
    }
});
```

### 3. Code Actions

Django 특화 코드 액션:

```typescript
vscode.languages.registerCodeActionsProvider('python', {
    provideCodeActions(document, range, context, token) {
        const actions = [];
        
        // Import 오류 해결
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.message.includes('unresolved import')) {
                actions.push(createDjangoImportFixAction(diagnostic));
            }
        }
        
        return actions;
    }
});
```

## 성능 최적화

### 1. 지연 로딩 (Lazy Loading)

```typescript
// Django 프로젝트 감지 시에만 기능 활성화
let djangoFeaturesActivated = false;

export async function activate(context: vscode.ExtensionContext) {
    // 기본 기능만 먼저 로드
    
    // Django 프로젝트 감지 시 추가 기능 활성화
    const managePy = await vscode.workspace.findFiles('**/manage.py', null, 1);
    if (managePy.length > 0) {
        await activateDjangoFeatures(context);
        djangoFeaturesActivated = true;
    }
}
```

### 2. 캐싱 전략

```typescript
// Django 모델 정보 캐싱
class DjangoModelCache {
    private cache = new Map<string, ModelInfo>();
    private lastUpdate = 0;
    
    async getModelInfo(modelName: string): Promise<ModelInfo> {
        // 캐시 유효성 검사 (5분)
        if (Date.now() - this.lastUpdate > 300000) {
            this.cache.clear();
        }
        
        if (!this.cache.has(modelName)) {
            const info = await parseModelInfo(modelName);
            this.cache.set(modelName, info);
        }
        
        return this.cache.get(modelName)!;
    }
}
```

## 제한사항 및 해결방안

### 1. 타입 정보 접근 불가

**문제**: Pylance의 타입 분석 결과에 직접 접근 불가

**해결방안**: 
- 자체 간단한 타입 추론 구현
- Django 패턴 기반 휴리스틱 사용

### 2. 중복 기능 방지

**문제**: Pylance와 기능 중복 시 사용자 혼란

**해결방안**:
- Django 특화 기능에만 집중
- 명확한 네이밍 규칙 (예: "Django: " 접두사)

### 3. 업데이트 동기화

**문제**: Pylance 업데이트로 인한 호환성 문제

**해결방안**:
- 최소한의 의존성 유지
- 표준 VS Code API만 사용

## 구현 로드맵

### Phase 1: 기본 통합
- Pylance 존재 여부 확인
- 기본 설정 호환성 검사

### Phase 2: Django 특화 IntelliSense
- Django ORM 자동완성
- 템플릿 태그 지원

### Phase 3: 고급 기능
- Cross-file navigation
- Django admin 통합

### Phase 4: 성능 최적화
- 캐싱 구현
- 증분 업데이트

## 결론

Pylance를 직접 확장할 수는 없지만, VS Code의 Language Extension API를 통해 Django 특화 기능을 제공함으로써 Pylance와 효과적으로 협력할 수 있습니다. 핵심은 중복을 피하고 Django 개발자에게 실질적인 가치를 제공하는 기능에 집중하는 것입니다.