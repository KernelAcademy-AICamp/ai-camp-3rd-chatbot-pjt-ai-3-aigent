# Copaung Code Command · 데이터베이스 설계 (초안)

본 문서는 “키워드 소싱 레이더 (Copaung Code Command)” 서비스의 전체적인 데이터베이스 설계를 정리한 초안입니다.  
초기에는 Supabase(Postgres)를 기준으로 설계하며, 이후 DWH/ETL 환경으로 확장 가능하도록 구조를 잡습니다.

---

## 1. 인증 및 사용자 기본 정보

### 1.1 auth.users (Supabase 기본 테이블)
- 설명: Supabase Auth가 관리하는 기본 사용자 테이블. 이메일/소셜 로그인 등 계정 식별자 보관.
- 주요 컬럼
  - `id uuid pk`
  - `email text`
  - `created_at timestamptz`
  - `last_sign_in_at timestamptz`

### 1.2 profiles
- 설명: 서비스에서 사용하는 사용자 메타 정보.
- 목적: 역할/플랜/닉네임 등 앱 레벨의 속성 관리.

```sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text default 'user',          -- user / admin
  plan text default 'free',          -- free / pro / enterprise 등
  company_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger profiles_updated_at
before update on profiles
for each row
execute procedure update_timestamp();
```

### 1.3 세션/익명 식별
- 설명: 로그인 전에도 사용 가능해야 하므로, 익명 사용자 추적용 세션 ID 관리.

```sql
create table if not exists anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  user_agent text,
  ip_hash text,                    -- IP 해시(직접 저장 X)
  created_at timestamptz default now()
);
```

프론트에서는 쿠키로 `session_id`를 유지하고, 로그인 이후에도 같은 세션을 `chat_logs`와 연계해 퍼널 분석에 활용합니다.

---

## 2. 프로젝트/챗봇 로그 및 사용 행태

### 2.1 sourcing_projects
- 설명: 특정 상품/컨셉 단위의 “프로젝트” 컨텍스트.  
- 예: “리유저블백 · 20~30대 여성 장보기/캠핑 · 친환경/대용량/휴대성”.

```sql
create table if not exists sourcing_projects (
  id bigserial primary key,

  user_id uuid references auth.users(id),

  name text,                       -- 프로젝트 이름 (선택)
  base_product_name text not null, -- 기본 상품명
  target_profile text,             -- 타깃/상황 (예: 20~30대 여성, 장보기/캠핑)
  focus_tags text[],               -- 강조 포인트 배열 (친환경, 대용량 등)

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 2.2 chat_sessions
- 설명: ChatGPT의 “대화방”에 해당하는 엔티티. 프로젝트 단위로 여러 세션이 있을 수 있음.

```sql
create table if not exists chat_sessions (
  id bigserial primary key,

  user_id uuid references auth.users(id),
  project_id bigint references sourcing_projects(id),
  session_id uuid references anonymous_sessions(id),

  title text,                      -- 예: "리유저블백 장보기용 네임 브레인스토밍"

  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);
```

### 2.3 chat_messages
- 설명: 각 세션 내 개별 메시지(유저/assistant/system)를 저장.
- 목적: 대화 히스토리 재현, 패턴 분석, 향후 파인튜닝 데이터로 활용.

```sql
create table if not exists chat_messages (
  id bigserial primary key,

  session_id bigint references chat_sessions(id) on delete cascade,

  role text not null check (role in ('user','assistant','system')),
  content text not null,
  meta jsonb,                      -- 응답 타입, 사용한 analysis_run_id 등

  created_at timestamptz default now()
);
```

### 2.4 chat_logs (요약 로그, 옵션)
- 설명: 세션/메시지 단위보다는 “추천 호출 단위”로 집계해 보고 싶은 경우를 위한 요약 테이블.
- 초기 MVP에서는 생략 가능하며, 필요 시 아래처럼 별도 집계 테이블로 둡니다.

```sql
create table if not exists chat_logs (
  id bigserial primary key,

  user_id uuid references auth.users(id),
  session_id bigint references chat_sessions(id),
  project_id bigint references sourcing_projects(id),

  product_name text,
  target text,
  focus text,

  model_id text,
  latency_ms integer,

  reply text,
  candidate_count integer,

  created_at timestamptz default now()
);
```

### 2.5 product_name_candidates (옵션, 2차 단계)
- 설명: LLM이 생성한 개별 제품명 후보를 구조화해 저장.

```sql
create table if not exists product_name_candidates (
  id bigserial primary key,
  chat_log_id bigint references chat_logs(id) on delete cascade,

  rank integer,                    -- 1, 2, 3...
  candidate_name text,             -- 제품명 전체 문자열
  keyword_tags text[],             -- 포함된 키워드 태그 배열
  trend_summary text,              -- "최근 6개월 검색량 +36%, 경쟁도 중간" 등
  reason text,                     -- 추천 이유 요약

  created_at timestamptz default now()
);
```

---

## 3. 키워드 시계열 및 분석 파이프라인

향후 진짜 “미래 유망 키워드 Top 10”을 계산하기 위해 필요한 구조입니다.  
네이버 데이터랩/마켓 검색 시계열을 어디서 가져오는지는 구현에 따라 다르지만, 저장 구조는 다음과 같이 잡습니다.

### 3.1 keyword_master
- 설명: 분석 대상 키워드 마스터.

```sql
create table if not exists keyword_master (
  id bigserial primary key,
  keyword text not null,

  -- 카테고리/도메인
  category text,                   -- 예: 생활잡화 / 생활건강 ...
  channel text,                    -- 예: naver_search, market_search 등

  -- 태그
  is_bulky boolean default false,  -- 부피 큰 제품 여부
  is_apparel boolean default false,-- 의류 여부
  notes text,

  created_at timestamptz default now(),
  unique (keyword, category, channel)
);
```

### 3.2 keyword_timeseries
- 설명: 키워드별 시계열 데이터 (검색량/인덱스).

```sql
create table if not exists keyword_timeseries (
  id bigserial primary key,
  keyword_id bigint references keyword_master(id) on delete cascade,

  ts_date date not null,
  value numeric not null,          -- 검색량 또는 인덱스
  source text,                     -- naver_datalab / internal 등

  created_at timestamptz default now(),
  unique (keyword_id, ts_date, source)
);
```

### 3.3 keyword_forecasts
- 설명: 시계열 모델(ARIMA/Prophet/LSTM 등) 결과를 저장.

```sql
create table if not exists keyword_forecasts (
  id bigserial primary key,
  keyword_id bigint references keyword_master(id) on delete cascade,

  horizon_start date,              -- 예측 시작일
  horizon_end date,                -- 예측 종료일

  model_name text,                 -- arima, prophet, lstm 등
  mape numeric,                    -- 검증 기간 MAPE
  rmse numeric,

  forecast_avg numeric,            -- 예측 기간 평균 값
  growth_ratio numeric,            -- 향후 n개월 평균 / 직전 n개월 평균
  seasonality_score numeric,       -- 계절성 지표 (0~1)

  created_at timestamptz default now()
);
```

---

## 4. 마켓(쿠팡 등) 경쟁도/상품 정보

### 4.1 market_keyword_stats
- 설명: 특정 마켓에서 키워드로 검색했을 때의 경쟁도 요약.

```sql
create table if not exists market_keyword_stats (
  id bigserial primary key,
  keyword_id bigint references keyword_master(id) on delete cascade,

  market text not null,            -- coupang, etc
  snapshot_date date not null,

  product_count integer,           -- 노출 상품 수
  avg_price numeric,               -- 상위 n개 평균 가격
  avg_review_count numeric,        -- 상위 n개 평균 리뷰 수
  avg_rating numeric,              -- 상위 n개 평균 평점
  ad_ratio numeric,                -- 광고 상품 비율 (0~1, 옵션)

  created_at timestamptz default now(),
  unique (keyword_id, market, snapshot_date)
);
```

### 4.2 keyword_scores
- 설명: 검색 성장성 + 경쟁도 + 마진 + 필터를 합산한 최종 스코어링 결과.

```sql
create table if not exists keyword_scores (
  id bigserial primary key,
  keyword_id bigint references keyword_master(id) on delete cascade,

  as_of_date date not null,

  growth_score numeric,            -- 검색 성장성
  competition_score numeric,       -- 경쟁도 (낮을수록 좋은 점수로 변환)
  margin_score numeric,            -- 가격대/마진 잠재력
  filter_score numeric,            -- 비부피/비의류 필터 반영 점수

  total_score numeric,             -- w1*성장성 + w2*경쟁도 + ...

  ranking integer,                 -- Top N 순위 (해당 cutoff 기준)

  created_at timestamptz default now(),
  unique (keyword_id, as_of_date)
);
```

가중치(w1~w4)는 코드 혹은 별도 `settings` 테이블에서 관리할 수 있습니다.

---

## 5. 분석 실행 이력 / 파이프라인 관리

### 5.1 analysis_runs
- 설명: “키워드 발굴” 모듈에서 사용자가 실행한 분석 작업 이력.  
- 네이버 데이터랩/마켓 크롤링에 필요한 필터(기간, 디바이스, 성별, 연령 등)를 구조화해 저장.

```sql
create table if not exists analysis_runs (
  id bigserial primary key,

  user_id uuid references auth.users(id),
  project_id bigint references sourcing_projects(id),
  session_id bigint references chat_sessions(id),

  started_at timestamptz default now(),
  finished_at timestamptz,
  status text default 'running',   -- running / success / failed

  -- 입력 파라미터
  date_from date,
  date_to date,
  period_type text,                -- 전체/1개월/3개월/1년/직접입력/일간 등

  device_scope text[],             -- 전체/모바일/PC
  gender_scope text[],             -- 전체/남성/여성
  age_buckets text[],              -- 13-18, 19-24, 25-29 등

  categories text[],               -- 생활잡화, 생활/건강, 생활용품 등
  exclude_bulky boolean default true,
  exclude_apparel boolean default true,

  -- 결과 요약
  top_keywords text[],             -- Top 10 키워드 문자열 목록
  notes text
);
```

### 5.2 analysis_run_keywords (옵션)
- 설명: 특정 분석 실행에서 선택된 키워드와 스코어 정보를 연결.

```sql
create table if not exists analysis_run_keywords (
  id bigserial primary key,

  analysis_run_id bigint references analysis_runs(id) on delete cascade,
  keyword_id bigint references keyword_master(id),

  score_id bigint references keyword_scores(id), -- 사용한 스코어 스냅샷
  rank integer,

  created_at timestamptz default now(),
  unique (analysis_run_id, keyword_id)
);
```

이 테이블을 기반으로 “사용자 기준 1회 분석 시간”, “얼마나 자주 돌려보는지” 같은 KPI도 계산 가능합니다.

---

## 6. 권한 / RLS 개략

Supabase를 전제로 한 기본 RLS 방향입니다.

- `profiles`
  - RLS: `auth.uid() = id` 인 행만 읽기/수정 가능.
- `sourcing_projects`, `chat_sessions`, `chat_messages`, `analysis_runs`
  - 기본적으로 `auth.uid() = user_id` 인 행만 조회.
- `product_name_candidates`, `analysis_run_keywords`
  - 부모 엔티티의 user_id를 join 해서 `auth.uid()`와 비교.
- 키워드/스코어링/시계열 테이블들
  - 대부분 읽기 전용 공개 또는 관리자 전용 (내부 분석용).

---

## 7. 단계별 우선순위

1. **즉시 필요한 것 (MVP)**
   - `profiles`
   - `anonymous_sessions`
   - `sourcing_projects`
   - `chat_sessions`
   - `chat_messages`
2. **데이터 기반 추천 단계**
   - `keyword_master`
   - `keyword_timeseries`
   - `market_keyword_stats`
   - `keyword_scores`
   - `analysis_runs`
3. **고급 리포트/모델 개선**
   - `keyword_forecasts`
   - `product_name_candidates`
   - `analysis_run_keywords`

이 문서는 초안이므로, 실제 구현이 진행되면서 컬럼/테이블은 얼마든지 조정할 수 있습니다.  
다음 단계에서는 Supabase 대시보드에서 위 스키마를 생성하고, RLS 정책 및 로그인 플로우(매직링크/OAuth) 설계로 이어가면 됩니다.
