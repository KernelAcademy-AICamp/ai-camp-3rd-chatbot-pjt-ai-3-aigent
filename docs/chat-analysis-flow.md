# Lab 챗봇 · DataLab 연동 플로우 설계

이 문서는 Lab 챗봇이 어떤 질문에서 네이버 DataLab 분석 트랜잭션을 실행하는지,  
그리고 그 결과를 어떻게 답변·DB와 연결하는지에 대한 설계 정리입니다.

## 1. 질문 타입 구분

챗봇이 받는 질문은 크게 세 가지 타입으로 나눕니다.

### A. 시장/트렌드 질문 (DataLab 필수)

- 예시
  - `23년도에 뭐가 잘 팔렸어?`
  - `이번년도 패딩 트렌드 알려줘`
  - `최근 3년 동안 생활잡화 키워드 흐름이 어때?`
- 특징
  - 과거/현재/미래 **검색량·트렌드·성장률·피크 시즌** 등이 핵심.
  - 반드시 네이버 DataLab 시계열/Top 키워드 분석을 함께 보여줘야 신뢰도가 생김.

### B. 소싱 전략 질문 (DataLab 있으면 좋음)

- 예시
  - `패딩 신제품 하나 기획한다면 어떤 포지션이 좋을까?`
  - `캠핑 소품으로 마진 괜찮게 가져갈 수 있는 포인트가 뭐야?`
- 특징
  - A 타입 분석 결과(Top 키워드, 성장/계절성, 경쟁도 등)를 **근거로 활용**.
  - DataLab 결과가 없더라도 경험/패턴 기반 답변은 가능.

### C. 네이밍/카피 질문 (DataLab 선택)

- 예시
  - `리유저블백으로 니치 제품명 5개만 뽑아줘`
  - `방수·대용량 포인트를 더 강조해서 이름 다시 지어줘`
- 특징
  - 이미 정해진 컨텍스트(상품명, 타깃, 강조 포인트)를 바탕으로 **제품명·카피 작성**이 목적.
  - DataLab은 굳이 매 턴 호출할 필요 없음.

## 2. DataLab 트랜잭션 실행 조건

DataLab 트랜잭션 = 네이버 Top 키워드 추출 + 트렌드/계절성 분석 + `analysis_runs` 기록.
이 작업은 비용이 크므로, 아래 조건을 만족할 때만 실행합니다.

### 2.1 1차 휴리스틱 (코드 레벨)

함수: `inferDatalabParams(baseParams, lastUserMessage): DatalabParams | null`  
파일: `src/app/api/chat/route.ts`

- 입력: 오른쪽 패널에서 온 기본 `datalabParams` + 마지막 user 메시지.
- 로직:
  1. **분석 스니펫 존재 여부**
     - 메시지에 `키워드 분석 조건:` 이 포함되어 있으면 → DataLab 후보.
  2. **연도/기간 표현 탐지**
     - `2021년`, `2023년도` 와 같은 4자리 연도.
     - `21년도`, `23년` 과 같은 2자리 연도 → 2017~2035 범위에서 20xx로 해석.
     - `이번년도`, `올해` → 현재 연도.
  3. **데이터/트렌드 키워드**
     - `검색량`, `트렌드`, `데이터랩`, `네이버 데이터`, `키워드 발굴`, `키워드 분석`.
  4. **의류/패션 카테고리 자동 매핑**
     - 메시지에 `의류, 옷, 패딩, 코트, 자켓, 후드, 티셔츠, 바지, 원피스` 등 토큰이 있으면
       - 카테고리를 `"패션의류"`로 바꾸고, Naver CID `50000000`을 사용.

- 휴리스틱 결과
  - 위 조건 중 하나도 해당되지 않으면 → `null` 반환 → DataLab 스킵.
  - 해당되면 → 기간/카테고리가 보정된 `DatalabParams` 반환.

### 2.2 2차 LLM 라우팅 (애매한 경우만)

함수: `decideDatalabByLLM(message, params): Promise<boolean>`  
파일: `src/app/api/chat/route.ts`

- 사용 시점:
  - `inferDatalabParams` 가 `params`를 반환했고,
  - 오른쪽 스니펫은 없으며(`키워드 분석 조건:` 미포함),
  - 마지막 user 메시지가 충분히 긴 경우(`length > 40`).
- 역할:
  - Groq LLM에게 “이 질문은 DataLab까지 실행해야 하는가?”를 JSON 한 줄로 물어봄.
  - 예시 응답:
    - `{"should_run": true}`
    - `{"should_run": false}`
- 정책:
  - `should_run: true` → DataLab 트랜잭션 실행.
  - `should_run: false` → 이번 턴은 LLM만 사용, DataLab 요약은 붙이지 않음.
  - LLM 호출 에러/파싱 실패 시 → 보수적으로 `true`(실행) 처리.

### 2.3 최종 실행 흐름

1. `inferDatalabParams(...)` → `effectiveDatalabParams` 결정.
2. `effectiveDatalabParams === null` → DataLab 완전 스킵.
3. `effectiveDatalabParams` 존재 시:
   - 스니펫 있음 → LLM 라우팅 건너뛰고 바로 실행.
   - 스니펫 없음 + 긴 질문 → `decideDatalabByLLM` 결과에 따라 실행 여부 결정.

## 3. DataLab 트랜잭션 상세

함수: `runKeywordAnalysisTransaction(params: DatalabParams): KeywordAnalysisResult`  
파일: `src/lib/datalab-run.ts`

### 3.1 Naver CID 매핑

```ts
const CATEGORY_TO_CID: Record<string, string> = {
  생활잡화: "50000007",      // 생활/건강
  "생활/건강": "50000007",
  생활용품: "50000007",
  패션의류: "50000000",
};
```

- Lab 오른쪽 패널의 카테고리 라벨을 Naver 1분류 CID로 매핑.

### 3.2 Top 키워드 추출

1. `fetchTopKeywords({ cid, timeUnit: "month", startDate, endDate, device, gender, age })`
2. `normalizeNaverKeyword` 로 대표 키워드 정제 후 상위 10개 선정.
3. 하나도 못 얻으면 예외:

```ts
if (!keywords.length) {
  throw new Error("네이버 Top 키워드에서 분석 대상 키워드를 찾지 못했습니다.");
}
```

### 3.3 키워드 트렌드/계절성 계산

1. 키워드를 5개씩 chunk로 나눠  
   `callShoppingCategoryKeywords` (Naver OpenAPI) 호출.
2. `series[keyword] = [{ period, ratio }...]` 구성.
3. `buildKeywordStats` 로:
   - `avgRatio` (전체 평균)
   - `recentAvgRatio` (마지막 1/3 구간 평균)
   - `growthRatio` (최근 vs 이전 구간 비율)
   - `peakMonths` (월별 평균 ratio 기준 Top 3)
   계산.

### 3.4 analysis_runs 기록

Supabase 테이블: `analysis_runs` (docs/db-design.md 참고)

```sql
insert into analysis_runs (
  status, date_from, date_to, period_type,
  device_scope, gender_scope, age_buckets, categories,
  top_keywords, started_at, finished_at
) values (...);
```

- 현재는 `user_id`, `project_id`, `session_id` 는 MVP 단계에서 생략.
- 한 번의 트랜잭션이 “섹션 1–2번 테스트 흐름” 전체를 대표한다고 보면 됨.

## 4. LLM 프롬프트와 DataLab 요약

### 4.1 성공 시 요약 텍스트

파일: `src/app/api/chat/route.ts`

```ts
datalabSummary = [
  "[데이터 기반 키워드 분석 요약]",
  `- 분석 기간: ${result.startDate} ~ ${result.endDate} (timeUnit=${result.timeUnit})`,
  `- 분석 카테고리 ID: ${result.categoryId}`,
  `- Top 키워드: ${result.keywords.join(", ")}`,
  "- 키워드별 성장/계절성:",
  keywordLines, // 각 키워드별 성장 평가 + 피크 시즌
].join("\n");
```

이 텍스트는 system 메시지에 추가되어,  
LLM이 “실제 DataLab 결과를 근거로” 답변하도록 유도합니다.

### 4.2 실패 시 요약 텍스트

Top 키워드를 못 찾는 등 오류 발생 시:

```ts
datalabSummary = [
  "[데이터 기반 키워드 분석 실패]",
  "- 현재 설정된 기간/카테고리 조건으로는 네이버 DataLab Top 키워드/트렌드 데이터를 가져오지 못했습니다.",
  "- 사용자가 원한다면, 기간을 조금 넓히거나 카테고리/상품군을 더 구체적으로 지정하도록 부드럽게 요청한 뒤 다시 분석을 제안하세요.",
  `- 내부 에러 메시지: ${message}`,
].join("\n");
```

LLM은 이 정보를 보고:
- “데이터가 부족하다”는 사실을 솔직히 말하고,
- 기간·카테고리를 어떻게 조정하면 좋을지 사용자에게 다시 물어보도록 유도됩니다.

## 5. Lab UI에서의 디버그 표시

파일: `src/app/lab/page.tsx`

- `/api/chat` 응답에 포함된 `datalabDebug`를 이용해, 개발 환경에서만 디버그 버블을 보여줍니다.

예:

```text
[디버그] 네이버 DataLab 분석 실행됨
- 분석 기간: 2023-01-01 ~ 2023-12-31 (month)
- 카테고리 ID: 50000000
- Top 키워드: 패딩, 코트, 숏패딩, ...
```

또한 브라우저 콘솔에도 `console.log("Datalab debug", dbg)` 로 전체 JSON을 출력해  
트랜잭션이 언제, 어떤 조건으로 실행됐는지 쉽게 확인할 수 있습니다.

## 6. 앞으로의 확장 아이디어

1. **소싱 전략(B)·네이밍(C) 단계 명시화**
   - DataLab 결과가 존재할 때만 소싱 전략/네이밍 프롬프트에  
     `analysis_run_id`나 중요 지표 요약을 명시적으로 포함.
2. **Coupang/1688/타오바오 데이터 통합**
   - 현재는 쿠팡 크롤링 대신 “검색 링크 바로가기”만 제공.
   - 향후 별도 배치/공식 API 환경에서 `market_keyword_stats`와 연계.
3. **analysis_run_keywords 연동**
   - `analysis_runs.top_keywords` 에서 실제 `keyword_master` / `keyword_scores` 와 연결해
     Top N 스코어링 결과까지 저장.
4. **질문 타입 분류 고도화**
   - A/B/C 타입을 LLM 라우터에서 함께 판단해,
     각 타입에 맞는 system prompt 템플릿을 선택하도록 확장.

이 설계를 기준으로, Lab 챗봇의 모든 “데이터 기반 트랜잭션”은  
`runKeywordAnalysisTransaction` + `analysis_runs` 기록을 통해 일관되게 관리됩니다.

