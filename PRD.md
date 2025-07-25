## **제품 요구사항 명세서 (PRD): Django Power Tools for VS Code**


| **문서 버전** | **작성일**       | **작성자**                                                              | **상태** |
| :------------ | :--------------- | :---------------------------------------------------------------------- | :------- |
| 1.0           | 2023-10-27       | AI Assistant (based on user request)                                    | 초안     |

---

### **1. 개요 (Overview)**

**Django Power Tools**는 Microsoft VS Code를 위한 확장 기능으로, Python/Django 개발자의 개발 경험을 혁신적으로 개선하는 것을 목표로 합니다. 이 확장은 Django 프레임워크의 동적이고 관례에 기반한 특성을 깊이 이해하여, PyCharm과 같은 상용 IDE 수준의 강력한 IntelliSense와 생산성 높은 워크플로우 자동화 기능을 제공합니다.

> **한 줄 요약:** VS Code를 Django 개발을 위한 최고의 무료 IDE로 만드는 올인원(All-in-One) 솔루션.

### **2. 문제점 (Problem Statement)**

VS Code는 훌륭한 범용 코드 에디터이지만, Python 확장의 정적 분석 기능만으로는 Django 프레임워크의 복잡성을 완전히 해석하지 못합니다. 이로 인해 개발자들은 다음과 같은 고질적이고 반복적인 문제에 직면합니다.

*   **부정확한 코드 분석:** 프로젝트 구조를 제대로 인식하지 못해 발생하는 `unresolved import` 오류는 개발자의 신뢰도를 떨어뜨리고, 실제로는 문제가 없는 코드에 대해 불필요한 디버깅 시간을 소모하게 만듭니다.
*   **빈약한 자동 완성:** Django ORM의 동적으로 생성되는 모델 매니저(`objects`)와 폼 필드 등에 대한 자동 완성이 지원되지 않아, 개발자는 메서드와 속성 이름을 직접 기억하거나 문서를 참조해야 하는 불편함을 겪습니다. 이는 오타를 유발하고 개발 속도를 저하시킵니다.
*   **비효율적인 워크플로우:** `runserver`, `migrate` 등 필수적인 `manage.py` 명령어를 실행하기 위해 터미널을 열고 여러 단계를 거쳐야 합니다. 또한, URL 정의, View 로직, Template 파일은 강하게 연결되어 있음에도 불구하고 이들 사이를 한 번에 이동할 수 없어 코드 탐색에 많은 시간이 소요됩니다.

이러한 문제들은 특히 Django를 처음 배우는 초보자에게는 높은 학습 장벽으로 작용하고, 숙련된 개발자에게는 불필요한 '마찰(friction)'을 일으켜 작업 흐름을 방해하고 생산성을 저해하는 주된 원인이 됩니다.

### **3. 대상 사용자 (Target Audience / User Personas)**

이 확장은 모든 Django 개발자를 대상으로 하지만, 특히 다음 두 그룹에게 가장 큰 가치를 제공할 것입니다.

*   **페르소나 1: Django 입문자 '준'**
    *   **소개:** 백엔드 개발에 막 입문한 대학생 또는 주니어 개발자. 온라인 강의를 보며 개인 프로젝트를 진행 중이다.
    *   **목표:** Django의 기본 개념을 빠르게 익히고 웹 사이트를 성공적으로 배포하는 것.
    *   **불편함:**
        *   "분명히 강의랑 똑같이 따라 했는데 `unresolved import` 오류가 계속 떠서 너무 헷갈려요."
        *   "`Post.objects` 뒤에 뭘 써야 할지 몰라서 매번 구글링해요."
        *   "가상환경 설정이랑 `settings.json`을 어떻게 해야 할지 몰라 프로젝트 시작부터 막혀요."
    *   **솔루션 가치:** '준'에게 Django Power Tools는 복잡한 초기 설정을 자동화하고, 코드 작성 시 명확한 가이드를 제공하여 Django 학습 곡선을 완만하게 만들어주는 친절한 멘토 역할을 합니다.

*   **페르소나 2: 숙련된 Django 개발자 '세리'**
    *   **소개:** 3년차 백엔드 개발자로, 회사에서 여러 Django 프로젝트를 유지보수하고 신규 기능을 개발한다.
    *   **목표:** 주어진 시간 안에 버그를 수정하고 새로운 기능을 빠르고 정확하게 구현하는 것.
    *   **불편함:**
        *   "매일 수십 번씩 터미널 열어서 `runserver` 켜고, `makemigrations` 하는 게 귀찮아요."
        *   "URL 이름에 오타를 내서 배포 후에야 에러를 발견한 적이 있어요. 에디터에서 미리 알려주면 좋겠어요."
        *   "이 URL이 어떤 뷰와 템플릿에 연결되는지 보려면 파일들을 일일이 찾아다녀야 해서 흐름이 끊겨요."
    *   **솔루션 가치:** '세리'에게 Django Power Tools는 반복적인 작업을 자동화하고 코드 탐색 시간을 극적으로 단축시켜, 오롯이 비즈니스 로직 구현에만 집중할 수 있게 해주는 강력한 생산성 부스터입니다.

### **4. 목표 및 비전 (Goals & Vision)**

*   **비전 (The Vision):**
    > **VS Code를 Django 개발을 위한 제1의 선택지로 만든다.** 개발자들이 더 이상 강력한 Django 지원 기능을 위해 값비싼 상용 IDE를 구매할 필요가 없도록, 최고 수준의 개발 경험을 무료로 제공한다.

*   **목표 (The Goals):**
    *   **사용자 경험:** Django 프로젝트의 초기 설정 및 `import` 오류 해결에 소요되는 시간을 **90% 이상 단축**한다.
    *   **생산성:** Django ORM, 템플릿 태그 등 핵심 요소의 코드 작성 시간을 자동 완성 기능으로 **50% 이상 단축**한다.
    *   **워크플로우:** `manage.py` 명령어 실행 및 파일 간 이동 단계를 기존 대비 **70% 이상 감소**시킨다.
    *   **시장 점유:** 출시 1년 내 VS Code Marketplace에서 **다운로드 10만 회, 활성 사용자 2만 명**을 달성한다.

---

### **5. 기능 명세 (Feature Specifications)**

기능은 초기 버전(MVP)과 향후 버전(V2)으로 나누어 우선순위를 부여합니다.

#### **5.1. MVP (Minimum Viable Product): 핵심 경험 안정화**

> MVP의 목표는 가장 고통스러운 문제(Pain Point)들을 해결하여 즉각적인 가치를 제공하고, 사용자의 신뢰를 얻는 것입니다.

*   **Feature 1: 스마트 프로젝트 경로 설정 (Smart Path Configuration)**
    *   **설명:** `unresolved import` 문제를 근본적으로 해결합니다.
    *   **사용자 스토리:** "개발자로서, 나는 별도의 설정 없이도 확장 기능이 내 Django 프로젝트 구조를 자동으로 인식하여 모듈 임포트가 정확하게 동작하기를 원한다."
    *   **요구사항:**
        *   VS Code 작업 영역(workspace)이 열릴 때, `manage.py` 파일의 위치를 자동으로 스캔하여 프로젝트의 루트 디렉토리를 식별한다.
        *   식별된 루트 디렉토리를 `.vscode/settings.json` 파일의 `python.analysis.extraPaths` 배열에 자동으로 추가하거나, 사용자에게 추가할 것인지 묻는 알림을 표시한다.
        *   설정이 완료되면 `unresolved import` 경고가 즉시 사라져야 한다.

*   **Feature 2: 핵심 ORM 및 모델 자동 완성 (Core ORM & Model Autocomplete)**
    *   **설명:** Django 개발의 핵심인 모델과 상호작용하는 경험을 개선합니다.
    *   **사용자 스토리:** "개발자로서, 나는 모델 클래스에서 `objects`를 사용할 때 `filter`, `get` 등 사용 가능한 메서드 목록을 보고 싶고, 모델 인스턴스에서 내부에 정의된 필드(`title`, `author` 등)를 자동 완성으로 입력하고 싶다."
    *   **요구사항:**
        *   프로젝트 내 모든 앱의 `models.py` 파일을 분석하여 모델 클래스와 필드 정보를 인덱싱한다.
        *   `Model.objects.` 입력 시, Django의 기본 Manager 메서드(`all`, `filter`, `get`, `create`, `count` 등) 목록을 자동 완성으로 제공한다.
        *   모델의 인스턴스 변수 뒤에 `.`을 입력 시, 해당 모델에 정의된 필드(`CharField`, `ForeignKey` 등) 목록을 자동 완성으로 제공한다.
        *   (MVP 범위) 커스텀 Manager나 동적으로 추가되는 메서드는 지원하지 않아도 된다.

*   **Feature 3: `manage.py` 커맨드 팔레트 (Manage.py Command Palette)**
    *   **설명:** 가장 빈번하게 사용되는 터미널 명령어를 에디터 내에서 빠르게 실행합니다.
    *   **사용자 스토리:** "개발자로서, 나는 터미널을 열고 가상환경을 활성화하는 번거로운 과정 없이, `Ctrl+Shift+P` 단축키만으로 `runserver`를 실행하거나 `makemigrations`를 수행하고 싶다."
    *   **요구사항:**
        *   VS Code Command Palette에 다음 명령어를 추가한다:
            *   `Django: Start/Stop Development Server` (`runserver`)
            *   `Django: Create Migrations` (`makemigrations`)
            *   `Django: Apply Migrations` (`migrate`)
        *   명령어 실행 시, 현재 설정된 Python 인터프리터를 사용하여 자동으로 `python manage.py <command>`를 내부 터미널에서 실행한다.
        *   `runserver`를 위한 전용 터미널 창을 생성하고, 서버 로그를 표시한다.

*   **Feature 4: 기본 URL 태그 자동 완성 (Basic URL Tag Autocomplete)**
    *   **설명:** 템플릿에서의 잦은 오타와 실수를 방지합니다.
    *   **사용자 스토리:** "개발자로서, 나는 HTML 템플릿에서 `{% url '...' %}`을 작성할 때, 따옴표 안에 사용 가능한 URL 이름 목록을 보고 선택하여 실수를 줄이고 싶다."
    *   **요구사항:**
        *   프로젝트의 루트 `urls.py` 및 각 앱의 `urls.py` 파일을 분석하여 `path(..., name="<url-name>")` 패턴의 모든 `name` 값을 추출한다.
        *   `.html` 또는 `.jinja` 파일에서 `{% url '`을 입력하는 시점에, 추출된 URL 이름 목록을 자동 완성으로 제공한다.
        *   존재하지 않는 URL 이름을 사용하면 경고(linter warning)를 표시한다.

#### **5.2. V2 / 향후 기능 (Future Releases): 경험의 심화**

> MVP가 성공적으로 안착한 후, Django Power Tools를 "있으면 좋은" 도구에서 "없으면 안 되는" 필수 도구로 격상시키는 기능들입니다.

*   **Feature 5: 파일 간 하이퍼링크 (Cross-file Hyperlinking)**
    *   **설명:** 코드 베이스 탐색 속도를 비약적으로 향상시킵니다.
    *   **요구사항:** `Ctrl+Click` (Go to Definition) 기능을 확장하여 다음을 지원한다.
        *   템플릿의 `{% url 'post-detail' %}` -> `urls.py`의 `path(..., name='post-detail')` 정의
        *   `urls.py`의 `views.MyView.as_view()` -> `views.py`의 `class MyView(...)` 정의
        *   `views.py`의 `template_name = "app/post.html"` -> `app/templates/app/post.html` 파일

*   **Feature 6: 컨텍스트-인식 템플릿 자동 완성 (Context-Aware Template Autocomplete)**
    *   **설명:** View와 Template 사이의 단절된 경험을 연결합니다.
    *   **요구사항:**
        *   `views.py`에서 `render(..., context={...})` 함수의 `context` 딕셔너리를 분석한다.
        *   연결된 템플릿 파일에서, context로 전달된 변수(`posts`, `form` 등)와 해당 변수의 속성/메서드(`post.title`, `form.as_p`)를 자동 완성으로 제공한다.

*   **Feature 7: 정적 파일 경로 자동 완성 (Static File Path Autocomplete)**
    *   **설명:** `{% static %}` 태그 사용을 편리하게 만듭니다.
    *   **요구사항:** `settings.py`의 `STATICFILES_DIRS`와 각 앱의 `static` 폴더를 스캔하여, `{% static '...' %}` 내부에서 파일 및 디렉토리 경로 자동 완성을 제공한다.

*   **Feature 8: 고급 코드 생성기 (Advanced Scaffolding)**
    *   **설명:** 새 앱 생성 시의 반복 작업을 줄여줍니다.
    *   **요구사항:** `Django: Create App (Advanced)` 명령어를 제공하여, 기본 구조 외에 `urls.py`, `forms.py`, `templates/app_name` 디렉토리 등 일반적인 파일과 폴더를 함께 생성하는 옵션을 제공한다.

### **6. 성공 지표 및 제약 조건 (Metrics & Constraints)**

#### **6.1. 성공 지표 (Success Metrics)**

*   **활성화 및 유지 (Activation & Retention):**
    *   [MVP] 월간 활성 사용자(MAU) 5,000명 달성 (출시 3개월 내)
    *   [V2] MAU 20,000명 및 사용자 유지율 30% 이상 달성 (출시 1년 내)
*   **사용자 만족도 (User Satisfaction):**
    *   VS Code Marketplace 평점 4.5 이상 유지
    *   GitHub 이슈에서 기능 요청 대비 버그 리포트 비율 2:8 이하 유지
*   **채택 (Adoption):**
    *   [MVP] 다운로드 2만 회 달성 (출시 3개월 내)
    *   [V2] 다운로드 10만 회 달성 (출시 1년 내)

#### **6.2. 가정 및 의존성 (Assumptions & Dependencies)**

*   **가정:** 사용자는 PC에 Python 3.8 이상 및 Django 3.2 이상 버전을 설치하고 사용할 수 있는 환경이다.
*   **의존성:** 이 확장은 Microsoft의 공식 **Python 확장 (ms-python.python)**이 설치되어 있는 것을 전제로 한다. Pylance 언어 서버의 기능을 확장/보완하는 방식으로 동작하므로, Pylance의 업데이트에 따라 기능 호환성 문제가 발생할 수 있다.

#### **6.3. 범위 외 (Out of Scope)**

*   **프레임워크:** Flask, FastAPI 등 Django 외 다른 Python 웹 프레임워크 지원.
*   **디버깅:** Django 템플릿의 중단점(breakpoint) 설정 등 고급 디버깅 기능.
*   **데이터베이스:** GUI 기반의 데이터베이스 탐색기 또는 쿼리 실행 기능.
*   **배포:** 클라우드 서비스(AWS, Heroku 등)로의 원클릭 배포 기능.

