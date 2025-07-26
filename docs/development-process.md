# Django Power Tools 개발 프로세스

## TDD 기반 개발 프로세스

### 1. 이슈별 개발 순서

각 GitHub 이슈를 처리할 때 다음 순서를 따릅니다:

1. **이슈 분석**
   - 요구사항 명확히 파악
   - 기술적 접근 방법 결정
   - 의존성 확인

2. **테스트 작성 (Red)**
   - 기능 요구사항에 맞는 테스트 케이스 작성
   - 실패하는 테스트 확인
   - 엣지 케이스 고려

3. **구현 (Green)**
   - 테스트를 통과하는 최소한의 코드 작성
   - 기능 구현
   - 테스트 통과 확인

4. **리팩토링 (Refactor)**
   - 코드 품질 개선
   - 중복 제거
   - 가독성 향상

5. **문서화**
   - API 문서 업데이트
   - 사용자 가이드 추가
   - 변경 사항 기록

## 현재까지 진행 상황

### ✅ 이슈 #2: Python Extension API 통합 연구

**테스트 작성**:
- `pythonIntegration.test.ts`: Python Extension 연동 테스트
- `djangoProjectAnalyzer.test.ts`: Django 프로젝트 분석 테스트  
- `djangoModelCompletionProvider.test.ts`: 자동 완성 프로바이더 테스트

**구현**:
- `pythonIntegration.ts`: Python Extension API 통합
- `djangoProjectAnalyzer.ts`: Django 프로젝트 분석기
- `djangoModelCompletionProvider.ts`: 자동 완성 프로바이더

**문서**:
- `python-extension-integration.md`: 통합 연구 문서
- `architecture-design.md`: 아키텍처 설계
- `technical-constraints.md`: 기술적 제약사항

### 🔄 다음 이슈들의 개발 프로세스

#### 이슈 #3: 스마트 프로젝트 경로 설정

**테스트 계획**:
```typescript
// projectPathConfiguration.test.ts
- Django 프로젝트 루트 자동 감지
- Python 경로 자동 구성
- 가상환경 감지 및 활성화
- 다중 워크스페이스 지원
```

**구현 계획**:
- 프로젝트 구조 스캐너 개선
- Python 경로 자동 설정
- VS Code 설정 통합

#### 이슈 #4: 핵심 ORM 및 모델 자동 완성

**테스트 계획**:
```typescript
// advancedOrmCompletion.test.ts
- 복잡한 QuerySet 체이닝
- 모델 관계 추적
- 커스텀 매니저 메서드
- 동적 필드 감지
```

**구현 계획**:
- AST 기반 정교한 파싱
- 타입 추론 개선
- 캐싱 최적화

## 테스트 실행 및 검증

### 로컬 테스트
```bash
# 컴파일
npm run compile

# 린트
npm run lint

# 테스트 실행
npm test

# 감시 모드
npm run watch
```

### VS Code에서 테스트
1. F5로 Extension Development Host 실행
2. 테스트 Django 프로젝트 열기
3. 기능 수동 테스트

## 품질 기준

### 코드 커버리지
- 최소 80% 이상
- 핵심 기능은 95% 이상

### 성능 기준
- 자동 완성 응답: < 100ms
- 프로젝트 스캔: < 5초 (중규모)
- 메모리 사용: < 100MB

### 코드 품질
- ESLint 규칙 준수
- TypeScript strict 모드
- 명확한 타입 정의

## CI/CD 파이프라인

### 자동화된 검증
1. Pull Request 시 자동 테스트
2. 코드 커버리지 리포트
3. 성능 벤치마크
4. 크로스 플랫폼 테스트

### 릴리스 프로세스
1. 버전 태그 생성
2. CHANGELOG 업데이트
3. 자동 빌드 및 패키징
4. VS Code Marketplace 배포

## 기여 가이드라인

### 코드 스타일
- Prettier 포맷팅 적용
- 의미 있는 변수명
- 충분한 주석

### 커밋 메시지
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, test, chore

### Pull Request
- 이슈 번호 참조
- 테스트 포함
- 문서 업데이트
- 리뷰어 지정

## 문제 해결

### 일반적인 이슈

1. **테스트 실패**
   - 의존성 확인: `npm ci`
   - 컴파일 확인: `npm run compile`
   - 로그 확인

2. **디버깅**
   - VS Code 디버거 사용
   - console.log 대신 VS Code Output Channel 사용
   - 브레이크포인트 활용

3. **성능 문제**
   - 프로파일링 도구 사용
   - 캐싱 전략 검토
   - 비동기 처리 최적화