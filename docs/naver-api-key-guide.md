# 네이버 쇼핑 인사이트 / DataLab API 키 발급 가이드

이 문서는 이 프로젝트에서 사용하는 **네이버 쇼핑 인사이트 / DataLab Open API**의  
`NAVER_API_CLIENT_ID`, `NAVER_API_CLIENT_SECRET` 발급 및 설정 방법을 정리한 가이드입니다.

프로젝트 코드에서는 다음 환경 변수를 사용합니다:

- `NAVER_API_CLIENT_ID`
- `NAVER_API_CLIENT_SECRET`

실제 호출 코드는 `src/lib/naver.ts` 를 참고하세요.

---

## 1. 네이버 개발자 센터 가입 및 로그인

1. 브라우저에서 `https://developers.naver.com` 접속
2. 네이버 계정으로 로그인
3. 약관 동의 및 기본 정보 입력 후 개발자 등록을 완료합니다.

---

## 2. 애플리케이션 등록

1. 상단 메뉴에서 **내 애플리케이션** 클릭  
   (`https://developers.naver.com/apps/#/list`)
2. 우측 상단의 **애플리케이션 등록** 버튼 클릭
3. 아래 항목을 채웁니다:
   - **애플리케이션 이름**: 예) `TrendWhiz Naver Datalab`
   - **사용 API**:
     - `검색 > 데이터랩 쇼핑 인사이트` (이름은 콘솔에서 약간 다를 수 있습니다)
   - **환경**:
     - 이 프로젝트는 서버사이드에서만 사용하므로, 일반적으로 **웹 서버** 환경을 선택
   - **서비스 URL / Callback URL**:
     - DataLab API는 별도의 콜백을 사용하지 않지만, 필수 항목인 경우 프로젝트의 도메인을 임시로 기입 (예: `http://localhost:8080` 또는 나중에 연결할 실제 도메인)
4. 아래 약관에 동의하고 **등록** 버튼을 눌러 앱을 생성합니다.

---

## 3. Client ID / Client Secret 확인

1. **내 애플리케이션** 목록에서 방금 만든 앱을 클릭
2. 상세 화면의 상단에서 다음 값을 확인할 수 있습니다:
   - `Client ID`
   - `Client Secret`
3. 이 두 값을 안전한 곳에 복사해 둡니다.

이 값들이 프로젝트에서 사용하는:

- `NAVER_API_CLIENT_ID`  ← Client ID
- `NAVER_API_CLIENT_SECRET`  ← Client Secret

에 매핑됩니다.

---

## 4. 로컬 개발 환경 변수 설정 (.env.local)

Next.js 프로젝트에서는 **루트 디렉터리**에 `.env.local` 파일을 생성하고, 아래처럼 값을 설정합니다.

```env
NAVER_API_CLIENT_ID=여기에_발급받은_Client_ID
NAVER_API_CLIENT_SECRET=여기에_발급받은_Client_Secret
```

이 프로젝트에서는 `src/lib/naver.ts` 에서:

```ts
const NAVER_CLIENT_ID = process.env.NAVER_API_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_API_CLIENT_SECRET;
```

형태로 읽어옵니다.  
따라서 환경 변수 이름은 반드시 **`NAVER_API_CLIENT_ID` / `NAVER_API_CLIENT_SECRET`** 여야 합니다.

`.env.local` 파일은 git에 커밋하지 않도록 `.gitignore` 에 포함되어 있습니다.

---

## 5. 배포환경(Vercel 등) 환경 변수 설정

### 5.1 Vercel에 설정하는 경우

1. Vercel 대시보드에서 해당 프로젝트 선택
2. 상단 탭에서 **Settings** → **Environment Variables** 이동
3. 아래 항목을 추가합니다:
   - `NAVER_API_CLIENT_ID` = (발급받은 Client ID)
   - `NAVER_API_CLIENT_SECRET` = (발급받은 Client Secret)
4. 저장 후, 변경사항을 반영하려면 다시 배포(또는 Redeploy)합니다.

### 5.2 기타 배포 환경

Cloudflare Pages, Netlify, Render 등 다른 호스팅을 사용할 경우에도  
대시보드의 환경 변수 설정 메뉴에서 동일한 이름으로 값을 넣어주면 됩니다.

---

## 6. 권장 사용 제한 및 주의사항

- **일일 / 분당 호출 제한**:  
  Naver DataLab API는 요금제/정책에 따라 호출 제한이 있습니다.  
  대량 테스트 시 제한을 초과하지 않도록 주의하세요.

- **도메인 / IP 제한 설정**:  
  필요 시 네이버 개발자 센터에서 허용 도메인/서버 IP를 제한해  
  키가 외부에서 악용되지 않도록 설정할 수 있습니다.

- **비공개 유지**:  
  `Client ID`, `Client Secret`은 절대 프론트엔드 번들에 포함되면 안 됩니다.  
  이 프로젝트에서는 Next.js 서버 라우트(`/api/datalab/...`)와 `lib` 계층에서만 사용되도록 구성되어 있습니다.

---

## 7. 정상 동작 확인 방법

1. `.env.local` 에 값을 설정하고 개발 서버를 실행합니다.

```bash
npm run dev
```

2. 브라우저에서 네이버 DataLab을 사용하는 페이지/도구 (예: 키워드 랩, 트렌드 분석 페이지)를 열어봅니다.
3. 콘솔 오류가 없고, 네이버 쇼핑 인사이트 데이터가 정상적으로 불러와지면 설정이 완료된 것입니다.
4. 문제가 발생하면:
   - 환경 변수 이름 오타 (`NAVER_API_CLIENT_ID`, `NAVER_API_CLIENT_SECRET`) 확인
   - 값이 올바른지, 앱에서 DataLab API 권한을 활성화했는지 확인
   - 서버 로그에 출력되는 에러 메시지(HTTP 4xx/5xx, 인증 오류 등)를 확인

---

이 문서를 따라 `NAVER_API_CLIENT_ID` / `NAVER_API_CLIENT_SECRET` 를 설정하면  
