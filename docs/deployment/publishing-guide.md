# VS Code Marketplace 배포 가이드

## 사전 준비

### 1. Publisher 계정 생성

1. [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) 방문
2. Microsoft 계정으로 로그인
3. Publisher 생성:
   - Publisher name: `pyhub-kr`
   - Display name: `PyHub Korea`

### 2. Personal Access Token (PAT) 생성

1. [Azure DevOps](https://dev.azure.com) 접속
2. User Settings → Personal Access Tokens
3. New Token 생성:
   - Name: `vscode-django-power-tools`
   - Organization: All accessible organizations
   - Scopes: Marketplace → Manage
   - Expiration: 1년

### 3. PAT를 GitHub Secrets에 추가

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. New repository secret:
   - Name: `VSCE_PAT`
   - Value: Azure DevOps에서 생성한 PAT

## 배포 프로세스

### 자동 배포 (권장)

1. **버전 업데이트**
   ```bash
   # package.json의 version 업데이트
   npm version patch  # 또는 minor, major
   ```

2. **변경사항 커밋**
   ```bash
   git add .
   git commit -m "chore: bump version to 0.1.0"
   git push origin main
   ```

3. **GitHub Release 생성**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. GitHub에서 Release 생성:
   - Releases → Create a new release
   - Tag: v0.1.0
   - Release title: v0.1.0 - Initial Release
   - Release notes 작성

5. 자동으로 GitHub Actions가 실행되어 배포됨

### 수동 배포

1. **vsce 설치**
   ```bash
   npm install -g @vscode/vsce
   ```

2. **확장 패키징**
   ```bash
   vsce package
   ```

3. **확장 배포**
   ```bash
   vsce publish
   # 또는 PAT 직접 사용
   vsce publish -p <your-pat-token>
   ```

## 배포 전 체크리스트

- [ ] 모든 테스트 통과 확인
- [ ] package.json 버전 업데이트
- [ ] CHANGELOG.md 업데이트
- [ ] README.md 확인
- [ ] 아이콘 파일 존재 확인 (images/icon.png)
- [ ] .vscodeignore 파일 확인
- [ ] LICENSE 파일 확인
- [ ] 민감한 정보 제거 확인

## 배포 후 확인

1. [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=pyhub-kr.django-power-tools) 확인
2. VS Code에서 확장 검색 및 설치 테스트
3. 기능 동작 확인

## 버전 관리

### Semantic Versioning

- **Major (x.0.0)**: Breaking changes
- **Minor (0.x.0)**: New features (backward compatible)
- **Patch (0.0.x)**: Bug fixes

### 예시
- 0.1.0: Initial release
- 0.1.1: Bug fixes
- 0.2.0: New feature added
- 1.0.0: Stable release

## 문제 해결

### "Publisher not found" 오류
- Publisher가 제대로 생성되었는지 확인
- package.json의 publisher 필드 확인

### "Invalid Personal Access Token" 오류
- PAT 만료 여부 확인
- PAT 권한 확인 (Marketplace → Manage)
- 새 PAT 생성 후 재시도

### "Missing required files" 오류
- README.md, LICENSE, CHANGELOG.md 파일 존재 확인
- package.json 필수 필드 확인

## 추가 리소스

- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)