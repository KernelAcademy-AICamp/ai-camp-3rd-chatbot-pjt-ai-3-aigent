#!/bin/bash

# TrendWhiz Supabase 배포 스크립트
# 이 스크립트는 Supabase Edge Functions와 데이터베이스를 배포합니다.

set -e

echo "🚀 TrendWhiz Supabase 배포 시작..."
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Supabase 로그인 확인
echo -e "${BLUE}1️⃣  Supabase 로그인 확인...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase에 로그인되어 있지 않습니다.${NC}"
    echo -e "${YELLOW}   다음 명령어를 실행하여 로그인하세요:${NC}"
    echo -e "${GREEN}   supabase login${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 로그인 확인 완료${NC}"
echo ""

# 2. 프로젝트 연결 확인
echo -e "${BLUE}2️⃣  프로젝트 연결 확인...${NC}"
if [ ! -f .git/config ] || ! grep -q "supabase.co" .git/config 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Supabase 프로젝트가 연결되어 있지 않습니다.${NC}"
    echo -e "${YELLOW}   다음 명령어를 실행하여 프로젝트를 연결하세요:${NC}"
    echo -e "${GREEN}   supabase link --project-ref pzcninyziugoqkzqauxe${NC}"
    read -p "지금 연결하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase link --project-ref pzcninyziugoqkzqauxe
    else
        exit 1
    fi
fi
echo -e "${GREEN}✓ 프로젝트 연결 확인 완료${NC}"
echo ""

# 3. 환경 변수 확인
echo -e "${BLUE}3️⃣  환경 변수 설정 확인...${NC}"
echo -e "${YELLOW}⚠️  다음 환경 변수들이 설정되어 있어야 합니다:${NC}"
echo "   - NAVER_CLIENT_ID"
echo "   - NAVER_CLIENT_SECRET"
echo "   - LOVABLE_API_KEY"
echo ""
read -p "환경 변수를 설정하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -p "NAVER_CLIENT_ID: " naver_id
    read -p "NAVER_CLIENT_SECRET: " naver_secret
    read -p "LOVABLE_API_KEY: " lovable_key

    echo -e "${YELLOW}환경 변수 설정 중...${NC}"
    supabase secrets set NAVER_CLIENT_ID="$naver_id"
    supabase secrets set NAVER_CLIENT_SECRET="$naver_secret"
    supabase secrets set LOVABLE_API_KEY="$lovable_key"
    echo -e "${GREEN}✓ 환경 변수 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠️  환경 변수가 이미 설정되어 있다고 가정합니다.${NC}"
fi
echo ""

# 4. 데이터베이스 마이그레이션 적용
echo -e "${BLUE}4️⃣  데이터베이스 마이그레이션 적용...${NC}"
read -p "마이그레이션을 적용하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    supabase db push
    echo -e "${GREEN}✓ 마이그레이션 적용 완료${NC}"
else
    echo -e "${YELLOW}⚠️  마이그레이션 건너뛰기${NC}"
fi
echo ""

# 5. Edge Functions 배포
echo -e "${BLUE}5️⃣  Edge Functions 배포...${NC}"
echo "배포할 함수:"
echo "  - predict-trend (시계열 예측)"
echo "  - analyze-trends (AI 분석)"
echo "  - naver-trend (네이버 데이터랩)"
echo ""
read -p "Edge Functions를 배포하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}predict-trend 배포 중...${NC}"
    supabase functions deploy predict-trend

    echo -e "${YELLOW}analyze-trends 배포 중...${NC}"
    supabase functions deploy analyze-trends

    echo -e "${YELLOW}naver-trend 배포 중...${NC}"
    supabase functions deploy naver-trend

    echo -e "${GREEN}✓ Edge Functions 배포 완료${NC}"
else
    echo -e "${YELLOW}⚠️  Edge Functions 배포 건너뛰기${NC}"
fi
echo ""

# 6. 배포 완료
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}다음 단계:${NC}"
echo "1. Edge Functions 상태 확인:"
echo -e "   ${GREEN}supabase functions list${NC}"
echo ""
echo "2. 로그 확인:"
echo -e "   ${GREEN}supabase functions logs predict-trend${NC}"
echo ""
echo "3. 애플리케이션 테스트:"
echo -e "   ${GREEN}브라우저에서 http://localhost:8080/ 열기${NC}"
echo ""
echo -e "${YELLOW}📝 중요: .env 파일이 git에서 제외되었는지 확인하세요!${NC}"
echo ""
