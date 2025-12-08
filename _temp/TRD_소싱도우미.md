# TRD (Technical Requirements Document)
# 쿠팡 소싱 도우미 - 기술 명세서

---

## 1. 시스템 아키텍처

### 1.1 전체 구조도
```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Next.js)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   대시보드   │ │  분석 화면  │ │ 마진계산기  │ │ 히스토리  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┼─────────────────────────────────────┐
│                     API Layer (Next.js API Routes)              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ /api/naver  │ │ /api/predict│ │ /api/claude │ │/api/source│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                      External Services                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │네이버 API   │ │ Claude API  │ │ 1688/타오바오│ │ 쿠팡 크롤링│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                     ML Processing Layer                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              LSTM 시계열 예측 모델 (TensorFlow.js)          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 기술 스택
```json
{
  "frontend": {
    "framework": "Next.js 14 (App Router)",
    "language": "TypeScript",
    "styling": "Tailwind CSS",
    "state": "Zustand",
    "charts": "Recharts / Chart.js",
    "ui": "shadcn/ui"
  },
  "backend": {
    "runtime": "Next.js API Routes (Edge Runtime)",
    "validation": "Zod",
    "http_client": "axios"
  },
  "ml": {
    "framework": "TensorFlow.js",
    "model": "LSTM (Long Short-Term Memory)"
  },
  "external_api": {
    "search_trend": "네이버 데이터랩 API",
    "ai_analysis": "Claude API (Anthropic)",
    "sourcing": "1688/타오바오 검색"
  },
  "storage": {
    "local": "localStorage (암호화)",
    "state": "IndexedDB (히스토리)"
  }
}
```

---

## 2. API 설계

### 2.1 네이버 데이터랩 연동 API

#### 환경변수 설정
```env
# .env.local
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret
CLAUDE_API_KEY=your_claude_api_key
```

#### API 엔드포인트: `/api/naver/trend`
```typescript
// app/api/naver/trend/route.ts

// Request
interface NaverTrendRequest {
  startDate: string;      // "2020-01-01"
  endDate: string;        // "2025-11-30"
  timeUnit: "date" | "week" | "month";
  category: string[];     // ["50000000", "50000001", "50000002"]
  device?: "pc" | "mo" | "";
  gender?: "m" | "f" | "";
  ages?: string[];        // ["20", "30", "40"]
}

// Response
interface NaverTrendResponse {
  success: boolean;
  data: {
    title: string;
    keywords: string[];
    data: {
      period: string;
      ratio: number;
    }[];
  }[];
  error?: string;
}

// 네이버 카테고리 코드 매핑
const CATEGORY_CODES = {
  "생활잡화": "50000003",
  "생활/건강": "50000008",
  "생활용품": "50000004"
};
```

#### 네이버 API 호출 구현
```typescript
// lib/naver-api.ts
import axios from 'axios';

export async function fetchNaverTrend(params: NaverTrendRequest) {
  const response = await axios.post(
    'https://openapi.naver.com/v1/datalab/shopping/categories',
    {
      startDate: params.startDate,
      endDate: params.endDate,
      timeUnit: params.timeUnit,
      category: params.category,
      device: params.device || '',
      gender: params.gender || '',
      ages: params.ages || []
    },
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

### 2.2 LSTM 예측 API

#### API 엔드포인트: `/api/predict/lstm`
```typescript
// app/api/predict/lstm/route.ts

// Request
interface LSTMPredictRequest {
  historicalData: {
    date: string;
    value: number;
  }[];
  predictionMonths: number;  // 1~6
  keyword: string;
}

// Response
interface LSTMPredictResponse {
  success: boolean;
  data: {
    keyword: string;
    predictions: {
      date: string;
      predicted_value: number;
      confidence_lower: number;
      confidence_upper: number;
    }[];
    growth_rate: number;        // 예상 성장률 (%)
    seasonality: {
      pattern: string;          // "매년 3~4월 급상승"
      peak_months: number[];    // [3, 4]
      low_months: number[];     // [7, 8]
    };
    model_confidence: number;   // 0~100
  };
}
```

#### LSTM 모델 구현
```typescript
// lib/lstm-model.ts
import * as tf from '@tensorflow/tfjs';

export class TrendPredictor {
  private model: tf.LayersModel | null = null;
  
  async buildModel(inputShape: number) {
    this.model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 50,
          returnSequences: true,
          inputShape: [inputShape, 1]
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 50,
          returnSequences: false
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 25, activation: 'relu' }),
        tf.layers.dense({ units: 1 })
      ]
    });
    
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
  }
  
  async train(data: number[], epochs: number = 100) {
    // 데이터 전처리 및 학습
    const { X, y, scaler } = this.prepareData(data);
    
    await this.model!.fit(X, y, {
      epochs,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
        }
      }
    });
    
    return scaler;
  }
  
  async predict(data: number[], months: number) {
    // 예측 수행
    const predictions: number[] = [];
    let currentSequence = data.slice(-60); // 최근 60일 데이터 사용
    
    for (let i = 0; i < months * 30; i++) {
      const input = tf.tensor3d([currentSequence.map(v => [v])]);
      const prediction = this.model!.predict(input) as tf.Tensor;
      const value = prediction.dataSync()[0];
      
      predictions.push(value);
      currentSequence = [...currentSequence.slice(1), value];
    }
    
    return predictions;
  }
  
  private prepareData(data: number[]) {
    // Min-Max 정규화
    const min = Math.min(...data);
    const max = Math.max(...data);
    const normalized = data.map(v => (v - min) / (max - min));
    
    // 시퀀스 생성 (60일 윈도우)
    const windowSize = 60;
    const X: number[][][] = [];
    const y: number[] = [];
    
    for (let i = windowSize; i < normalized.length; i++) {
      X.push(normalized.slice(i - windowSize, i).map(v => [v]));
      y.push(normalized[i]);
    }
    
    return {
      X: tf.tensor3d(X),
      y: tf.tensor2d(y, [y.length, 1]),
      scaler: { min, max }
    };
  }
}
```

### 2.3 Claude AI 분석 API

#### API 엔드포인트: `/api/claude/analyze`
```typescript
// app/api/claude/analyze/route.ts

// Request
interface ClaudeAnalyzeRequest {
  trendData: {
    keyword: string;
    historicalTrend: { date: string; value: number }[];
    lstmPrediction: { date: string; value: number }[];
    growthRate: number;
  }[];
  userCriteria: {
    excludeClothing: boolean;      // true
    maxVolume: string;             // "택배 가능 크기"
    targetPlatform: string;        // "쿠팡"
  };
  analysisType: "ranking" | "niche_keyword" | "product_name";
}

// Response
interface ClaudeAnalyzeResponse {
  success: boolean;
  data: {
    top10Keywords: {
      rank: number;
      keyword: string;
      growthPotential: "상" | "중" | "하";
      competitionLevel: "상" | "중" | "하";
      reason: string;              // 유망 이유 상세 설명
      recommendedTiming: string;   // "2월 중순 재고 확보"
      seasonalPattern: string;     // "매년 3~4월 급상승"
      nicheKeywords: string[];     // 틈새 키워드 목록
    }[];
    analysisInsights: string;      // 전체 분석 인사이트
  };
}
```

#### Claude API 호출 구현
```typescript
// lib/claude-api.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

export async function analyzeWithClaude(request: ClaudeAnalyzeRequest) {
  const systemPrompt = `
당신은 숙련된 온라인 쇼핑몰 소싱 전문가입니다.
특히 쿠팡 마켓플레이스에 대한 깊은 이해를 가지고 있습니다.

분석 기준:
1. 부피가 크지 않은 제품 (택배 배송 가능)
2. 의류 카테고리 제외
3. 쿠팡 소비자 검색 패턴 기반

출력 형식: JSON
  `;

  const userPrompt = `
다음 트렌드 데이터를 분석하여 TOP 10 유망 키워드를 선정해주세요.

트렌드 데이터:
${JSON.stringify(request.trendData, null, 2)}

사용자 조건:
${JSON.stringify(request.userCriteria, null, 2)}

각 키워드에 대해 다음을 포함해주세요:
1. 유망한 이유 (구체적 근거)
2. 예상 성장 잠재력
3. 경쟁 강도 예측
4. 최적 진입 시기
5. 계절성 패턴
6. 추천 틈새 키워드 3개
  `;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      { role: "user", content: userPrompt }
    ],
    system: systemPrompt
  });

  return JSON.parse(response.content[0].text);
}
```

### 2.4 쿠팡 경쟁강도 분석 API

#### API 엔드포인트: `/api/coupang/competition`
```typescript
// app/api/coupang/competition/route.ts

// Request
interface CoupangCompetitionRequest {
  keyword: string;
}

// Response
interface CoupangCompetitionResponse {
  success: boolean;
  data: {
    keyword: string;
    totalProducts: number;           // 총 상품 수
    avgReviewCount: number;          // 평균 리뷰 수
    avgPrice: number;                // 평균 가격
    priceRange: {
      min: number;
      max: number;
    };
    top10Products: {
      name: string;
      price: number;
      reviewCount: number;
      rating: number;
      isRocketDelivery: boolean;
    }[];
    rocketDeliveryRatio: number;     // 로켓배송 비율 (%)
    competitionScore: number;         // 경쟁강도 점수 (1~100)
    competitionLevel: "상" | "중" | "하";
    insights: string;                 // 경쟁 분석 인사이트
  };
}
```

### 2.5 틈새 키워드 추천 API

#### API 엔드포인트: `/api/keyword/niche`
```typescript
// app/api/keyword/niche/route.ts

// Request
interface NicheKeywordRequest {
  mainKeyword: string;               // "리유저블백"
  maxResults?: number;               // 기본값 10
}

// Response
interface NicheKeywordResponse {
  success: boolean;
  data: {
    mainKeyword: string;
    nicheKeywords: {
      keyword: string;               // "장바구니 접이식 대형"
      searchVolume: number;          // 월간 검색량
      competition: "상" | "중" | "하";
      cpc: number;                   // 클릭당 비용 (광고)
      relevanceScore: number;        // 연관성 점수 (0~100)
      recommendedTitle: string;      // 추천 제품명
      reasoning: string;             // 추천 이유
    }[];
    titleSuggestions: {
      keyword: string;
      titles: string[];              // 제품명 추천 3개
    }[];
  };
}
```

### 2.6 마진 계산 API

#### API 엔드포인트: `/api/calculator/margin`
```typescript
// app/api/calculator/margin/route.ts

// Request
interface MarginCalculatorRequest {
  purchasePrice: number;             // 원가 (원)
  sellingPrice: number;              // 판매가 (원)
  shippingCost: number;              // 배송비 (원)
  coupangFeeRate: number;            // 쿠팡 수수료율 (%, 기본 10.8)
  adCostPerUnit?: number;            // 단위당 광고비 (원)
  returnRate?: number;               // 반품률 (%, 기본 3)
  quantity?: number;                 // 판매 수량 (기본 1)
}

// Response
interface MarginCalculatorResponse {
  success: boolean;
  data: {
    // 단위당 계산
    perUnit: {
      revenue: number;               // 매출
      coupangFee: number;            // 쿠팡 수수료
      shippingCost: number;          // 배송비
      adCost: number;                // 광고비
      returnCost: number;            // 반품 비용
      totalCost: number;             // 총 비용
      grossProfit: number;           // 매출이익
      netProfit: number;             // 순이익
      marginRate: number;            // 마진율 (%)
    };
    // 총계 (수량 적용)
    total: {
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
    };
    // 손익분기점
    breakEven: {
      quantity: number;              // 손익분기 수량
      revenue: number;               // 손익분기 매출
    };
    // 추천 판매가 (목표 마진율 기준)
    recommendedPrices: {
      margin20: number;              // 20% 마진 시 판매가
      margin30: number;              // 30% 마진 시 판매가
      margin40: number;              // 40% 마진 시 판매가
    };
  };
}
```

### 2.7 소싱처 연동 API

#### API 엔드포인트: `/api/sourcing/search`
```typescript
// app/api/sourcing/search/route.ts

// Request
interface SourcingSearchRequest {
  keyword: string;
  platform: "1688" | "taobao" | "aliexpress";
  maxResults?: number;
  sortBy?: "price" | "sales" | "rating";
}

// Response
interface SourcingSearchResponse {
  success: boolean;
  data: {
    platform: string;
    keyword: string;
    totalResults: number;
    products: {
      id: string;
      title: string;
      titleKo: string;              // 한글 번역 제목
      price: number;                // 원화 환산 가격
      originalPrice: number;        // 원래 통화 가격
      currency: string;             // CNY, USD 등
      moq: number;                  // 최소 주문 수량
      salesCount: number;           // 판매량
      rating: number;               // 평점
      supplierRating: string;       // 공급업체 등급
      shippingEstimate: string;     // 예상 배송 기간
      imageUrl: string;             // 대표 이미지
      productUrl: string;           // 상품 링크
      specifications: {
        weight: string;
        size: string;
        material: string;
      };
    }[];
    exchangeRate: number;           // 현재 환율
  };
}
```

---

## 3. 데이터 모델

### 3.1 TypeScript 인터페이스
```typescript
// types/index.ts

// 트렌드 데이터
interface TrendData {
  id: string;
  keyword: string;
  category: string;
  period: {
    start: string;
    end: string;
  };
  dataPoints: {
    date: string;
    value: number;
  }[];
  metadata: {
    device: string;
    gender: string;
    ages: string[];
  };
  createdAt: string;
}

// 분석 결과
interface AnalysisResult {
  id: string;
  type: "trend" | "competition" | "niche";
  input: Record<string, any>;
  output: Record<string, any>;
  createdAt: string;
}

// 히스토리
interface AnalysisHistory {
  id: string;
  name: string;
  analyses: AnalysisResult[];
  createdAt: string;
  updatedAt: string;
}

// 사용자 설정
interface UserSettings {
  defaultCategory: string[];
  defaultPeriod: {
    months: number;
  };
  excludeClothing: boolean;
  maxVolume: string;
  targetPlatform: string;
}
```

### 3.2 로컬 스토리지 스키마
```typescript
// lib/storage.ts
import { openDB, DBSchema } from 'idb';

interface SourcingDB extends DBSchema {
  analyses: {
    key: string;
    value: AnalysisResult;
    indexes: { 'by-date': string };
  };
  history: {
    key: string;
    value: AnalysisHistory;
  };
  settings: {
    key: string;
    value: UserSettings;
  };
}

export async function initDB() {
  return openDB<SourcingDB>('sourcing-assistant', 1, {
    upgrade(db) {
      const analysisStore = db.createObjectStore('analyses', { keyPath: 'id' });
      analysisStore.createIndex('by-date', 'createdAt');
      
      db.createObjectStore('history', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'id' });
    }
  });
}
```

---

## 4. 프론트엔드 구조

### 4.1 디렉토리 구조
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 메인 대시보드
│   ├── analysis/
│   │   └── [keyword]/
│   │       └── page.tsx            # 키워드 상세 분석
│   ├── calculator/
│   │   └── page.tsx                # 마진 계산기
│   ├── history/
│   │   └── page.tsx                # 분석 히스토리
│   ├── sourcing/
│   │   └── page.tsx                # 소싱처 검색
│   └── api/
│       ├── naver/
│       │   └── trend/route.ts
│       ├── predict/
│       │   └── lstm/route.ts
│       ├── claude/
│       │   └── analyze/route.ts
│       ├── coupang/
│       │   └── competition/route.ts
│       ├── keyword/
│       │   └── niche/route.ts
│       ├── calculator/
│       │   └── margin/route.ts
│       └── sourcing/
│           └── search/route.ts
├── components/
│   ├── ui/                         # shadcn/ui 컴포넌트
│   ├── dashboard/
│   │   ├── PeriodSelector.tsx
│   │   ├── CategorySelector.tsx
│   │   ├── FilterPanel.tsx
│   │   └── AnalysisButton.tsx
│   ├── analysis/
│   │   ├── TrendChart.tsx
│   │   ├── KeywordRanking.tsx
│   │   ├── SeasonalityCard.tsx
│   │   └── CompetitionScore.tsx
│   ├── calculator/
│   │   ├── MarginForm.tsx
│   │   └── ResultCard.tsx
│   └── sourcing/
│       ├── ProductCard.tsx
│       └── SearchResults.tsx
├── lib/
│   ├── naver-api.ts
│   ├── claude-api.ts
│   ├── lstm-model.ts
│   ├── storage.ts
│   └── utils.ts
├── hooks/
│   ├── useNaverTrend.ts
│   ├── usePrediction.ts
│   ├── useClaudeAnalysis.ts
│   └── useStorage.ts
├── store/
│   └── index.ts                    # Zustand store
└── types/
    └── index.ts
```

### 4.2 주요 컴포넌트 설계

#### 대시보드 페이지
```tsx
// app/page.tsx
'use client';

import { useState } from 'react';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { CategorySelector } from '@/components/dashboard/CategorySelector';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { AnalysisButton } from '@/components/dashboard/AnalysisButton';
import { KeywordRanking } from '@/components/analysis/KeywordRanking';
import { TrendChart } from '@/components/analysis/TrendChart';

export default function Dashboard() {
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    // 1. 네이버 데이터 수집
    // 2. LSTM 예측
    // 3. Claude 분석
    // 4. 결과 표시
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">🛒 쿠팡 소싱 도우미</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PeriodSelector value={period} onChange={setPeriod} />
        <CategorySelector value={categories} onChange={setCategories} />
        <FilterPanel />
      </div>
      
      <AnalysisButton 
        onClick={handleAnalyze} 
        isLoading={isLoading}
        disabled={!period.start || categories.length === 0}
      />
      
      {results && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <KeywordRanking data={results.top10Keywords} />
          <TrendChart data={results.trendData} />
        </div>
      )}
    </div>
  );
}
```

---

## 5. 보안 설계

### 5.1 API Key 관리
```typescript
// 서버 사이드에서만 환경변수 접근
// app/api/*/route.ts

// ✅ 올바른 방법
const apiKey = process.env.CLAUDE_API_KEY; // 서버에서만 접근

// ❌ 잘못된 방법 (클라이언트 노출)
const apiKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
```

### 5.2 Rate Limiting
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
  analytics: true,
});

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
}

export const config = {
  matcher: '/api/:path*',
};
```

### 5.3 입력 검증
```typescript
// lib/validation.ts
import { z } from 'zod';

export const trendRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.array(z.string()).min(1).max(3),
  device: z.enum(['pc', 'mo', '']).optional(),
  gender: z.enum(['m', 'f', '']).optional(),
  ages: z.array(z.string()).optional()
});

export const marginRequestSchema = z.object({
  purchasePrice: z.number().positive(),
  sellingPrice: z.number().positive(),
  shippingCost: z.number().nonnegative(),
  coupangFeeRate: z.number().min(0).max(100).default(10.8),
  adCostPerUnit: z.number().nonnegative().optional(),
  returnRate: z.number().min(0).max(100).default(3),
  quantity: z.number().positive().default(1)
});
```

---

## 6. 성능 최적화

### 6.1 데이터 캐싱
```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedTrendData = unstable_cache(
  async (params: NaverTrendRequest) => {
    return await fetchNaverTrend(params);
  },
  ['naver-trend'],
  {
    revalidate: 3600, // 1시간 캐시
    tags: ['trend-data']
  }
);
```

### 6.2 LSTM 모델 최적화
```typescript
// Web Worker에서 LSTM 실행
// workers/lstm.worker.ts
import * as tf from '@tensorflow/tfjs';

self.onmessage = async (e) => {
  const { data, predictionMonths } = e.data;
  
  // 백그라운드에서 예측 수행
  const predictor = new TrendPredictor();
  await predictor.buildModel(60);
  await predictor.train(data);
  const predictions = await predictor.predict(data, predictionMonths);
  
  self.postMessage({ predictions });
};
```

### 6.3 코드 스플리팅
```typescript
// 동적 임포트로 번들 최적화
const TrendChart = dynamic(() => import('@/components/analysis/TrendChart'), {
  loading: () => <Skeleton className="h-[400px]" />,
  ssr: false
});

const LSTMPredictor = dynamic(() => import('@/lib/lstm-model'), {
  ssr: false // 클라이언트에서만 로드
});
```

---

## 7. 테스트 전략

### 7.1 유닛 테스트
```typescript
// __tests__/margin-calculator.test.ts
import { calculateMargin } from '@/lib/calculator';

describe('마진 계산기', () => {
  it('기본 마진율 계산', () => {
    const result = calculateMargin({
      purchasePrice: 5000,
      sellingPrice: 15000,
      shippingCost: 2500,
      coupangFeeRate: 10.8
    });
    
    expect(result.perUnit.marginRate).toBeCloseTo(31.2, 1);
  });
  
  it('손익분기점 계산', () => {
    const result = calculateMargin({
      purchasePrice: 10000,
      sellingPrice: 20000,
      shippingCost: 3000,
      coupangFeeRate: 10.8
    });
    
    expect(result.breakEven.quantity).toBeDefined();
  });
});
```

### 7.2 E2E 테스트
```typescript
// e2e/analysis.spec.ts
import { test, expect } from '@playwright/test';

test('트렌드 분석 플로우', async ({ page }) => {
  await page.goto('/');
  
  // 기간 선택
  await page.click('[data-testid="period-start"]');
  await page.fill('[data-testid="period-start"]', '2024-01-01');
  
  // 카테고리 선택
  await page.click('[data-testid="category-생활용품"]');
  
  // 분석 시작
  await page.click('[data-testid="analyze-button"]');
  
  // 결과 확인
  await expect(page.locator('[data-testid="keyword-ranking"]')).toBeVisible();
});
```

---

## 8. 배포 구성

### 8.1 환경 설정
```yaml
# vercel.json
{
  "env": {
    "NAVER_CLIENT_ID": "@naver_client_id",
    "NAVER_CLIENT_SECRET": "@naver_client_secret",
    "CLAUDE_API_KEY": "@claude_api_key"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS" }
      ]
    }
  ]
}
```

### 8.2 CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 9. 모니터링

### 9.1 로깅
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString()
    }));
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    }));
  }
};
```

### 9.2 에러 핸들링
```typescript
// lib/error-handler.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return Response.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  logger.error('Unexpected error', error);
  return Response.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

**문서 버전**: v1.0  
**작성일**: 2025.12.05  
**작성자**: AI 소싱 전문가
