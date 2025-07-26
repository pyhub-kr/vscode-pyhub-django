# 스마트 프로젝트 경로 설정

## 개요

Django Power Tools는 Django 프로젝트를 자동으로 감지하고 Python 경로를 구성하여 import 오류를 해결합니다. 이는 별도의 설정 없이도 Django 모듈을 올바르게 인식할 수 있도록 도와줍니다.

## 주요 기능

### 1. 자동 Django 프로젝트 감지

확장이 활성화되면 자동으로 워크스페이스에서 `manage.py` 파일을 검색하여 Django 프로젝트를 찾습니다.

```
workspace/
├── backend/
│   ├── manage.py  ← 자동 감지
│   ├── myproject/
│   │   └── settings.py
│   └── apps/
│       └── myapp/
│           └── models.py
└── frontend/
    └── package.json
```

### 2. Python 경로 자동 구성

Django 프로젝트가 감지되면 사용자에게 Python 경로 구성을 제안합니다:

1. **사용자 프롬프트**: "Django project detected at /path/to/project. Would you like to add it to Python paths?"
2. **자동 설정**: 승인 시 `python.analysis.extraPaths`에 프로젝트 루트 추가
3. **즉시 적용**: Python Language Server 자동 재시작

### 3. 다중 프로젝트 지원

워크스페이스에 여러 Django 프로젝트가 있는 경우:

```
workspace/
├── project1/
│   └── manage.py
├── project2/
│   └── manage.py
└── project3/
    └── manage.py
```

- 모든 프로젝트를 감지하고 선택적으로 구성 가능
- Command Palette에서 "Django Power Tools: Configure Python Paths" 실행

### 4. 실시간 프로젝트 감지

새로운 Django 프로젝트가 추가되면 자동으로 감지:

- 파일 감시자가 새로운 `manage.py` 파일 모니터링
- 새 프로젝트 발견 시 자동으로 구성 제안

## 사용 방법

### 자동 구성

1. Django 프로젝트가 포함된 폴더를 VS Code에서 열기
2. Django Power Tools 확장 활성화
3. 프롬프트가 나타나면 "Yes" 선택
4. Import 오류가 자동으로 해결됨

### 수동 구성

1. Command Palette 열기 (Cmd/Ctrl + Shift + P)
2. "Django Power Tools: Configure Python Paths" 실행
3. 구성할 프로젝트 선택
4. Python Language Server가 자동으로 재시작됨

### 경로 제거

1. Command Palette에서 "Django Power Tools: Remove Project from Python Paths" 실행
2. 제거할 경로 선택
3. 변경사항이 즉시 적용됨

## 설정

### `djangoPowerTools.enableAutoImportConfig`

- **타입**: boolean
- **기본값**: true
- **설명**: Django 프로젝트 감지 시 자동으로 Python 경로 구성 제안

```json
{
  "djangoPowerTools.enableAutoImportConfig": true
}
```

"Don't ask again" 선택 시 이 설정이 자동으로 false로 변경됩니다.

## 기술적 세부사항

### Python 경로 구성

확장은 VS Code의 Python 설정을 수정합니다:

```json
{
  "python.analysis.extraPaths": [
    "/path/to/django/project"
  ]
}
```

### 지원되는 프로젝트 구조

다양한 Django 프로젝트 구조를 지원합니다:

1. **표준 구조**
   ```
   myproject/
   ├── manage.py
   ├── myproject/
   └── apps/
   ```

2. **src 레이아웃**
   ```
   project/
   ├── src/
   │   ├── manage.py
   │   └── myproject/
   └── tests/
   ```

3. **모노레포**
   ```
   monorepo/
   ├── backend/
   │   └── manage.py
   ├── frontend/
   └── shared/
   ```

## 문제 해결

### Import 오류가 여전히 발생하는 경우

1. Python Language Server가 재시작되었는지 확인
2. 올바른 Python 인터프리터가 선택되었는지 확인
3. 가상환경이 활성화되었는지 확인
4. `.vscode/settings.json`에서 경로 확인

### 자동 감지가 작동하지 않는 경우

1. `manage.py` 파일이 존재하는지 확인
2. 파일이 `node_modules` 등 제외된 디렉토리에 있지 않은지 확인
3. 수동으로 "Configure Python Paths" 명령 실행

## 보안 고려사항

- 모든 경로 수정은 워크스페이스 수준에서만 적용
- 사용자 동의 없이 설정을 변경하지 않음
- 민감한 정보는 로그에 기록되지 않음