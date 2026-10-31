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
- `public/app.js` — 입장·커스터마이즈, MediaPipe 얼굴/자세/손 추적(브라우저 안, 약 15–20fps), 숫자만 전송, WebRTC 음성
- `public/tracking.js` — Face / Pose / Hand 랜드마크를 팔 각도·손가락 굽힘으로 압축
- `public/avatar.js` — 상반신 웹툰풍 캐릭터(헤어 9종, 옷 8종, 안경·귀걸이·모자)와 어깨·팔·손 리그
- `public/venue.js` — 카페/식당/술집 배경과 테이블 번호
- `test/pose-math.mjs`, `test/browser-test.mjs` — 자세 수학 / 헤드리스 크롬 스모크 테스트

카메라 영상은 전송되지 않습니다. 오디오 트랙만 WebRTC로 보내고, 표정·고개·어깨·팔·손목·손가락은 숫자 배열로만 상대에게 전달됩니다. 손이나 모델이 없으면 손은 테이블 위 기본 자세로 돌아갑니다.
