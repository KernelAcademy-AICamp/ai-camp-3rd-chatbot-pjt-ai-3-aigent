# 🚀 TrendWhiz 배포 가이드

이 문서는 TrendWhiz 애플리케이션을 Supabase에 배포하는 전체 과정을 안내합니다.

## 📋 배포 전 체크리스트

- [x] Supabase CLI 설치 완료 (v2.65.5)
- [x] GitHub 저장소 푸시 완료
- [ ] Supabase 계정 로그인
- [ ] API 키 준비 (네이버, Lovable)
- [ ] 데이터베이스 마이그레이션 적용
- [ ] Edge Functions 배포

---

## 🎯 빠른 시작 (자동 배포)

터미널에서 다음 명령어를 실행하세요:

```bash
./deploy.sh
```

위 스크립트가 자동으로 배포 과정을 안내합니다.

---

## 📖 수동 배포 (단계별 가이드)

### 1단계: Supabase 로그인

```bash
supabase login
```

- 브라우저가 열리면 Supabase 계정으로 로그인
- 터미널로 돌아와 인증 완료 확인

### 2단계: 프로젝트 연결

```bash
supabase link --project-ref pzcninyziugoqkzqauxe
```

- 프로젝트 ID: `pzcninyziugoqkzqauxe`
- 데이터베이스 비밀번호 입력 (Supabase 대시보드에서 확인)

### 3단계: 환경 변수 설정

#### 3-1. 네이버 API 키 설정

[네이버 개발자 센터](https://developers.naver.com/apps/#/register)에서 발급받은 키를 설정:

```bash
supabase secrets set NAVER_CLIENT_ID="발급받은_클라이언트_ID"
supabase secrets set NAVER_CLIENT_SECRET="발급받은_클라이언트_시크릿"
```

**네이버 API 신청 방법:**
1. 네이버 개발자 센터 접속
2. "애플리케이션 등록" 클릭
3. 애플리케이션 이름: "TrendWhiz"
4. 사용 API: "검색" 선택
5. 환경: "WEB 설정" 추가
6. 서비스 URL: `http://localhost:8080` (개발) 또는 실제 도메인

#### 3-2. Lovable AI API 키 설정

[Lovable 대시보드](https://lovable.dev/settings/api-keys)에서 발급받은 키를 설정:

```bash
supabase secrets set LOVABLE_API_KEY="발급받은_API_키"
```

**Lovable API 키 발급:**
1. Lovable 로그인
2. Settings → API Keys 메뉴
3. "Create New API Key" 클릭
4. 키 복사 (한 번만 표시됩니다!)

#### 3-3. (선택) 커스텀 도메인 설정

프로덕션 도메인이 있다면:

```bash
supabase secrets set ALLOWED_ORIGIN="https://your-domain.com"
```

#### 3-4. 환경 변수 확인

```bash
supabase secrets list
```

### 4단계: 데이터베이스 마이그레이션 적용

```bash
supabase db push
```

**적용되는 마이그레이션:**
- RLS 정책 업데이트 (SELECT, INSERT, DELETE, UPDATE)
- 인덱스 생성 (user_id, created_at)
- 복합 인덱스 (성능 최적화)

### 5단계: Edge Functions 배포

```bash
# 시계열 예측 함수
supabase functions deploy predict-trend

# AI 트렌드 분석 함수
supabase functions deploy analyze-trends

# 네이버 데이터랩 연동 함수
supabase functions deploy naver-trend
```

### 6단계: 배포 확인

#### 6-1. Functions 상태 확인

```bash
supabase functions list
```

예상 출력:
```
┌───────────────┬─────────┬──────────────────────┐
│ NAME          │ STATUS  │ LAST DEPLOYED        │
├───────────────┼─────────┼──────────────────────┤
│ predict-trend │ ACTIVE  │ 2025-12-07 12:00:00  │
│ analyze-trends│ ACTIVE  │ 2025-12-07 12:01:00  │
│ naver-trend   │ ACTIVE  │ 2025-12-07 12:02:00  │
└───────────────┴─────────┴──────────────────────┘
```

#### 6-2. 로그 확인

```bash
# 실시간 로그 확인
supabase functions logs predict-trend --follow

# 특정 함수의 최근 로그
supabase functions logs analyze-trends
```

#### 6-3. 애플리케이션 테스트

1. 브라우저에서 http://localhost:8080/ 열기
2. 회원가입/로그인
3. 분석 기간 선택 (예: 최근 1년)
4. 카테고리 선택 (예: 생활용품)
5. "분석 시작" 클릭
6. 결과 확인:
   - ✅ TOP 10 유망 키워드 표시
   - ✅ 트렌드 차트 (실제 + 예측)
   - ✅ AI 예측 인사이트
   - ✅ 성장률, 신뢰도, 추천 시기

---

## 🔧 문제 해결

### 문제 1: "Access token not provided" 오류

**원인**: Supabase 로그인이 안 되어 있음

**해결**:
```bash
supabase login
```

### 문제 2: "Project not linked" 오류

**원인**: 프로젝트 연결이 안 되어 있음

**해결**:
```bash
supabase link --project-ref pzcninyziugoqkzqauxe
```

### 문제 3: Edge Function 배포 실패

**원인**: 환경 변수 미설정 또는 문법 오류

**해결**:
1. 환경 변수 확인: `supabase secrets list`
2. 로그 확인: `supabase functions logs <function-name>`
3. 로컬 테스트: `supabase functions serve <function-name>`

### 문제 4: "API credentials not configured" 오류

**원인**: NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 미설정

**해결**:
```bash
supabase secrets set NAVER_CLIENT_ID="your_id"
supabase secrets set NAVER_CLIENT_SECRET="your_secret"
```

### 문제 5: "AI credits exhausted" 오류

**원인**: Lovable AI 크레딧 부족

**해결**:
- Lovable 대시보드에서 크레딧 충전
- 무료 티어: 월 1,000 요청
- 유료 플랜으로 업그레이드 고려

---

## 📊 배포 후 모니터링

### 성능 모니터링

```bash
# 함수별 성능 확인
supabase functions logs predict-trend | grep "ms"
```

### 에러 모니터링

```bash
# 에러 로그만 필터링
supabase functions logs analyze-trends | grep "error"
```

### 사용량 확인

Supabase 대시보드 → Database → Usage:
- 데이터베이스 크기
- API 요청 수
- 대역폭 사용량

---

## 🌐 프로덕션 배포 (Vercel)

### 1. Vercel 프로젝트 생성

```bash
# Vercel CLI 설치
npm install -g vercel

# Vercel 로그인
vercel login

# 프로젝트 배포
vercel
```

### 2. 환경 변수 설정

Vercel 대시보드 → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://pzcninyziugoqkzqauxe.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 3. 프로덕션 도메인 CORS 설정

```bash
supabase secrets set ALLOWED_ORIGIN="https://your-vercel-domain.vercel.app"
```

### 4. Edge Functions 재배포

CORS 설정 변경 후 재배포:

```bash
supabase functions deploy predict-trend --no-verify-jwt
supabase functions deploy analyze-trends --no-verify-jwt
supabase functions deploy naver-trend --no-verify-jwt
```

---

## 📝 체크리스트 (배포 완료 후)

- [ ] Supabase Functions 3개 모두 ACTIVE 상태
- [ ] 데이터베이스 마이그레이션 적용 완료
- [ ] 로컬 환경에서 전체 기능 테스트 완료
- [ ] 회원가입/로그인 동작 확인
- [ ] 트렌드 분석 기능 동작 확인
- [ ] 예측 기능 동작 확인
- [ ] 엑셀/PDF 내보내기 동작 확인
- [ ] 경쟁 분석 기능 동작 확인
- [ ] 마진 계산기 동작 확인

---

## 🔐 보안 체크리스트

- [x] `.env` 파일 git에서 제외
- [x] CORS 화이트리스트 설정
- [x] 입력 검증 구현
- [x] RLS 정책 적용
- [x] 에러 메시지 sanitization
- [ ] HTTPS 사용 (프로덕션)
- [ ] API 요청 제한 (Rate Limiting) 설정 고려

---

## 📞 지원

문제가 발생하면:
1. [SECURITY_FIXES.md](./SECURITY_FIXES.md) 참조
2. [CLAUDE.md](./CLAUDE.md) 개발 가이드 참조
3. Supabase 로그 확인: `supabase functions logs <name>`
4. GitHub Issues에 문의

---

**배포 성공을 기원합니다! 🚀**
