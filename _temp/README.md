# 쿠팡 소싱 도우미 - TrendWhiz

AI 기반 트렌드 예측 및 상품 소싱 플랫폼

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID
**PRD**: [PRD_소싱도우미.md](./PRD_소싱도우미.md)
**TRD**: [TRD_소싱도우미.md](./TRD_소싱도우미.md)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## 핵심 기능

### 🔍 1. 트렌드 분석 & 예측
- **네이버 데이터랩 연동**: 실시간 검색 트렌드 데이터 수집
- **통계적 예측 모델**: Moving Average, Exponential Smoothing, Linear Regression 기반 시계열 예측
- **계절성 패턴 감지**: 자동으로 성수기/비수기 파악 및 최적 진입 시기 추천
- **AI 분석**: Gemini 2.5 Flash를 활용한 유망 키워드 TOP 10 선정

### 💡 2. 상품 소싱 지원
- **쿠팡 경쟁 분석**: 키워드별 경쟁 강도, 평균 가격, 리뷰 수 분석
- **알리바바/타오바오 연동**: 소싱처 제품 검색 및 가격 비교
- **마진 계산기**: 원가, 판매가, 수수료를 고려한 자동 마진 계산
- **틈새 키워드 추천**: 경쟁 회피 가능한 롱테일 키워드 발굴

### 📊 3. 데이터 시각화
- **인터랙티브 차트**: Recharts 기반 트렌드 그래프
- **예측 구간 표시**: 실제 데이터와 예측 데이터 구분 시각화
- **대시보드**: 여러 키워드 비교 분석
- **엑셀/PDF 내보내기**: 분석 결과 다운로드

### 👤 4. 사용자 관리
- **Supabase 인증**: 이메일/비밀번호 기반 로그인
- **분석 히스토리**: 과거 분석 결과 저장 및 재사용
- **RLS (Row Level Security)**: 사용자별 데이터 격리

## What technologies are used for this project?

This project is built with:

- **Frontend**: Next.js 15 + React 18 + TypeScript
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **AI/ML**: Lovable AI Gateway (Gemini 2.5 Flash)
- **Data Viz**: Recharts
- **State Management**: TanStack Query + React Hooks

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 환경 변수 설정

### 필수 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SUPABASE_URL=https://your_project_id.supabase.co
```

### Supabase Edge Functions 환경 변수

Supabase 대시보드에서 설정 (Settings → Edge Functions → Secrets):

```
NAVER_CLIENT_ID=네이버_클라이언트_ID
NAVER_CLIENT_SECRET=네이버_클라이언트_시크릿
LOVABLE_API_KEY=Lovable_AI_API_키
```

### 환경 변수 확인

`.env` 파일이 `.gitignore`에 포함되어 있는지 확인하세요.

## 주요 디렉토리 구조

```
coupang_project/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── ui/             # shadcn/ui 기본 컴포넌트
│   │   ├── AnalysisFilters.tsx
│   │   ├── TrendChart.tsx
│   │   ├── PredictionInsights.tsx  # 예측 인사이트 (신규)
│   │   └── ...
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── Index.tsx       # 메인 대시보드
│   │   └── Auth.tsx        # 로그인/회원가입
│   ├── services/           # 비즈니스 로직
│   │   ├── trendAnalysisService.ts  # 트렌드 분석 서비스
│   │   └── exportService.ts         # 데이터 내보내기
│   └── integrations/       # 외부 서비스 통합
│       └── supabase/
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   │   ├── naver-trend/    # 네이버 데이터랩 연동
│   │   ├── predict-trend/  # 시계열 예측 (신규)
│   │   ├── analyze-trends/ # AI 분석
│   │   ├── coupang-crawl/  # 쿠팡 크롤링
│   │   └── alibaba-search/ # 알리바바 검색
│   └── migrations/         # 데이터베이스 마이그레이션
├── PRD_소싱도우미.md       # 제품 요구사항 문서
├── TRD_소싱도우미.md       # 기술 요구사항 문서
└── CLAUDE.md              # Claude Code 가이드

```

## 사용 방법

1. **회원가입/로그인**: 우측 상단에서 계정 생성
2. **분석 기간 선택**: 좌측 패널에서 시작일~종료일 설정
3. **카테고리 선택**: 생활용품, 생활/건강 등 관심 카테고리 선택
4. **분석 시작**: "분석 시작" 버튼 클릭
5. **결과 확인**:
   - TOP 10 유망 키워드 순위
   - 트렌드 그래프 (실제 + 예측)
   - AI 예측 인사이트 (성장률, 신뢰도, 추천 시기)
   - 경쟁 분석 & 틈새 키워드
6. **소싱 준비**:
   - 알리바바에서 제품 검색
   - 마진 계산기로 수익성 확인
   - 결과 엑셀/PDF 다운로드

## 배포 가이드

### Vercel 배포 (권장)

1. GitHub에 코드 푸시
2. Vercel에서 프로젝트 import
3. 환경 변수 설정
4. 배포 완료

### Supabase Edge Functions 배포

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# Edge Functions 배포
supabase functions deploy naver-trend
supabase functions deploy predict-trend
supabase functions deploy analyze-trends
supabase functions deploy coupang-crawl
supabase functions deploy alibaba-search
```

## 문제 해결

### "AI 크레딧 부족" 오류
- Lovable 대시보드에서 크레딧 충전 필요

### "Rate limit exceeded" 오류
- 네이버 API 호출 제한 (일 1,000회)
- 잠시 후 다시 시도

### 예측 결과가 표시되지 않음
- `predict-trend` Edge Function이 배포되었는지 확인
- 브라우저 콘솔에서 에러 확인

## 기여 및 피드백

이슈 및 개선 제안은 GitHub Issues에 등록해주세요.
