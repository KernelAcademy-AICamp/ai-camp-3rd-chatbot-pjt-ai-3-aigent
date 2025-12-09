# 코드 구조 & 주요 기능 안내

키워드 소싱 레이더 프로젝트의 주요 기능과, 각 기능이 구현된 파일 위치를 정리한 문서입니다.  
협업 시 “어느 파일을 보면 되는지”를 빠르게 파악하는 것을 목표로 합니다.

## 1. 전체 개요

- 프레임워크: Next.js App Router
- 배포: Vercel
- 인증/DB: Supabase
- LLM: Groq API (`openai/gpt-oss-120b` 등)
- 주요 축:
  - 랜딩 페이지 (마케팅)
  - Lab 채팅 워크스페이스 (실제 소싱 전문가 챗봇)
  - DataLab 테스트 도구들 (내부 검증용)

---

## 2. 페이지 구조 (UI 레이어)

### 2.1 랜딩 페이지

- 파일: `src/app/page.tsx`
- 역할:
  - 제품 소개용 랜딩.
  - 내부 구현(크롤링, Groq, Supabase 등)은 노출하지 않고, “소싱 전문가 챗봇” 관점의 메시지만 보여줌.

### 2.2 Lab · 소싱 챗봇 워크스페이스

- 파일: `src/app/lab/page.tsx`
- 역할:
  - 로그인 후 사용하는 메인 워크스페이스.
  - 왼쪽: ChatGPT 스타일 대화 화면.
  - 오른쪽:
    - `카테고리`: 네이버 쇼핑인사이트 1분류 카테고리 선택.
    - `분석 키워드`:
      - 유저가 직접 추가한 분석 키워드.
      - “네이버 Top 키워드 상위 10개 불러오기”로 불러온 키워드를 클릭해 추가.
    - `분석 조건`: 기간 / 범위(전체·모바일·PC) / 성별 / 연령대.
    - “조건을 대화에 추가” 버튼으로 현재 조건을 “키워드 분석 조건: …” 스니펫 형태로 채팅 입력에 삽입.
- 서버와의 연결:
  - `/api/chat` 로 POST 요청.
  - `datalabParams` 로 오른쪽 조건(기간, 범위, 성별, 연령, 카테고리)을 함께 전송.

### 2.3 DataLab 테스트 도구 (내부용)

1) **키워드 트렌드 테스트 페이지**
   - 파일: `src/app/lab/tools/keywords/page.tsx`
   - 기능:
     - 카테고리 ID, 기간, 디바이스, 성별, 연령 조건 설정.
     - 분석 대상 키워드 수동 입력 또는 `/api/datalab/top-keywords`로 상위 10개 자동 채우기.
     - `/api/datalab/keyword-trends` 호출로 시계열·통계·그래프·AI 인사이트 확인.
     - 쿠팡 / 1688 / 타오바오 검색 링크 바로가기 제공.

2) **(있다면) 기타 DataLab 도구**
   - `src/app/lab/tools/datalab/page.tsx` 등: 세부 실험/시각화용.

### 2.4 인증 관련 페이지

- 로그인: `src/app/login/page.tsx`
- 비밀번호 설정/변경: `src/app/set-password/page.tsx`
- 공통 레이아웃: `src/app/layout.tsx`

---

## 3. API 라우트 (백엔드 레이어)

### 3.1 챗봇 메인 API

- 파일: `src/app/api/chat/route.ts`
- 엔드포인트: `POST /api/chat`
- 입력(JSON 예시):
  ```json
  {
    "focus": ["노스페이스패딩", "경량패딩"],
    "messages": [{ "role": "user", "content": "이번 겨울 트렌드 알려줘" }],
    "datalabParams": {
      "dateFrom": "2025-09-08",
      "dateTo": "2025-12-08",
      "devices": ["전체", "PC"],
      "gender": "전체",
      "ageBuckets": ["전체"],
      "categories": ["생활/건강"]
    }
  }
  ```
- 주요 처리 흐름:
  1. **질문 타입 분류**
     - 함수: `classifyQuestionType` (trend/strategy/naming/other)
     - LLM에게 JSON 형식으로 분류 요청.
  2. **DataLab 실행 여부 판단**
     - 함수: `inferDatalabParams`  
       - “키워드 분석 조건:” 스니펫, 연도 표현, 트렌드 관련 키워드 등을 보고 DataLab 후보인지 판단.
     - 함수: `decideDatalabByLLM`  
       - 애매한 경우에만 LLM에게 “실제 DataLab 트랜잭션을 돌릴지 여부”를 물어봄.
  3. **DataLab 트랜잭션 실행 (필요할 때만)**
     - 함수: `runKeywordAnalysisTransaction` (자세한 설명은 아래 4.1)
     - 성공 시:
       - `datalabSummary` 문자열 생성 (기간, 카테고리, Top 키워드, 성장/계절성 요약).
       - 성장률 기준으로 “모멘텀 있는 키워드 / 보합 / 감소” 그룹을 미리 정리해 포함.
       - `datalabDebug` 에 `analysisRunId`, 키워드 등 디버그 정보 포함.
     - 실패 시:
       - “데이터 기반 키워드 분석 실패” 메시지를 만들고, LLM에게 “기간/카테고리 다시 조정해 달라”고 유도.
  4. **LLM 호출 (Groq)**
     - System 프롬프트:
       - 소싱 전문가 역할, 질문 유형별 답변 스타일.
       - DataLab 요약을 추가 데이터로 첨부.
       - “상승/보합 키워드 위주로 추천하고, 감소 키워드는 참고용으로만 언급” 등의 원칙 포함.
     - 마지막 user 메시지 + 전체 history 와 함께 Groq에 전달.
  5. **로그 저장 (Supabase)**
     - `chat_logs`: 요약 로그 (`reply`, `focus`, `analysis_run_id` 등).
     - `chat_messages`: `user`/`assistant` 메시지와 `meta.question_type`, `meta.analysis_run_id` 저장.

### 3.2 네이버 DataLab 연동 API

1) **Top 키워드 크롤링**
   - 파일: `src/app/api/datalab/top-keywords/route.ts`
   - 엔드포인트: `GET /api/datalab/top-keywords`
   - 내부:
     - `fetchTopKeywords` (`src/lib/naver-top-keywords.ts`)
     - `normalizeNaverKeyword` 로 대표 키워드 정제.
     - 개발 환경에서 raw/normalized 키워드 로그 출력.

2) **키워드 트렌드 & 인사이트**
   - 파일: `src/app/api/datalab/keyword-trends/route.ts`
   - 엔드포인트: `POST /api/datalab/keyword-trends`
   - 역할:
     - Naver DataLab 카테고리/키워드 API (`callShoppingCategoryKeywords`, `src/lib/naver.ts`) 호출.
     - 시계열 데이터를 바탕으로:
       - 전체 평균, 최근/이전 평균, 성장률, 피크 시즌(월 단위) 계산.
     - Groq LLM에 지표 요약을 넘겨, 키워드별 소싱 인사이트 텍스트 생성.
     - 테스트 페이지에서 섹션 2·4를 구성하는 데이터 소스.

3) **카테고리 메타 (있다면)**
   - 파일: `src/app/api/datalab/categories/route.ts`
   - 역할: Naver 카테고리 트리/메타 데이터를 프론트에 제공 (현재는 직접 상수로 관리 중).

### 3.3 쿠팡 관련 API

- 파일: `src/app/api/coupang/price-stats/route.ts`
- 현재 상태:
  - 직접 HTML 크롤링 시 403(Access Denied) 이슈가 있어, **실시간 가격 집계는 비활성화**.
  - DataLab 테스트 페이지에서는 대신 쿠팡/1688/타오바오 검색 링크를 제공하는 쪽으로 설계.
  - 향후 별도 배치/공식 API 환경에서 `market_keyword_stats` 테이블과 연동 예정.

---

## 4. lib 계층 (공용 로직)

### 4.1 `runKeywordAnalysisTransaction` (네이버 DataLab 핵심 트랜잭션)

- 파일: `src/lib/datalab-run.ts`
- 타입:
  - `DatalabParams`: `dateFrom`, `dateTo`, `devices`, `gender`, `ageBuckets`, `categories[]`
  - `KeywordAnalysisResult`: `analysisRunId`, `categoryId`, `keywords[]`, `metrics`, `series`
- 내부 흐름:
  1. 카테고리 라벨 → Naver CID 매핑 (`CATEGORY_TO_CID`)
  2. `/shoppingInsight/getCategoryKeywordRank.naver` 크롤링 (`fetchTopKeywords`)
  3. Top 10 키워드 정제 (`normalizeNaverKeyword`) 후 중복 제거.
     - 정제 결과가 모두 비면 raw 키워드로 한 번 더 시도.
  4. `/v1/datalab/shopping/category/keywords` OpenAPI 호출로 시계열 데이터 수집.
  5. 통계 계산 (`buildKeywordStats`):
     - 전체 평균, 최근/이전 평균, 성장비율(`growthRatio`), 피크 월(`peakMonths`).
  6. `analysis_runs` 테이블에 트랜잭션 요약 기록 (Supabase).
  7. 위 결과를 `/api/chat` 에 반환.

### 4.2 네이버 크롤링 유틸

- 파일: `src/lib/naver-top-keywords.ts`
  - `fetchTopKeywords`: Top 500 랭킹 페이지 POST 호출.
  - `normalizeNaverKeyword`: 긴 문자열/브랜드코드에서 대표 키워드만 추출.
- 파일: `src/lib/naver.ts`
  - `callShoppingCategoryKeywords`: DataLab 카테고리/키워드 API 호출 래퍼.

### 4.3 쿠팡 유틸

- 파일: `src/lib/coupang.ts`, `src/lib/coupang-guard.ts`
  - 쿠팡 검색 URL 구성, robots/403 대응용 가드 로직 등.
  - 현재 실시간 크롤링은 비활성화 상태.

### 4.4 Groq / Supabase 클라이언트

- Groq:
  - 파일: `src/lib/groq.ts`
  - `groqClient`: 서버 사이드 Groq SDK 인스턴스.
  - `getGroqContent`: 스트리밍/일반 응답에서 텍스트만 추출하는 헬퍼.
- Supabase:
  - 서버: `src/lib/supabase.ts`
  - 브라우저: `src/lib/supabase-browser.ts`
  - Lab 페이지, API 라우트에서 공통으로 사용.

---

## 5. 환경 변수 & 설정

- 예시 파일: `sample.env`, `.env.example`
- 실제 개발용: `.env.local`
- 주요 키:
  - `GROQ_API_KEY`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - `NAVER_API_CLIENT_ID`, `NAVER_API_CLIENT_SECRET` (DataLab OpenAPI)
  - `NAVER_SHOPPING_ENDPOINT` (필요 시 커스터마이징)
  - `COUPANG_SCRAPE_ENABLED` (현재는 false 또는 미사용)

---

## 6. 데이터베이스 설계 참고

- 상세 설계: `docs/db-design.md`
- 핵심 테이블:
  - `analysis_runs`: 각 DataLab 트랜잭션(섹션 1~2)을 대표하는 실행 로그.
  - `analysis_run_keywords`, `keyword_master`, `keyword_scores`: 키워드별 장기 스코어링/시계열 저장용.
  - `chat_logs`, `chat_messages`: 대화 로그 + `analysis_run_id` / `question_type` 메타 저장.
- 현재 코드에서는:
  - `/api/chat` → `analysis_runs` / `chat_logs` / `chat_messages` 연동 완료.
  - 키워드 마스터/스코어 테이블은 향후 확장을 위해 설계만 되어 있음.

---

## 7. 더 볼만한 문서들

- 제품 요구사항(PRD): `docs/prd.md`
- 기술 요구사항(TRD): `docs/trd.md`
- 챗봇·DataLab 연동 플로우: `docs/chat-analysis-flow.md`
- DB 설계: `docs/db-design.md`
- 디자인 토큰/컬러 시스템: `docs/design-tokens.md`
- 키워드 트렌드 지표 설명: `docs/keyword-trends-metrics.md`

이 문서를 기준으로, 신규 기능을 추가할 때는:
- UI → `src/app/...`
- API → `src/app/api/...`
- 공용 로직 → `src/lib/...`
- 스키마/설계 변경 → `docs/*.md`

순서로 파일을 추가/수정하면, 협업자가 구조를 따라가기 쉬울 것입니다.

