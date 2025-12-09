# 네이버 데이터랩 키워드 추세 지표 설명서

이 문서는 `/lab/tools/keywords` 페이지와 향후 Lab 우측 패널에서 사용되는  
**“네이버 데이터랩 키워드 추세 & 계절성”** 지표가 무엇을 의미하는지 정리한 메모입니다.

대상 API는 다음과 같습니다.

- Top 키워드 랭킹:  
  `https://datalab.naver.com/shoppingInsight/getCategoryKeywordRank.naver`
- 키워드별 트렌드:  
  `https://openapi.naver.com/v1/datalab/shopping/category/keywords`

`ratio` 값은 네이버 기준 **동일 기간 내에서 가장 높은 구간을 100으로 정규화한 상대 지표**입니다.  
절대 검색량이 아니라 “해당 기간 안에서 상대적인 강도”를 보는 인덱스입니다.

---

## 1. 공통 용어

- **timeUnit**
  - `date` / `week` / `month`
  - 우리 서비스에서는 기본적으로 `month` 사용 (월별 인덱스).
- **period**
  - 시계열 구간의 시작 날짜 (`yyyy-mm-dd`).
  - 예: `2025-06-01`, `2025-07-01` ...
- **ratio**
  - 해당 구간의 상대적 클릭 인덱스 (0 ~ 100 이상도 가능).
  - 같은 결과 집합 안에서 **가장 큰 값이 100**이 되도록 스케일링.

---

## 2. 지표 정의 (섹션 “네이버 데이터랩 키워드 추세 & 계절성”)

이 섹션에서는 각 키워드에 대해 다음 항목을 보여줍니다.

### 2.1 데이터 포인트 수

- 정의: 선택한 기간 + `timeUnit`에 따라 생성된 시계열 구간 개수.
- 계산:
  - DataLab 응답의 `results[].data` 배열 길이.
- 해석:
  - 값이 클수록 더 긴 기간/세밀한 단위로 데이터를 보고 있다는 뜻.
  - 예: `timeUnit = month`, 2025‑06‑01 ~ 2025‑12‑01 → 약 7개월 → 데이터 포인트 수 = 7.

### 2.2 전체 평균 ratio

- 정의: 전체 기간에 대한 `ratio` 값의 단순 산술 평균.
- 계산:

  ```text
  avgRatio = (Σ ratio_i) / N
  ```

  - `ratio_i`: i번째 구간의 ratio
  - `N`: 데이터 포인트 수

- 해석:
  - 기간 전체에서 **얼마나 꾸준히 검색량이 높은 키워드인지**를 보는 지표.
  - 같은 카테고리 내에서 평균이 클수록 “전체 기간 기준으로 항상 관심을 많이 받는 키워드”.

### 2.3 최근 구간 평균

- 정의: 전체 시계열을 3등분했을 때, **마지막 1/3 구간**에서의 `ratio` 평균.
- 계산:

  ```text
  recentWindow = max(1, floor(N / 3))
  recentRatios = 마지막 recentWindow개의 ratio
  recentAvgRatio = (Σ recentRatios) / recentWindow
  ```

- 해석:
  - “가장 최근 구간에서의 평균 검색 강도”.
  - 전체 평균과 비교하면 “최근에 더 뜨고 있는지 / 식고 있는지” 판단이 가능.

### 2.4 성장 평가 (최근 대비 직전)

- 정의: 최근 1/3 구간과 그 직전 1/3 구간의 평균을 비교한 성장률 평가.
- 계산:

  ```text
  recentWindow = max(1, floor(N / 3))

  recentRatios = 마지막 recentWindow개의 ratio
  prevRatios   = 그 바로 앞 recentWindow개의 ratio

  recentAvg = 평균(recentRatios)
  prevAvg   = 평균(prevRatios)    // 이전 구간이 없으면 null

  growthRatio = (prevAvg > 0) ? (recentAvg / prevAvg) : null
  growthPercent = (growthRatio - 1) * 100  // %
  ```

- UI에서는 growthPercent 값을 구간으로 나누어 텍스트 라벨로 표시합니다.

  - `> +20%` → `강한 상승`
  - `+5% ~ +20%` → `완만한 상승`
  - `-5% ~ +5%` → `보합`
  - `-20% ~ -5%` → `완만한 감소`
  - `≤ -20%` → `강한 감소`

- 해석:
  - “최근 N개월이 그 이전 N개월과 비교해 어느 정도 성장/감소했는지”를 대략적으로 보여주는 지표.
  - 절대값보다는 **방향(상승/보합/감소)** 을 보는 용도에 가깝게 사용합니다.

### 2.5 피크 시즌 (Top 3 월)

- 정의: 월별 평균 ratio를 계산했을 때, 가장 값이 높은 월 상위 3개.
- 계산:

  ```text
  // period: yyyy-mm-dd 형식
  month = 정수(period[5..7])  // 1~12

  monthAgg[month].sum   += ratio
  monthAgg[month].count += 1

  monthAverage[month] = sum / count

  // 평균이 큰 순서로 정렬 후 상위 3개
  peakMonths = sortBy(monthAverage, desc).take(3).map(m => m.month)
  ```

- 해석:
  - 예: `7월, 6월, 8월` → “여름 시즌(6–8월)에 검색이 집중되는 키워드”.
  - 명확한 패턴이 없으면 피크 월이 분산되거나, 데이터가 적어 “특정 계절 패턴 없음”으로 표시될 수 있음.

---

## 3. 분석 파이프라인 개요

1. **카테고리 & 조건 선택**
   - 1분류 카테고리 ID (예: `50000000` 패션의류, `50005542` 도서 등)
   - 기간(`startDate`, `endDate`)
   - `timeUnit` (`date/week/month`)
   - 디바이스(`""`/`pc`/`mo`), 성별(`""`/`m`/`f`), 연령코드(`10/20/30/40/50/60`)

2. **Top 키워드 랭킹 조회**
   - `getCategoryKeywordRank.naver` 에서 카테고리 기준 Top 500를 가져오고,
   - 상위 N개(테스트 페이지에서는 10개)를 분석 후보로 사용.

3. **후보 키워드별 트렌드 조회**
   - `category/keywords` API로 각 키워드의 `ratio` 시계열을 가져온 뒤,
   - 위 2장에서 정의한 지표(데이터 포인트 수, 평균, 성장 평가, 피크 시즌)를 계산.

4. **AI 소싱 인사이트**
   - 계산된 지표들을 텍스트 요약으로 변환해 Groq LLM에 전달하고,
   - “어떤 키워드가 유망한지 / 언제 팔면 좋은지 / 어떤 소싱 포인트가 있는지”를  
     제품기획자 메모 스타일로 정성적으로 해석.

---

이 문서는 개발자/기획자가 같은 지표를 보고 있는지 맞춰보기 위한 기준입니다.  
지표 정의나 구간 나누기 방식이 바뀐다면, 이 문서를 함께 업데이트해야 합니다.

