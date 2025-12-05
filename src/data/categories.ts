import { Category } from "@/types/sourcing";

export const CATEGORIES: Category[] = [
  {
    id: "fashion-accessories",
    name: "패션잡화",
    naverId: "50000008",
    icon: "👜"
  },
  {
    id: "furniture-interior",
    name: "가구/인테리어",
    naverId: "50000004",
    icon: "🛋️"
  },
  {
    id: "life-health",
    name: "생활/건강",
    naverId: "50000006",
    icon: "💊"
  },
  {
    id: "digital-appliance",
    name: "디지털/가전",
    naverId: "50000003",
    icon: "📱"
  },
  {
    id: "food",
    name: "식품",
    naverId: "50000005",
    icon: "🍎"
  },
  {
    id: "sports-leisure",
    name: "스포츠/레저",
    naverId: "50000007",
    icon: "⚽"
  },
  {
    id: "beauty",
    name: "화장품/미용",
    naverId: "50000002",
    icon: "💄"
  },
  {
    id: "baby-kids",
    name: "출산/육아",
    naverId: "50000009",
    icon: "👶"
  },
];

// Mock trending keywords data
export const MOCK_KEYWORDS = [
  { keyword: "무선 충전 마우스패드", growthRate: 45.2, searchVolume: 125000 },
  { keyword: "접이식 캠핑 테이블", growthRate: 38.7, searchVolume: 89000 },
  { keyword: "LED 무드등", growthRate: 32.1, searchVolume: 156000 },
  { keyword: "휴대용 가습기", growthRate: 28.9, searchVolume: 203000 },
  { keyword: "에어프라이어 종이호일", growthRate: 25.4, searchVolume: 178000 },
  { keyword: "목베개 쿠션", growthRate: 22.8, searchVolume: 134000 },
  { keyword: "스마트 체중계", growthRate: 19.5, searchVolume: 112000 },
  { keyword: "미니 제습기", growthRate: 18.2, searchVolume: 98000 },
  { keyword: "접착식 후크", growthRate: 15.7, searchVolume: 245000 },
  { keyword: "케이블 정리함", growthRate: 14.3, searchVolume: 167000 },
];
