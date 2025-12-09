import { NextRequest, NextResponse } from "next/server";
import {
    calculateMargin,
    calculatePriceFromMargin,
    getMarginGrade,
    COUPANG_COMMISSION_RATES,
    type MarginCalculatorInput,
    type PriceFromMarginInput,
} from "@/lib/margin-calculator";

/**
 * POST /api/margin-calculator
 * 마진 계산 API
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mode = "calculate", ...params } = body;

        if (mode === "calculate") {
            // 마진 계산 모드
            const input: MarginCalculatorInput = {
                costPrice: Number(params.costPrice) || 0,
                sellingPrice: Number(params.sellingPrice) || 0,
                category: params.category,
                customCommissionRate: params.customCommissionRate ? Number(params.customCommissionRate) : undefined,
                shippingCost: Number(params.shippingCost) || 0,
                packagingCost: Number(params.packagingCost) || 0,
                advertisingCost: Number(params.advertisingCost) || 0,
                otherCosts: Number(params.otherCosts) || 0,
                quantity: Number(params.quantity) || 1,
            };

            if (input.costPrice <= 0) {
                return NextResponse.json(
                    { error: "원가는 0보다 커야 합니다." },
                    { status: 400 }
                );
            }

            if (input.sellingPrice <= 0) {
                return NextResponse.json(
                    { error: "판매가는 0보다 커야 합니다." },
                    { status: 400 }
                );
            }

            const result = calculateMargin(input);
            const grade = getMarginGrade(result.netMarginRate);

            // minPriceForMargin 함수는 JSON으로 직렬화 불가, 주요 마진 가격만 계산하여 포함
            const targetMarginPrices = {
                margin10: result.minPriceForMargin(10),
                margin15: result.minPriceForMargin(15),
                margin20: result.minPriceForMargin(20),
                margin25: result.minPriceForMargin(25),
                margin30: result.minPriceForMargin(30),
            };

            return NextResponse.json({
                success: true,
                mode: "calculate",
                result: {
                    ...result,
                    minPriceForMargin: targetMarginPrices,
                    grade,
                },
            });

        } else if (mode === "reverse") {
            // 목표 마진으로 판매가 역산 모드
            const input: PriceFromMarginInput = {
                costPrice: Number(params.costPrice) || 0,
                targetMarginRate: Number(params.targetMarginRate) || 20,
                category: params.category,
                customCommissionRate: params.customCommissionRate ? Number(params.customCommissionRate) : undefined,
                shippingCost: Number(params.shippingCost) || 0,
                packagingCost: Number(params.packagingCost) || 0,
                advertisingCost: Number(params.advertisingCost) || 0,
                otherCosts: Number(params.otherCosts) || 0,
            };

            if (input.costPrice <= 0) {
                return NextResponse.json(
                    { error: "원가는 0보다 커야 합니다." },
                    { status: 400 }
                );
            }

            try {
                const result = calculatePriceFromMargin(input);
                const grade = getMarginGrade(result.expectedNetMarginRate);

                return NextResponse.json({
                    success: true,
                    mode: "reverse",
                    result: {
                        recommendedPrice: result.recommendedPrice,
                        expectedNetProfit: result.expectedNetProfit,
                        expectedNetMarginRate: result.expectedNetMarginRate,
                        grade,
                        breakdown: {
                            costPrice: result.breakdownDetails.costPrice,
                            commissionRate: result.breakdownDetails.commissionRate,
                            commissionAmount: result.breakdownDetails.commissionAmount,
                            settlementFee: result.breakdownDetails.settlementFee,
                            shippingCost: result.breakdownDetails.shippingCost,
                            packagingCost: result.breakdownDetails.packagingCost,
                            advertisingCost: result.breakdownDetails.advertisingCost,
                            otherCosts: result.breakdownDetails.otherCosts,
                            totalCosts: result.breakdownDetails.totalCosts,
                        },
                    },
                });
            } catch (error: any) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { error: "유효하지 않은 mode입니다. 'calculate' 또는 'reverse'를 사용하세요." },
            { status: 400 }
        );

    } catch (error: any) {
        console.error("마진 계산 오류:", error);
        return NextResponse.json(
            { error: error.message || "마진 계산 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}

/**
 * GET /api/margin-calculator
 * 카테고리별 수수료율 목록 조회
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        categories: Object.entries(COUPANG_COMMISSION_RATES).map(([name, rate]) => ({
            name,
            rate,
        })),
    });
}
