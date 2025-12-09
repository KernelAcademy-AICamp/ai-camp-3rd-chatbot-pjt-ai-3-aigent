"use client";

import { useState } from "react";

// 쿠팡 카테고리 목록
const CATEGORIES = [
    "패션의류/잡화",
    "뷰티",
    "출산/유아동",
    "식품",
    "주방용품",
    "생활용품",
    "홈인테리어",
    "가전디지털",
    "컴퓨터/게임",
    "스포츠/레저",
    "자동차용품",
    "도서/음반/DVD",
    "완구/취미",
    "문구/오피스",
    "반려동물용품",
    "헬스/건강식품",
    "기타",
];

type MarginResult = {
    costPrice: number;
    sellingPrice: number;
    commissionRate: number;
    commissionAmount: number;
    settlementFee: number;
    shippingCost: number;
    packagingCost: number;
    advertisingCost: number;
    otherCosts: number;
    totalCosts: number;
    grossProfit: number;
    netProfit: number;
    grossMarginRate: number;
    netMarginRate: number;
    profitPerUnit: number;
    quantity: number;
    totalRevenue: number;
    totalNetProfit: number;
    breakEvenPrice: number;
    minPriceForMargin: {
        margin10: number;
        margin15: number;
        margin20: number;
        margin25: number;
        margin30: number;
    };
    grade: {
        grade: string;
        label: string;
        description: string;
        color: string;
    };
};

type ReverseResult = {
    recommendedPrice: number;
    expectedNetProfit: number;
    expectedNetMarginRate: number;
    grade: {
        grade: string;
        label: string;
        description: string;
        color: string;
    };
    breakdown: {
        costPrice: number;
        commissionRate: number;
        commissionAmount: number;
        settlementFee: number;
        shippingCost: number;
        packagingCost: number;
        advertisingCost: number;
        otherCosts: number;
        totalCosts: number;
    };
};

export default function MarginCalculatorPage() {
    const [mode, setMode] = useState<"calculate" | "reverse">("calculate");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MarginResult | null>(null);
    const [reverseResult, setReverseResult] = useState<ReverseResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 입력값 상태
    const [costPrice, setCostPrice] = useState<string>("10000");
    const [sellingPrice, setSellingPrice] = useState<string>("25000");
    const [category, setCategory] = useState<string>("기타");
    const [shippingCost, setShippingCost] = useState<string>("3000");
    const [packagingCost, setPackagingCost] = useState<string>("500");
    const [advertisingCost, setAdvertisingCost] = useState<string>("0");
    const [otherCosts, setOtherCosts] = useState<string>("0");
    const [quantity, setQuantity] = useState<string>("1");
    const [targetMarginRate, setTargetMarginRate] = useState<string>("20");

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        setReverseResult(null);

        try {
            const body: Record<string, unknown> = {
                mode,
                costPrice: Number(costPrice) || 0,
                category,
                shippingCost: Number(shippingCost) || 0,
                packagingCost: Number(packagingCost) || 0,
                advertisingCost: Number(advertisingCost) || 0,
                otherCosts: Number(otherCosts) || 0,
            };

            if (mode === "calculate") {
                body.sellingPrice = Number(sellingPrice) || 0;
                body.quantity = Number(quantity) || 1;
            } else {
                body.targetMarginRate = Number(targetMarginRate) || 20;
            }

            const res = await fetch("/api/margin-calculator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "계산 중 오류가 발생했습니다.");
            }

            if (mode === "calculate") {
                setResult(data.result);
            } else {
                setReverseResult(data.result);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (n: number) => {
        if (!isFinite(n)) return "∞";
        return Math.round(n).toLocaleString("ko-KR");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* 헤더 */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        💰 마진 계산기
                    </h1>
                    <p className="text-slate-600">
                        쿠팡 판매 마진을 정확하게 계산하고 최적 판매가를 찾아보세요
                    </p>
                </div>

                {/* 모드 선택 */}
                <div className="flex justify-center mb-6">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                        <button
                            onClick={() => setMode("calculate")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "calculate"
                                ? "bg-orange-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            마진 계산
                        </button>
                        <button
                            onClick={() => setMode("reverse")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "reverse"
                                ? "bg-orange-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            판매가 역산
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* 입력 폼 */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">
                            {mode === "calculate" ? "📝 비용 입력" : "🎯 목표 설정"}
                        </h2>

                        <div className="space-y-4">
                            {/* 원가 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    원가 (구매가)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                        placeholder="10000"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                        원
                                    </span>
                                </div>
                            </div>

                            {/* 판매가 또는 목표 마진율 */}
                            {mode === "calculate" ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        판매가
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={sellingPrice}
                                            onChange={(e) => setSellingPrice(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                            placeholder="25000"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                            원
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        목표 순이익률
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={targetMarginRate}
                                            onChange={(e) => setTargetMarginRate(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                            placeholder="20"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                            %
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 카테고리 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    카테고리 (수수료율 결정)
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 추가 비용 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        배송비
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={shippingCost}
                                            onChange={(e) => setShippingCost(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 pr-8 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                            원
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        포장비
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={packagingCost}
                                            onChange={(e) => setPackagingCost(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 pr-8 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                            원
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        광고비
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={advertisingCost}
                                            onChange={(e) => setAdvertisingCost(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 pr-8 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                            원
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        기타비용
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={otherCosts}
                                            onChange={(e) => setOtherCosts(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 pr-8 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                            원
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {mode === "calculate" && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        판매 수량
                                    </label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                        placeholder="1"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleCalculate}
                                disabled={loading}
                                className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-white font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all shadow-md"
                            >
                                {loading ? "계산 중..." : mode === "calculate" ? "마진 계산하기" : "판매가 계산하기"}
                            </button>
                        </div>
                    </div>

                    {/* 결과 표시 */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">
                            📊 분석 결과
                        </h2>

                        {error && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {result && mode === "calculate" && (
                            <div className="space-y-4">
                                {/* 마진 등급 */}
                                <div
                                    className="rounded-lg p-4 text-center"
                                    style={{ backgroundColor: result.grade.color + "20" }}
                                >
                                    <div
                                        className="text-3xl font-bold"
                                        style={{ color: result.grade.color }}
                                    >
                                        {result.grade.label}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {result.grade.description}
                                    </p>
                                </div>

                                {/* 핵심 지표 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                                        <p className="text-xs text-slate-500">순이익</p>
                                        <p className={`text-xl font-bold ${result.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                            {formatNumber(result.netProfit)}원
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                                        <p className="text-xs text-slate-500">순이익률</p>
                                        <p className={`text-xl font-bold ${result.netMarginRate >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                            {result.netMarginRate.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                {/* 비용 상세 */}
                                <div className="rounded-lg border border-slate-200 p-3">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-2">비용 상세</h3>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">원가</span>
                                            <span>{formatNumber(result.costPrice)}원</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">수수료 ({result.commissionRate}%)</span>
                                            <span>{formatNumber(result.commissionAmount)}원</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">정산수수료</span>
                                            <span>{formatNumber(result.settlementFee)}원</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">배송비</span>
                                            <span>{formatNumber(result.shippingCost)}원</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">포장비</span>
                                            <span>{formatNumber(result.packagingCost)}원</span>
                                        </div>
                                        {result.advertisingCost > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">광고비</span>
                                                <span>{formatNumber(result.advertisingCost)}원</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-semibold pt-1 border-t border-slate-200">
                                            <span>총 비용</span>
                                            <span>{formatNumber(result.totalCosts)}원</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 손익분기 정보 */}
                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                                    <h3 className="text-sm font-semibold text-amber-800 mb-2">💡 가격 가이드</h3>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-amber-700">손익분기 판매가</span>
                                            <span className="font-semibold">{formatNumber(result.breakEvenPrice)}원</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-amber-700">20% 마진 달성가</span>
                                            <span className="font-semibold">{formatNumber(result.minPriceForMargin.margin20)}원</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-amber-700">30% 마진 달성가</span>
                                            <span className="font-semibold">{formatNumber(result.minPriceForMargin.margin30)}원</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 수량 기반 분석 */}
                                {result.quantity > 1 && (
                                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                                        <h3 className="text-sm font-semibold text-blue-800 mb-2">📦 {result.quantity}개 판매 시</h3>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-blue-700">총 매출</span>
                                                <p className="font-semibold">{formatNumber(result.totalRevenue)}원</p>
                                            </div>
                                            <div>
                                                <span className="text-blue-700">총 순이익</span>
                                                <p className="font-semibold">{formatNumber(result.totalNetProfit)}원</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {reverseResult && mode === "reverse" && (
                            <div className="space-y-4">
                                {/* 권장 판매가 */}
                                <div
                                    className="rounded-lg p-4 text-center"
                                    style={{ backgroundColor: reverseResult.grade.color + "20" }}
                                >
                                    <p className="text-sm text-slate-600 mb-1">권장 판매가</p>
                                    <div
                                        className="text-3xl font-bold"
                                        style={{ color: reverseResult.grade.color }}
                                    >
                                        {formatNumber(reverseResult.recommendedPrice)}원
                                    </div>
                                </div>

                                {/* 예상 수익 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                                        <p className="text-xs text-slate-500">예상 순이익</p>
                                        <p className="text-xl font-bold text-emerald-600">
                                            {formatNumber(reverseResult.expectedNetProfit)}원
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                                        <p className="text-xs text-slate-500">예상 순이익률</p>
                                        <p className="text-xl font-bold text-emerald-600">
                                            {reverseResult.expectedNetMarginRate.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                {/* 비용 상세 */}
                                <div className="rounded-lg border border-slate-200 p-3">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-2">예상 비용 상세</h3>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">원가</span>
                                            <span>{formatNumber(reverseResult.breakdown.costPrice)}원</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">수수료 ({reverseResult.breakdown.commissionRate}%)</span>
                                            <span>{formatNumber(reverseResult.breakdown.commissionAmount)}원</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">기타 비용</span>
                                            <span>
                                                {formatNumber(
                                                    reverseResult.breakdown.settlementFee +
                                                    reverseResult.breakdown.shippingCost +
                                                    reverseResult.breakdown.packagingCost +
                                                    reverseResult.breakdown.advertisingCost +
                                                    reverseResult.breakdown.otherCosts
                                                )}원
                                            </span>
                                        </div>
                                        <div className="flex justify-between font-semibold pt-1 border-t border-slate-200">
                                            <span>총 비용</span>
                                            <span>{formatNumber(reverseResult.breakdown.totalCosts)}원</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!result && !reverseResult && !error && (
                            <div className="text-center py-8 text-slate-400">
                                <p>입력값을 작성하고 계산 버튼을 눌러주세요</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 안내 문구 */}
                <div className="mt-8 text-center text-xs text-slate-500">
                    <p>⚠️ 쿠팡 수수료율은 변경될 수 있으며, 실제 정산과 차이가 있을 수 있습니다.</p>
                    <p>정확한 수수료는 쿠팡 윙에서 확인해주세요.</p>
                </div>
            </div>
        </div>
    );
}
