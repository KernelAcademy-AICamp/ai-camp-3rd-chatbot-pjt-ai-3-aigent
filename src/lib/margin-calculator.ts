/**
 * 마진 계산기 라이브러리
 * 원가, 판매가, 수수료 등을 고려한 마진 및 수익 계산
 */

// 쿠팡 카테고리별 수수료율 (%)
export const COUPANG_COMMISSION_RATES: Record<string, number> = {
    "패션의류/잡화": 10.8,
    "뷰티": 10.8,
    "출산/유아동": 10.8,
    "식품": 10.8,
    "주방용품": 10.8,
    "생활용품": 10.8,
    "홈인테리어": 10.8,
    "가전디지털": 8.1,
    "컴퓨터/게임": 8.1,
    "스포츠/레저": 10.8,
    "자동차용품": 10.8,
    "도서/음반/DVD": 10.8,
    "완구/취미": 10.8,
    "문구/오피스": 10.8,
    "반려동물용품": 10.8,
    "헬스/건강식품": 10.8,
    "기타": 10.8,
};

// 쿠팡 정산 수수료 (원)
const COUPANG_SETTLEMENT_FEE = 500;

// 마진 계산 입력 타입
export interface MarginCalculatorInput {
    costPrice: number;           // 원가 (구매가)
    sellingPrice: number;        // 판매가
    category?: string;           // 카테고리 (수수료율 결정)
    customCommissionRate?: number; // 커스텀 수수료율 (%)
    shippingCost?: number;       // 배송비 (원)
    packagingCost?: number;      // 포장비 (원)
    advertisingCost?: number;    // 광고비 (원)
    otherCosts?: number;         // 기타 비용 (원)
    quantity?: number;           // 판매 수량 (기본 1)
}

// 마진 계산 결과 타입
export interface MarginCalculatorResult {
    // 비용 상세
    costPrice: number;           // 원가
    sellingPrice: number;        // 판매가
    commissionRate: number;      // 수수료율 (%)
    commissionAmount: number;    // 수수료 금액
    settlementFee: number;       // 정산 수수료
    shippingCost: number;        // 배송비
    packagingCost: number;       // 포장비
    advertisingCost: number;     // 광고비
    otherCosts: number;          // 기타 비용
    totalCosts: number;          // 총 비용

    // 수익 분석
    grossProfit: number;         // 매출총이익 (판매가 - 원가)
    netProfit: number;           // 순이익 (판매가 - 모든 비용)
    grossMarginRate: number;     // 매출총이익률 (%)
    netMarginRate: number;       // 순이익률 (%)
    profitPerUnit: number;       // 개당 순이익

    // 수량 기반 분석
    quantity: number;
    totalRevenue: number;        // 총 매출
    totalNetProfit: number;      // 총 순이익

    // 손익분기점 분석
    breakEvenPrice: number;      // 손익분기 판매가 (순이익 0)
    minPriceForMargin: (targetMargin: number) => number; // 목표 마진을 위한 최소 판매가
}

// 목표 마진률로 판매가 역산
export interface PriceFromMarginInput {
    costPrice: number;           // 원가
    targetMarginRate: number;    // 목표 순이익률 (%)
    category?: string;
    customCommissionRate?: number;
    shippingCost?: number;
    packagingCost?: number;
    advertisingCost?: number;
    otherCosts?: number;
}

export interface PriceFromMarginResult {
    recommendedPrice: number;    // 권장 판매가
    expectedNetProfit: number;   // 예상 순이익
    expectedNetMarginRate: number; // 예상 순이익률
    breakdownDetails: MarginCalculatorResult;
}

/**
 * 마진 계산 함수
 * @param input 마진 계산 입력값
 * @returns 상세 마진 분석 결과
 */
export function calculateMargin(input: MarginCalculatorInput): MarginCalculatorResult {
    const {
        costPrice,
        sellingPrice,
        category = "기타",
        customCommissionRate,
        shippingCost = 0,
        packagingCost = 0,
        advertisingCost = 0,
        otherCosts = 0,
        quantity = 1,
    } = input;

    // 수수료율 결정
    const commissionRate = customCommissionRate ?? (COUPANG_COMMISSION_RATES[category] || 10.8);

    // 수수료 금액 계산
    const commissionAmount = sellingPrice * (commissionRate / 100);

    // 총 비용 계산
    const totalCosts = costPrice + commissionAmount + COUPANG_SETTLEMENT_FEE +
        shippingCost + packagingCost + advertisingCost + otherCosts;

    // 이익 계산
    const grossProfit = sellingPrice - costPrice;
    const netProfit = sellingPrice - totalCosts;

    // 이익률 계산
    const grossMarginRate = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
    const netMarginRate = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;

    // 손익분기 판매가 계산 (수수료 고려)
    // breakEvenPrice - costPrice - breakEvenPrice * (commissionRate/100) - 기타비용 = 0
    // breakEvenPrice * (1 - commissionRate/100) = costPrice + 기타비용
    const fixedCosts = costPrice + COUPANG_SETTLEMENT_FEE + shippingCost + packagingCost + advertisingCost + otherCosts;
    const breakEvenPrice = fixedCosts / (1 - commissionRate / 100);

    // 목표 마진을 위한 최소 판매가 계산 함수
    const minPriceForMargin = (targetMargin: number): number => {
        // netProfit / sellingPrice = targetMargin / 100
        // (sellingPrice - fixedCosts - sellingPrice * commissionRate/100) / sellingPrice = targetMargin/100
        // 1 - fixedCosts/sellingPrice - commissionRate/100 = targetMargin/100
        // fixedCosts/sellingPrice = 1 - commissionRate/100 - targetMargin/100
        // sellingPrice = fixedCosts / (1 - commissionRate/100 - targetMargin/100)
        const denominator = 1 - commissionRate / 100 - targetMargin / 100;
        if (denominator <= 0) return Infinity;
        return fixedCosts / denominator;
    };

    return {
        costPrice,
        sellingPrice,
        commissionRate,
        commissionAmount,
        settlementFee: COUPANG_SETTLEMENT_FEE,
        shippingCost,
        packagingCost,
        advertisingCost,
        otherCosts,
        totalCosts,
        grossProfit,
        netProfit,
        grossMarginRate,
        netMarginRate,
        profitPerUnit: netProfit,
        quantity,
        totalRevenue: sellingPrice * quantity,
        totalNetProfit: netProfit * quantity,
        breakEvenPrice,
        minPriceForMargin,
    };
}

/**
 * 목표 마진율로 판매가 역산
 * @param input 역산 입력값
 * @returns 권장 판매가 및 예상 수익
 */
export function calculatePriceFromMargin(input: PriceFromMarginInput): PriceFromMarginResult {
    const {
        costPrice,
        targetMarginRate,
        category = "기타",
        customCommissionRate,
        shippingCost = 0,
        packagingCost = 0,
        advertisingCost = 0,
        otherCosts = 0,
    } = input;

    const commissionRate = customCommissionRate ?? (COUPANG_COMMISSION_RATES[category] || 10.8);
    const fixedCosts = costPrice + COUPANG_SETTLEMENT_FEE + shippingCost + packagingCost + advertisingCost + otherCosts;

    // 목표 마진율을 달성하기 위한 판매가 계산
    const denominator = 1 - commissionRate / 100 - targetMarginRate / 100;
    if (denominator <= 0) {
        throw new Error(`목표 마진율 ${targetMarginRate}%는 수수료율 ${commissionRate}% 고려 시 달성 불가능합니다.`);
    }

    const recommendedPrice = Math.ceil(fixedCosts / denominator);

    // 계산 결과 검증
    const breakdownDetails = calculateMargin({
        costPrice,
        sellingPrice: recommendedPrice,
        category,
        customCommissionRate,
        shippingCost,
        packagingCost,
        advertisingCost,
        otherCosts,
    });

    return {
        recommendedPrice,
        expectedNetProfit: breakdownDetails.netProfit,
        expectedNetMarginRate: breakdownDetails.netMarginRate,
        breakdownDetails,
    };
}

/**
 * 손익분기 판매 수량 계산
 * @param fixedMonthlyCosts 월 고정비용 (창고료, 인건비 등)
 * @param profitPerUnit 개당 순이익
 * @returns 손익분기 판매 수량
 */
export function calculateBreakEvenQuantity(
    fixedMonthlyCosts: number,
    profitPerUnit: number
): number {
    if (profitPerUnit <= 0) return Infinity;
    return Math.ceil(fixedMonthlyCosts / profitPerUnit);
}

/**
 * 마진율 등급 판정
 * @param netMarginRate 순이익률 (%)
 * @returns 등급 및 설명
 */
export function getMarginGrade(netMarginRate: number): {
    grade: "excellent" | "good" | "moderate" | "low" | "loss";
    label: string;
    description: string;
    color: string;
} {
    if (netMarginRate >= 30) {
        return {
            grade: "excellent",
            label: "우수",
            description: "매우 높은 마진율입니다. 경쟁력 있는 상품입니다.",
            color: "#10b981",
        };
    }
    if (netMarginRate >= 20) {
        return {
            grade: "good",
            label: "양호",
            description: "양호한 마진율입니다. 안정적인 수익이 기대됩니다.",
            color: "#22c55e",
        };
    }
    if (netMarginRate >= 10) {
        return {
            grade: "moderate",
            label: "보통",
            description: "평균적인 마진율입니다. 추가 비용 절감 검토 권장.",
            color: "#f59e0b",
        };
    }
    if (netMarginRate >= 0) {
        return {
            grade: "low",
            label: "낮음",
            description: "낮은 마진율입니다. 가격 인상 또는 비용 절감 필요.",
            color: "#f97316",
        };
    }
    return {
        grade: "loss",
        label: "손실",
        description: "손실이 발생합니다. 판매 전략 재검토 필수.",
        color: "#ef4444",
    };
}

/**
 * 마진 요약 포맷팅
 */
export function formatMarginSummary(result: MarginCalculatorResult): string {
    const grade = getMarginGrade(result.netMarginRate);
    return `
📊 마진 분석 결과
━━━━━━━━━━━━━━━━━
💰 판매가: ${result.sellingPrice.toLocaleString()}원
📦 원가: ${result.costPrice.toLocaleString()}원
📉 수수료: ${result.commissionAmount.toLocaleString()}원 (${result.commissionRate}%)
💵 순이익: ${result.netProfit.toLocaleString()}원
📈 순이익률: ${result.netMarginRate.toFixed(1)}%
🏷️ 등급: ${grade.label}
━━━━━━━━━━━━━━━━━
💡 손익분기 판매가: ${result.breakEvenPrice.toLocaleString()}원
📌 20% 마진 달성: ${result.minPriceForMargin(20).toLocaleString()}원
`.trim();
}
