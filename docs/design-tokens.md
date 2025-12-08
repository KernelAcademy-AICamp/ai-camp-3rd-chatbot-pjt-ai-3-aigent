# 키워드 소싱 레이더 · 디자인 토큰 가이드

랜딩 페이지(밝은 아이보리 + 웜 톤)를 기준으로 전체 서비스에서 공통으로 사용할 디자인 에셋을 정의합니다.  
이후 만드는 화면(`lab`, 관리자, 대시보드 등)은 이 토큰을 우선적으로 사용합니다.

---

## 1. 색상 시스템

### 1.1 기본 팔레트 (Light Theme)

- `bg.base`  
  - 값: `#f7f4ec` (아이보리 톤)  
  - 용도: 전체 페이지 배경 (`<body>`), 큰 섹션 배경.

- `bg.surface`  
  - 값: `#ffffff`  
  - 용도: 카드, 모달, 폼, 챗버블(assistant) 등 기본 표면.

- `bg.surface-soft`  
  - 값: `rgba(255, 255, 255, 0.85)`  
  - 용도: 글래스모피즘 느낌의 패널, 랜딩의 화이트 카드.

- `bg.accent-warm`  
  - 값: `#fef1e0`  
  - 용도: 강조 섹션의 연한 배경, 배지/태그의 배경.

- `bg.accent-sky`  
  - 값: `#eef7ff`  
  - 용도: 오른쪽 상단 그라디언트, 보조 정보 카드.

- `text.primary`  
  - 값: `#0f172a` (Tailwind `slate-900` 근처)  
  - 용도: 주요 텍스트, 헤드라인.

- `text.secondary`  
  - 값: `#475569` (slate-600)  
  - 용도: 본문, 설명 텍스트.

- `text.muted`  
  - 값: `#94a3b8` (slate-400)  
  - 용도: 서브 라벨, 도움말.

- `brand.primary`  
  - 값: `#f59e0b` (amber-500)  
  - 용도: 주요 CTA 버튼, 하이라이트, 아이콘 포인트.

- `brand.primary-dark`  
  - 값: `#d97706` (amber-600)  
  - 용도: hover 상태, Active 상태.

- `brand.primary-soft`  
  - 값: `#fef3c7` (amber-100)  
  - 용도: 태그 배경, 뱃지 배경.

- `brand.ink`  
  - 값: `#020617` (slate-950)  
  - 용도: 랜딩의 다크 네이비 텍스트, 버튼 배경.

- `border.soft`  
  - 값: `#e2e8f0` (slate-200)  
  - 용도: 카드 경계, 입력 필드.

- `border.strong`  
  - 값: `#cbd5f5` (slate-300)  
  - 용도: 모듈 구분선, 탭 경계.

### 1.2 그라디언트

- `bg.hero`  
  - 구성:
    - `radial-gradient(circle at 20% 20%, #eef7ff 0, rgba(238,247,255,0) 25%)`
    - `radial-gradient(circle at 80% 0%, #fef1e0 0, rgba(254,241,224,0) 26%)`
    - + `bg.base`
  - 용도: 랜딩 전체 배경, 주요 섹션.

- `bg.badge-amber`  
  - 구성: `linear-gradient(90deg, #fed7aa, #fef3c7)`  
  - 용도: “미래 유망 키워드” 같은 pill.

---

## 2. 타이포그래피

- 기본 폰트
  - `font.family.sans`: Space Grotesk → Geist Sans → system (`Inter`, `-apple-system`, `Segoe UI`)
  - `font.family.mono`: Geist Mono

- 제목 (Headline)
  - `h1`: 32–40px, `font-semibold`, `tracking-tight`, 색상: `text.primary`
  - `h2`: 24–30px, `font-semibold`, 색상: `text.primary`

- 본문
  - `body`: 14–16px, `font-normal`, 색상: `text.secondary`

- 캡션/라벨
  - 11–12px, `font-semibold`, `uppercase`, `letter-spacing: 0.2em`, 색상: `text.muted`
  - 랜딩의 “미래 키워드 + 틈새 제품명 자동 추천” 라벨 스타일 재사용.

---

## 3. 컴포넌트 토큰

### 3.1 버튼

- `button.primary`
  - 배경: `brand.ink`
  - 텍스트: `#ffffff`
  - 라운드: `9999px` (pill)
  - Hover: 배경 `#111827`, 그림자 `0 10px 25px rgba(251, 191, 36, 0.4)`

- `button.secondary`
  - 배경: `#ffffff`
  - 테두리: `border.soft`
  - 텍스트: `text.primary`
  - Hover: 테두리 `brand.primary-soft`, 텍스트 `brand.primary-dark`

- `button.ghost-chip`
  - 배경: `transparent`
  - 테두리: `border.soft`
  - 텍스트: `text.secondary`
  - Selected 상태:
    - 배경: `brand.ink`
    - 텍스트: `#ffffff`

### 3.2 카드 / 패널

- `card.surface`
  - 배경: `bg.surface`
  - 테두리: `border.soft`
  - 그림자: `0 16px 40px rgba(15, 23, 42, 0.06)`
  - 라운드: `1.5rem` (`rounded-2xl`)

- `card.glass`
  - 배경: `bg.surface-soft`
  - 테두리: `border.soft`
  - blur: `backdrop-blur-[18px]` (현재 `.glass-panel`)

### 3.3 배지 / Pill

- `badge.brand`
  - 배경: `bg.surface`
  - 테두리: `1px solid` `#fed7aa` ~ `brand.primary-soft`
  - 텍스트: `brand.primary-dark`

- `badge.neutral`
  - 배경: `#ffffff`
  - 테두리: `border.soft`
  - 텍스트: `text.secondary`

---

## 4. Chat UI 톤 (Lab 페이지)

Lab 화면도 랜딩과 완전히 다른 다크 팔레트 대신, **웜 톤을 유지하는 라이트 모드 or 네이비 + 앰버 조합**으로 맞춥니다.

권장:

- 배경: `bg.base` 또는 `#0f172a`(deep navy) + 카드/버블에 `bg.surface`/`brand.primary-soft` 사용.
- 사용자 말풍선:
  - 배경: `brand.primary`
  - 텍스트: `#111827`
- 어시스턴트 말풍선:
  - 배경: `#ffffff`
  - 테두리: `border.soft`
  - 텍스트: `text.primary`
- 입력 영역:
  - 배경: `bg.surface`
  - 테두리: `border.soft`
  - placeholder: `text.muted`

---

## 5. 사용 규칙

1. **새 페이지/컴포넌트 색상 선택 시**, 위 토큰 이름을 먼저 떠올리고, 가능한 한 기존 값에서 고르기.
2. **암색 배경이 필요**하다면, 완전 블랙 대신 `brand.ink` 또는 `#020617 ~ #020617` 계열 + 앰버 포인트 조합 사용.
3. **버튼/링크**는 항상 `button.primary` / `button.secondary` / `button.ghost-chip` 패턴 중 하나로 맞추기.
4. **라벨/섹션 제목**은 11–12px uppercase + `tracking-[0.2em]` + `text.muted` 스타일로 통일.

향후 Tailwind 커스텀 테마(`tailwind.config` 또는 `@theme inline`)를 도입할 경우, 이 MD의 토큰 이름을 기준으로 변수명을 정리합니다.

