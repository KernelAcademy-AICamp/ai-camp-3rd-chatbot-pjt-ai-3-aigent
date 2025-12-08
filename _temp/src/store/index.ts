import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 카테고리 타입
export interface CategoryItem {
  id: string;
  name: string;
  naverId: string;
  icon: string;
}

// 트렌드 데이터 포인트
export interface TrendDataPoint {
  date: string;
  value: number;
  predicted?: boolean;
}

// 분석 결과 타입
export interface AnalysisResult {
  id: string;
  keyword: string;
  trendScore: number;
  growthPotential: "상" | "중" | "하";
  competitionLevel: "상" | "중" | "하";
  seasonality: {
    pattern: string;
    peakMonths: number[];
    lowMonths: number[];
  };
  nicheKeywords: string[];
  recommendation: string;
  createdAt: string;
}

// 사용자 설정
export interface UserSettings {
  defaultCategories: string[];
  excludeClothing: boolean;
  maxVolume: string;
  targetPlatform: "coupang" | "naver" | "gmarket" | "general";
  analysisDepth: "simple" | "standard" | "deep";
  defaultPeriodMonths: number;
}

// 스토어 상태
interface SourcingStore {
  // 분석 설정
  selectedCategories: string[];
  startDate: string;
  endDate: string;
  device: "" | "pc" | "mo";
  gender: "" | "m" | "f";
  ages: string[];

  // 분석 결과
  currentAnalysis: AnalysisResult | null;
  analysisHistory: AnalysisResult[];

  // 사용자 설정
  settings: UserSettings;

  // 액션
  setSelectedCategories: (categories: string[]) => void;
  toggleCategory: (categoryId: string) => void;
  setDateRange: (startDate: string, endDate: string) => void;
  setDevice: (device: "" | "pc" | "mo") => void;
  setGender: (gender: "" | "m" | "f") => void;
  setAges: (ages: string[]) => void;

  setCurrentAnalysis: (analysis: AnalysisResult | null) => void;
  addToHistory: (analysis: AnalysisResult) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;

  updateSettings: (settings: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

// 기본 설정
const defaultSettings: UserSettings = {
  defaultCategories: ["50000008"], // 생활/건강
  excludeClothing: true,
  maxVolume: "택배 가능 크기",
  targetPlatform: "coupang",
  analysisDepth: "standard",
  defaultPeriodMonths: 12,
};

// 오늘 날짜 기준 기본 기간 설정
const getDefaultDates = () => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDate = new Date(today.setFullYear(today.getFullYear() - 1)).toISOString().split('T')[0];
  return { startDate, endDate };
};

const { startDate: defaultStartDate, endDate: defaultEndDate } = getDefaultDates();

export const useSourcingStore = create<SourcingStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      selectedCategories: ["50000008"],
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      device: "",
      gender: "",
      ages: [],

      currentAnalysis: null,
      analysisHistory: [],

      settings: defaultSettings,

      // 카테고리 관련 액션
      setSelectedCategories: (categories) => set({ selectedCategories: categories }),

      toggleCategory: (categoryId) => set((state) => ({
        selectedCategories: state.selectedCategories.includes(categoryId)
          ? state.selectedCategories.filter((id) => id !== categoryId)
          : [...state.selectedCategories, categoryId]
      })),

      // 필터 관련 액션
      setDateRange: (startDate, endDate) => set({ startDate, endDate }),
      setDevice: (device) => set({ device }),
      setGender: (gender) => set({ gender }),
      setAges: (ages) => set({ ages }),

      // 분석 결과 관련 액션
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),

      addToHistory: (analysis) => set((state) => ({
        analysisHistory: [analysis, ...state.analysisHistory].slice(0, 100) // 최대 100개 저장
      })),

      removeFromHistory: (id) => set((state) => ({
        analysisHistory: state.analysisHistory.filter((item) => item.id !== id)
      })),

      clearHistory: () => set({ analysisHistory: [] }),

      // 설정 관련 액션
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'sourcing-store',
      partialize: (state) => ({
        selectedCategories: state.selectedCategories,
        analysisHistory: state.analysisHistory,
        settings: state.settings,
      }),
    }
  )
);

// 카테고리 목록 (네이버 데이터랩 기준)
export const NAVER_CATEGORIES: CategoryItem[] = [
  { id: "50000000", name: "패션잡화", naverId: "50000000", icon: "👜" },
  { id: "50000002", name: "화장품/미용", naverId: "50000002", icon: "💄" },
  { id: "50000003", name: "디지털/가전", naverId: "50000003", icon: "📱" },
  { id: "50000004", name: "가구/인테리어", naverId: "50000004", icon: "🛋️" },
  { id: "50000005", name: "출산/육아", naverId: "50000005", icon: "👶" },
  { id: "50000006", name: "식품", naverId: "50000006", icon: "🍎" },
  { id: "50000007", name: "스포츠/레저", naverId: "50000007", icon: "⚽" },
  { id: "50000008", name: "생활/건강", naverId: "50000008", icon: "💊" },
  { id: "50000009", name: "여가/생활편의", naverId: "50000009", icon: "🎮" },
];

// 연령대 옵션
export const AGE_OPTIONS = [
  { value: "10", label: "10대" },
  { value: "20", label: "20대" },
  { value: "30", label: "30대" },
  { value: "40", label: "40대" },
  { value: "50", label: "50대" },
  { value: "60", label: "60대 이상" },
];
