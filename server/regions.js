// Offline region lookup. Centroids are approximate city/district centers.
// Only the region id and name ever leave this module — callers must not persist lat/lng.

const REGIONS = [
  // Seoul, all 25 gu
  { id: 'seoul-jongno', name: '서울 종로구', lat: 37.5730, lng: 126.9794, r: 3.6 },
  { id: 'seoul-jung', name: '서울 중구', lat: 37.5641, lng: 126.9979, r: 3.0 },
  { id: 'seoul-yongsan', name: '서울 용산구', lat: 37.5324, lng: 126.9907, r: 3.6 },
  { id: 'seoul-sd', name: '서울 성동구', lat: 37.5633, lng: 127.0371, r: 3.4 },
  { id: 'seoul-gwangjin', name: '서울 광진구', lat: 37.5385, lng: 127.0823, r: 3.4 },
  { id: 'seoul-ddm', name: '서울 동대문구', lat: 37.5744, lng: 127.0396, r: 3.6 },
  { id: 'seoul-jungnang', name: '서울 중랑구', lat: 37.6063, lng: 127.0927, r: 3.8 },
  { id: 'seoul-sb', name: '서울 성북구', lat: 37.5894, lng: 127.0167, r: 4.0 },
  { id: 'seoul-gangbuk', name: '서울 강북구', lat: 37.6396, lng: 127.0257, r: 3.8 },
  { id: 'seoul-dobong', name: '서울 도봉구', lat: 37.6688, lng: 127.0471, r: 3.8 },
  { id: 'seoul-nowon', name: '서울 노원구', lat: 37.6542, lng: 127.0568, r: 4.4 },
  { id: 'seoul-eunpyeong', name: '서울 은평구', lat: 37.6027, lng: 126.9291, r: 4.4 },
  { id: 'seoul-sdm', name: '서울 서대문구', lat: 37.5791, lng: 126.9368, r: 3.5 },
  { id: 'seoul-mapo', name: '서울 마포구', lat: 37.5663, lng: 126.9019, r: 3.8 },
  { id: 'seoul-yangcheon', name: '서울 양천구', lat: 37.5170, lng: 126.8665, r: 3.8 },
  { id: 'seoul-gangseo', name: '서울 강서구', lat: 37.5509, lng: 126.8495, r: 5.2 },
  { id: 'seoul-guro', name: '서울 구로구', lat: 37.4954, lng: 126.8874, r: 3.8 },
  { id: 'seoul-geumcheon', name: '서울 금천구', lat: 37.4569, lng: 126.8955, r: 3.4 },
  { id: 'seoul-ydp', name: '서울 영등포구', lat: 37.5264, lng: 126.8963, r: 3.8 },
  { id: 'seoul-dongjak', name: '서울 동작구', lat: 37.5124, lng: 126.9393, r: 3.6 },
  { id: 'seoul-gwanak', name: '서울 관악구', lat: 37.4784, lng: 126.9516, r: 4.0 },
  { id: 'seoul-seocho', name: '서울 서초구', lat: 37.4837, lng: 127.0324, r: 4.6 },
  { id: 'seoul-gangnam', name: '서울 강남구', lat: 37.5172, lng: 127.0473, r: 4.2 },
  { id: 'seoul-songpa', name: '서울 송파구', lat: 37.5145, lng: 127.1059, r: 4.8 },
  { id: 'seoul-gangdong', name: '서울 강동구', lat: 37.5301, lng: 127.1238, r: 4.2 },

  // Major Gyeonggi cities
  { id: 'gg-suwon', name: '경기 수원시', lat: 37.2636, lng: 127.0286, r: 9 },
  { id: 'gg-seongnam', name: '경기 성남시', lat: 37.4200, lng: 127.1265, r: 8 },
  { id: 'gg-goyang', name: '경기 고양시', lat: 37.6584, lng: 126.8320, r: 10 },
  { id: 'gg-yongin', name: '경기 용인시', lat: 37.2411, lng: 127.1776, r: 12 },
  { id: 'gg-bucheon', name: '경기 부천시', lat: 37.5034, lng: 126.7660, r: 6 },
  { id: 'gg-ansan', name: '경기 안산시', lat: 37.3219, lng: 126.8309, r: 8 },
  { id: 'gg-anyang', name: '경기 안양시', lat: 37.3943, lng: 126.9568, r: 6 },
  { id: 'gg-namyangju', name: '경기 남양주시', lat: 37.6360, lng: 127.2165, r: 12 },
  { id: 'gg-hwaseong', name: '경기 화성시', lat: 37.1995, lng: 126.8312, r: 14 },
  { id: 'gg-pyeongtaek', name: '경기 평택시', lat: 36.9921, lng: 127.1128, r: 12 },
  { id: 'gg-uijeongbu', name: '경기 의정부시', lat: 37.7381, lng: 127.0337, r: 6 },
  { id: 'gg-siheung', name: '경기 시흥시', lat: 37.3800, lng: 126.8030, r: 8 },
  { id: 'gg-paju', name: '경기 파주시', lat: 37.7599, lng: 126.7802, r: 12 },
  { id: 'gg-gwangmyeong', name: '경기 광명시', lat: 37.4786, lng: 126.8646, r: 5 },
  { id: 'gg-gimpo', name: '경기 김포시', lat: 37.6152, lng: 126.7156, r: 10 },
  { id: 'gg-gunpo', name: '경기 군포시', lat: 37.3615, lng: 126.9352, r: 4 },
  { id: 'gg-gwangju', name: '경기 광주시', lat: 37.4295, lng: 127.2550, r: 10 },
  { id: 'gg-hanam', name: '경기 하남시', lat: 37.5393, lng: 127.2149, r: 6 },

  // Metropolitan cities as a single region each
  { id: 'busan', name: '부산광역시', lat: 35.1796, lng: 129.0756, r: 22 },
  { id: 'daegu', name: '대구광역시', lat: 35.8714, lng: 128.6014, r: 18 },
  { id: 'incheon', name: '인천광역시', lat: 37.4563, lng: 126.7052, r: 16 },
  { id: 'gwangju-metro', name: '광주광역시', lat: 35.1595, lng: 126.8526, r: 14 },
  { id: 'daejeon', name: '대전광역시', lat: 36.3504, lng: 127.3845, r: 14 },
  { id: 'ulsan', name: '울산광역시', lat: 35.5384, lng: 129.3114, r: 16 },
  { id: 'sejong', name: '세종특별자치시', lat: 36.4801, lng: 127.2890, r: 12 },
];

function km(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function listRegions() {
  return REGIONS.map((r) => ({ id: r.id, name: r.name }));
}

/** @returns {{id:string,name:string}|null} */
export function regionFromPoint(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const here = { lat, lng };
  let best = null;
  for (const region of REGIONS) {
    const d = km(here, region);
    if (d > region.r) continue;
    if (!best || d < best.d - 0.05 || (Math.abs(d - best.d) <= 0.05 && region.r < best.region.r)) {
      best = { d, region };
    }
  }
  if (!best) return null;
  return { id: best.region.id, name: best.region.name };
}
