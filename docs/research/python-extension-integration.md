# Python Extension API 통합 연구

## 개요

Django Power Tools는 Microsoft의 Python Extension (ms-python.python)과 통합하여 Django 특화 기능을 제공해야 합니다. 이 문서는 통합 방법과 기술적 접근 방식을 연구한 결과를 정리합니다.

## Python Extension API 개요

### 핵심 구성요소

1. **Python Extension API**
   - Python 인터프리터 선택 및 관리
   - 가상환경 감지 및 활성화
   - Python 경로 설정

2. **Pylance Language Server**
   - Python 코드 분석 및 IntelliSense 제공
   - 타입 체킹 및 자동 완성
   - Language Server Protocol (LSP) 기반

### 주요 API 접근점

```typescript
// Python extension 활성화 및 API 접근
const pythonExtension = vscode.extensions.getExtension('ms-python.python');
if (pythonExtension) {
    const pythonApi = await pythonExtension.activate();
    
    // 현재 인터프리터 정보 가져오기
    const interpreter = await pythonApi.settings.getExecutionDetails();
}
```

## 통합 전략

### 1. Python 인터프리터 통합

```typescript
interface PythonExtensionApi {
    // 현재 활성 인터프리터 경로
    settings: {
        getExecutionDetails(resource?: Uri): Promise<{
            execCommand: string[];
        }>;
    };
    
    // 환경 변수 가져오기
    getEnvironmentVariables(resource?: Uri): Promise<EnvironmentVariables>;
}
```

### 2. 경로 설정 통합

Django 프로젝트의 경로를 Python Extension의 `python.analysis.extraPaths`에 추가하는 방법:

```typescript
// workspace 설정 업데이트
const config = vscode.workspace.getConfiguration('python', workspaceFolder);
const currentPaths = config.get<string[]>('analysis.extraPaths') || [];

if (!currentPaths.includes(projectRoot)) {
    currentPaths.push(projectRoot);
    await config.update('analysis.extraPaths', currentPaths, 
        vscode.ConfigurationTarget.WorkspaceFolder);
}
```

### 3. Language Server Protocol 확장

Pylance와의 통합을 위한 LSP 확장 방법:

1. **Custom Language Server 구현**
   - Django 특화 기능을 위한 별도 Language Server
   - Pylance와 협력하여 작동

2. **Completion Provider 등록**
   ```typescript
   // Django 모델 자동완성 제공
   vscode.languages.registerCompletionItemProvider(
       'python',
       {
           provideCompletionItems(document, position) {
               // Django 특화 완성 항목 제공
           }
       },
       '.' // 트리거 문자
   );
   ```

## 기술적 제약사항

### 1. Pylance 직접 확장 불가

- Pylance는 closed-source이며 직접적인 확장 포인트를 제공하지 않음
- 대안: VS Code의 Language Feature API를 통한 보완적 기능 제공

### 2. 경로 설정 충돌

- 여러 확장이 `python.analysis.extraPaths`를 수정할 경우 충돌 가능성
- 해결책: 기존 경로를 보존하면서 추가하는 방식 사용

### 3. 성능 고려사항

- Django 프로젝트 분석은 리소스 집약적일 수 있음
- 증분 업데이트 및 캐싱 전략 필요

## 구현 계획

### Phase 1: 기본 통합
1. Python Extension API 연동
2. 인터프리터 정보 획득
3. Django 프로젝트 감지

### Phase 2: 경로 설정
1. manage.py 위치 기반 프로젝트 루트 감지
2. python.analysis.extraPaths 자동 설정
3. 사용자 확인 UI

### Phase 3: IntelliSense 확장
1. Django 모델 파서 구현
2. Completion Provider 등록
3. Hover Provider 구현

### Phase 4: 고급 기능
1. Definition Provider (Go to Definition)
2. Reference Provider (Find All References)
3. Symbol Provider (Outline)

## 프로토타입 코드

### 기본 통합 예제

```typescript
import * as vscode from 'vscode';

export async function activatePythonIntegration(context: vscode.ExtensionContext) {
    // Python extension 확인
    const pythonExt = vscode.extensions.getExtension('ms-python.python');
    if (!pythonExt) {
        vscode.window.showErrorMessage('Python extension이 설치되지 않았습니다.');
        return;
    }

    // Python extension이 활성화될 때까지 대기
    if (!pythonExt.isActive) {
        await pythonExt.activate();
    }

    const pythonApi = pythonExt.exports;
    
    // 현재 Python 인터프리터 정보
    const interpreter = await pythonApi.settings.getExecutionDetails();
    console.log('Python 인터프리터:', interpreter.execCommand);
    
    // Django 프로젝트 감지
    const managePyFiles = await vscode.workspace.findFiles('**/manage.py');
    if (managePyFiles.length > 0) {
        const projectRoot = vscode.workspace.asRelativePath(
            managePyFiles[0], 
            false
        ).replace('/manage.py', '');
        
        // 경로 설정 업데이트
        await updatePythonPaths(projectRoot);
    }
}

async function updatePythonPaths(projectRoot: string) {
    const config = vscode.workspace.getConfiguration('python');
    const extraPaths = config.get<string[]>('analysis.extraPaths') || [];
    
    if (!extraPaths.includes(projectRoot)) {
        extraPaths.push(projectRoot);
        await config.update(
            'analysis.extraPaths', 
            extraPaths,
            vscode.ConfigurationTarget.Workspace
        );
        
        vscode.window.showInformationMessage(
            `Django 프로젝트 경로가 추가되었습니다: ${projectRoot}`
        );
    }
}
```

## 다음 단계

1. Python Extension API의 전체 인터페이스 문서화
2. Pylance와의 상호작용 방식 상세 분석
3. Django 특화 Language Server 프로토타입 개발
4. 성능 벤치마크 및 최적화 전략 수립

## 참고 자료

- [VS Code Python Extension API](https://github.com/microsoft/vscode-python/wiki/Python-Extension-API)
- [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/)
- [VS Code Language Extensions](https://code.visualstudio.com/api/language-extensions/overview)
- [Pylance Release Notes](https://github.com/microsoft/pylance-release/releases)