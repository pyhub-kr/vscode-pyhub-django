# CLAUDE.md

이 파일은 이 저장소에서 코드 작업을 할 때 Claude Code (claude.ai/code)에 대한 가이드를 제공합니다.

## 프로젝트 개요

이것은 VS Code에서 Django 개발 경험을 향상시키는 것을 목표로 하는 **Django Power Tools**라는 VS Code 확장 프로젝트입니다. 이 확장은 Django 개발자를 위해 PyCharm과 비교할 만한 IDE와 같은 기능을 제공하도록 설계되었습니다.

## 프로젝트 구조

현재 이 프로젝트는 한국어로 작성된 PRD(제품 요구사항 명세서)만 있는 초기 계획 단계에 있습니다. 실제 VS Code 확장 개발은 아직 시작되지 않았습니다.

## 주요 목표

이 확장은 VS Code에서 Django 개발자의 세 가지 주요 문제점을 해결하는 것을 목표로 합니다:

1. **Import 해결**: Django import 오류를 해결하기 위해 Python 경로를 자동으로 구성
2. **Django 인식 IntelliSense**: Django ORM 메서드, 모델 필드, URL 이름 및 템플릿 태그에 대한 자동 완성 제공
3. **워크플로우 자동화**: manage.py 명령에 대한 빠른 액세스 및 파일 간 탐색

## 개발 가이드라인

### 개발 시작 시

1. 다음을 사용하여 VS Code 확장 프로젝트를 초기화합니다:

```bash
yo code
```

프로젝트 타입으로 "New Extension (TypeScript)"를 선택하세요.

2. 포함할 주요 의존성:
   - VS Code Extension API
   - Python 확장 통합 (ms-python.python)
   - 향상된 IntelliSense를 위한 Language Server Protocol

### 아키텍처 고려사항

- 이 확장은 기존 Python/Pylance 언어 서버를 대체하는 것이 아니라 통합하고 확장해야 합니다
- Django 프로젝트 구조를 감지하기 위해 VS Code workspace API를 사용합니다 (manage.py 파일 찾기)
- 모델, URL 및 템플릿을 인덱싱하는 Django 프로젝트 분석기를 구현합니다

### 테스트 접근 방식

- Django 코드 분석 로직에 대한 단위 테스트
- 샘플 Django 프로젝트를 사용한 통합 테스트
- VS Code의 Extension Development Host 내에서 수동 테스트

### 확장 개발을 위한 일반적인 명령어

```bash
# 의존성 설치
npm install

# TypeScript 컴파일
npm run compile

# 개발을 위한 감시 모드
npm run watch

# 테스트 실행
npm test

# 확장 패키징
vsce package

# 개발 모드에서 확장 실행
# VS Code에서 F5를 누르거나:
code --extensionDevelopmentPath=.
```

## 기능 구현 우선순위

PRD를 기반으로 다음 순서로 기능을 구현합니다:

1. **MVP 기능**:
   - 스마트 경로 구성 (Django 프로젝트 루트 자동 감지)
   - 핵심 ORM 및 모델 자동 완성
   - manage.py 명령 팔레트
   - 기본 URL 태그 자동 완성

2. **V2 기능**:
   - 파일 간 하이퍼링크
   - 컨텍스트 인식 템플릿 자동 완성
   - 정적 파일 경로 자동 완성
   - 고급 스캐폴딩

## 중요 사항

- 대상 사용자는 Django 초보자와 숙련된 개발자 모두를 포함합니다
- 이 확장은 Python 3.8+ 및 Django 3.2+와 함께 작동해야 합니다
- 공식 Python 확장 (ms-python.python)에 의존합니다
- 범위 외: Flask/FastAPI 지원, 디버깅 기능, 데이터베이스 GUI, 배포 기능
