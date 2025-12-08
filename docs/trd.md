# Copaung Code Command · TRD (기술 요구사항 / 설계서)

> Next.js + Supabase + Groq + Naver DataLab / 쿠팡 데이터 파이프라인

---

## 1. 전체 아키텍처 개요

- **프론트엔드**: Next.js 16 (App Router)
  - `/` – 랜딩 및 1회 무료 체험
  - `/login` – 이메일 매직링크 로그인
  - `/lab` – 로그인 후 사용하는 메인 대화형 소싱 챗봇
  - (향후) `/lab/tools/*` – 네이버/쿠팡 크롤링 테스트 페이지
- **백엔드(API)**: Next.js Route Handlers (`/api/*`)
  - `/api/chat` – Groq LLM 기반 챗봇 엔드포인트
  - (예정) `/api/datalab/*`, `/api/coupang/*` – 데이터 수집/분석용
- **데이터베이스**: Supabase (Postgres)
  - `auth.users` + `profiles` + `anonymous_sessions`
  - `sourcing_projects`, `chat_sessions`, `chat_messages`
  - 키워드/분석 관련 테이블 (`keyword_*`, `analysis_runs`, `analysis_run_keywords`, `market_keyword_stats` 등)
- **외부 API**
  - Groq(OpenAI 호환) – `openai/gpt-oss-120b` 등 LLM 모델
  - Naver DataLab Shopping Insight – 카테고리/키워드 트렌드 조회
  - 쿠팡 (공식/비공식 API 또는 스크래핑) – 상품 검색 결과·경쟁도 수집

---

## 2. 기술 스택 및 환경

- **언어/런타임**: TypeScript, Node.js (Next.js 16)
- **UI**: React + Tailwind CSS, 디자인 토큰은 `docs/design-tokens.md` 기준
- **인증**: Supabase Auth (이메일 매직링크)
- **LLM SDK**: `groq-sdk` (OpenAI 호환 인터페이스 사용)
- **빌드/배포**: Vercel (예정)

### 2.1 환경변수

서버 전용 키는 `NEXT_PUBLIC_` 접두어 없이 사용.

- `GROQ_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (로컬/서버용, 선택)
- `SUPABASE_ANON_KEY`
- `NAVER_API_CLIENT_ID`
- `NAVER_API_CLIENT_SECRET`
- (쿠팡 관련 키가 필요할 경우 별도 정의)

브라우저에서는 Supabase anon key만 사용하며,  
LLM·Naver·쿠팡 키는 모두 서버 측 Route Handler에서만 참조한다.

---

## 3. 인증 및 세션 흐름

### 3.1 로그인 플로우

1. `/login` 페이지에서 이메일 입력 → Supabase Auth `signInWithOtp` 사용.
2. 이메일 내 매직링크 클릭 시 Next.js 앱으로 리다이렉트.
3. 클라이언트에서 `supabase-browser` 클라이언트가 세션을 유지.
4. `/lab` 등 보호된 페이지에서는:
   - 클라이언트에서 `auth.getUser()`로 로그인 여부 확인.
   - 미로그인 시 로그인 안내 화면 + `/login?redirect=/lab` 링크 노출.

### 3.2 DB 매핑

- `auth.users` : Supabase 기본 유저.
- `profiles` : 앱 레벨 메타 정보 (역할/플랜/회사명 등).
- 세션/익명 식별:
  - `anonymous_sessions`에 세션 정보 저장 (프론트 쿠키로 유지, 추후 활용).

RLS는 `auth.uid() = user_id` / `id` 기준으로 제한.

---

## 4. 데이터 모델 매핑

### 4.1 챗봇 관련

- `sourcing_projects`
  - Lab 오른쪽 패널의 “기본 상품명/타깃/강조 포인트” 컨텍스트를 저장.
  - 초기에는 선택 사항으로, 필요 시 첫 메시지 전송 시 자동 생성.
- `chat_sessions`
  - `/lab` 내 하나의 대화방.
  - 프론트에서 UUID 기반 `session_id`를 만들어 서버에 전달하거나,
    첫 메시지 시 서버에서 생성 후 ID를 응답으로 돌려줘 프론트 state에 보관.
- `chat_messages`
  - 각 세션 내 user/assistant/system 메시지를 저장.
  - `meta`에 `analysis_run_id`, 추천 타입(키워드 발굴/제품명 추천) 등 기록.
- `chat_logs` (옵션)
  - `/api/chat` 한 번 호출 기준 요약 로그.
  - Latency, 사용 모델, 후보 개수 등 집계용.

### 4.2 키워드/분석 관련

- `keyword_master`
  - 네이버/쿠팡 기준 분석 대상 키워드 마스터.
- `keyword_timeseries`
  - 네이버(또는 기타 채널) 시계열 인덱스.
- `market_keyword_stats`
  - 쿠팡 등 마켓에서의 경쟁도 스냅샷.
- `keyword_scores`
  - 성장성·경쟁도·마진·필터를 종합한 스코어 및 랭킹.
- `analysis_runs`
  - 유저가 특정 조건(기간/범위/성별/연령/카테고리 등)으로 분석을 실행한 이력.
- `analysis_run_keywords`
  - 각 분석 실행에서 선택된 키워드와 해당 스코어/순위 연결.

DB 스키마 상세는 `docs/db-design.md`를 단일 소스 오브 트루스로 사용한다.

---

## 5. 주요 API 설계

### 5.1 `/api/chat` – LLM 챗봇

- **메서드**: `POST`
- **요청 바디 (현재 구현 + 확장 예정)**

```ts
type ChatRequest = {
  productName?: string;
  target?: string;
  focus?: string[]; // 강조 포인트
  messages?: { role: "user" | "assistant"; content: string }[];
  datalabParams?: {
    dateFrom?: string;
    dateTo?: string;
    devices?: string[];
    gender?: string;
    ageBuckets?: string[];
    categories?: string[]; // 추후 Naver category ID로 교체
  };
  analysisRunId?: number; // 향후: 실제 분석 결과를 연결
};
```

- **응답**

```ts
type ChatResponse = {
  reply: string;
};
```

- **동작**
  - Groq `openai/gpt-oss-120b` 모델 호출.
  - 시스템 프롬프트에:
    - 소싱 전문가 역할,
    - 인사/설명 처리 규칙,
    - 후속 요청 처리 규칙,
    - 응답 포맷(제품명 + 태그 + 트렌드/경쟁도 + 추천 이유) 명시.
  - `productName`, `focus`, `datalabParams`를 자연어로 정리한 system 메시지를 추가.
  - `messages` 히스토리를 그대로 전달.
  - 응답 문자열을 `chat_messages` 및 (옵션) `chat_logs`에 저장.

### 5.2 `/api/datalab/categories` (예정)

- **기능**: 네이버 DataLab Shopping Insight의 `/v1/datalab/shopping/categories` 래퍼.
- **입력 파라미터 (서버 내부)**:
  - `startDate`, `endDate`, `timeUnit`, `category[]`, `device`, `gender`, `ages[]`.
- **동작**
  - 서버에서 Naver OpenAPI를 호출 (Client ID/Secret 헤더 포함).
  - 응답의 `results[].data`를 기반으로:
    - 기간 내 평균/최근 값, 성장률 등 계산.
    - 필요한 경우 `keyword_timeseries` / `keyword_scores`에 적재.

### 5.3 `/api/datalab/category-keywords` (예정)

- **기능**: `/v1/datalab/shopping/category/keywords` 래퍼.
- 카테고리 내 다수 키워드의 시계열을 조회해,  
  Top N 유망 키워드를 계산하고 `analysis_runs`에 연결.

### 5.4 `/api/coupang/search` (예정)

- **기능**: 키워드별 쿠팡 검색 결과 요약.
- 구현 방식은 두 단계:
  1. 테스트 페이지에서 단일 키워드에 대해 검색 결과 HTML/API를 호출해 구조 파악.
  2. 안정된 구조가 확인되면 서버에서:
     - 상위 n개 상품의 가격/리뷰/평점/광고 여부 수집.
     - `market_keyword_stats` 및 `keyword_scores`에 적재.

---

## 6. 데이터 파이프라인 / 워크플로우

### 6.1 “키워드 발굴” 분석 실행 플로우

1. 유저가 Lab 오른쪽 패널에서 분석 조건 설정 → “조건을 대화에 추가” 클릭.
2. (선택) 별도 “분석 실행” 버튼 또는 챗봇 요청을 트리거로:
   - 서버에서 `analysis_runs` 행 생성 (`status = running`).
3. 서버 워커/잡(또는 즉시 실행)에서:
   - Naver DataLab API 호출 → trend 데이터 수집.
   - 후보 키워드 리스트와 시계열 계산 → `keyword_timeseries`, `keyword_scores` 갱신.
   - 쿠팡 검색 → `market_keyword_stats` 갱신.
   - 스코어 기반 Top N 선정 → `analysis_run_keywords`에 저장.
   - `analysis_runs.status`를 `success`로 변경, `top_keywords` 컬럼 채우기.
4. 챗봇이 해당 `analysis_run_id`를 전달받아:
   - 관련 테이블 조회 후, 키워드 목록 및 요약 지표를 system/user 컨텍스트에 포함.

### 6.2 “제품명 추천” 플로우

1. 유저가 챗 입력으로 제품명/컨셉/조건을 설명.
2. 서버는:
   - (선택) `sourcing_projects`/`chat_sessions`를 업데이트.
   - 최근 `analysis_runs` 한두 개를 조회해 현재 대화와 연관성 높은 키워드 목록을 가져옴.
   - 프로젝트/분석/키워드 정보를 요약해 LLM에 전달.
3. LLM 응답을 `chat_messages`와 `product_name_candidates`에 저장.

---

## 7. 프론트엔드 UI 구조

### 7.1 `/` – 랜딩 페이지

- 마케팅 카피 위주, 내부 구현(크롤링/모델/인프라)은 노출하지 않음.
- 상단 CTA:
  - “로그인 후 전체 기능 사용”
  - “1회 무료 체험 해보기” → 간단한 Form + `/api/chat` 호출.
- 디자인 토큰:
  - 배경: `from-amber-50 via-white to-sky-50`
  - 액션 컬러: Amber/Slate 조합 (design-tokens 참조).

### 7.2 `/lab` – 대화형 워크스페이스

- 레이아웃:
  - 왼쪽: 채팅 영역
  - 오른쪽: 컨텍스트/분석 조건 패널 + 사용 팁
- 채팅 입력창:
  - 다중 줄 텍스트 영역 + “보내기” 버튼.
  - 프롬프트 예시/힌트 제공.
- 오른쪽 패널:
  - 기간/디바이스/성별/연령/카테고리/필터
  - 강조 포인트 태그 관리 (사용자 추가/삭제, 클릭으로 선택)
  - “조건을 대화에 추가” 버튼 → 입력창에 자연어 설명 삽입.

### 7.3 `/lab/tools/*` – 테스트/관리용

- 예: `/lab/tools/datalab`:
  - 오른쪽 패널과 유사한 Form.
  - “네이버 카테고리 트렌드 조회”, “카테고리 내 키워드 조회” 버튼.
  - Raw JSON + 우리가 계산한 Top 10 리스트를 화면에 표시 (운영자용).

---

## 8. 보안 / 운영 고려사항

- **API 키 관리**
  - Groq, Naver, 쿠팡 키는 server-side env로만 관리.
  - 클라이언트에는 절대 노출하지 않으며, 모든 외부 호출은 Next.js Route Handler에서 수행.
- **속도 제한**
  - Naver DataLab: 하루 1,000 call 제한 → 캐싱/배치 수집 필수.
  - 쿠팡 크롤링: 사이트 정책을 준수하고, 요청 속도/횟수를 제한.
- **로그/모니터링**
  - `chat_logs`에 latency, 사용 모델, 에러 여부 저장.
  - 에러 시 `/api/chat`은 generic 메시지 + dev 환경에만 상세 메시지 노출.

---

## 9. 단계별 구현 로드맵 (기술 관점)

1. **1단계**
   - 현재 구조 정리 (`/api/chat`, `/lab`, `/login`, Supabase Auth).
   - `chat_sessions`/`chat_messages`와 LLM 호출 연결.
2. **2단계**
   - `/lab/tools/datalab` + `/api/datalab/*` 구현.
   - Naver DataLab의 카테고리/키워드 트렌드 수집 및 `keyword_*`, `analysis_runs` 적재.
3. **3단계**
   - 쿠팡 검색 테스트 페이지 + `/api/coupang/search` 구현.
   - `market_keyword_stats`, `keyword_scores` 스코어링.
4. **4단계**
   - `/api/chat`에서 `analysis_run_id`를 받아 실제 데이터 기반 답변 제공.
   - 추천 성능/응답 품질 측정 및 프롬프트/모델 튜닝.

