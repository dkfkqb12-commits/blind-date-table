# 블라인드 테이블 (가상 소개팅 시제품)

얼굴 대신 캐릭터로 만나는 1:1 가상 소개팅 웹앱 MVP.

## 실행
```bash
npm install
npm start                      # http://localhost:8080
cloudflared tunnel --url http://localhost:8080   # 폰 테스트용 HTTPS 주소 발급
```
폰 카메라는 HTTPS(또는 localhost)에서만 켜지므로, 폰으로 테스트하려면 터널/배포 주소가 필요합니다.

## 구조
- `server.js` — Express 정적 서버 + WebSocket(`/ws`) 방 관리(장소:테이블당 최대 2명), 표정 데이터 중계, WebRTC 시그널링, 💗 매칭
- `public/app.js` — 입장 화면, MediaPipe Face Landmarker(브라우저 내 얼굴 추적), 표정 숫자 전송(20fps), WebRTC 음성
- `public/avatar.js` — 2D 캐릭터(동자승/단발/긴머리/고양이) 렌더링: 눈 깜빡임, 입 벌림, 미소, 눈썹, 시선, 고개 좌우·끄덕·기울기
- `public/venue.js` — 카페/식당/술집 배경과 테이블 번호
- `test-ws.mjs`, `test/browser-test.mjs` — 서버/브라우저 자동 테스트

카메라 영상은 전송되지 않습니다. 오디오 트랙만 WebRTC로 보내고, 얼굴은 숫자 12개(표정·고개 각도)만 서버를 거쳐 상대에게 전달됩니다.
