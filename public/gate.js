// Onboarding: profile, test-mode 19+ check, and neighborhood verification.

const $ = (id) => document.getElementById(id);

export function authHeaders() {
  const token = localStorage.getItem('btToken') || '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function api(path, body) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (data.token) localStorage.setItem('btToken', data.token);
  return { status: res.status, ...data };
}

export function initGate(onReady) {
  let profileOk = false;
  let verified = false;
  let region = null;

  const showMsg = (text) => { $('gateMsg').textContent = text || ''; };
  const syncDone = () => {
    $('gateDone').disabled = !(profileOk && verified && region);
  };

  document.querySelectorAll('#genderOpts .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#genderOpts .chip').forEach((b) => b.classList.toggle('sel', b === btn));
    });
  });

  async function ensureSession() {
    const data = await api('/api/session', {});
    return data.user || null;
  }

  function applyKnown(user) {
    if (!user) return;
    if (user.nick) $('gateNick').value = user.nick;
    if (user.birthYear) $('gateYear').value = String(user.birthYear);
    if (user.gender) {
      document.querySelectorAll('#genderOpts .chip').forEach((b) => b.classList.toggle('sel', b.dataset.g === user.gender));
    }
    profileOk = !!(user.nick && user.gender && user.birthYear);
    verified = !!user.verified;
    region = user.regionFresh ? user.region : null;
    if (verified) $('verifyMsg').textContent = '테스트 인증이 완료됐어요.';
    if (region) $('regionResult').textContent = `${region.name} · 30일간 유지돼요`;
    if (user.suspended) showMsg('신고가 누적되어 이용이 제한됐어요');
    else if (user.manner < 30) showMsg(`매너 온도 ${user.manner.toFixed(1)}°C · 30°C 미만은 입장할 수 없어요`);
    syncDone();
    if (user.ready) onReady(user);
  }

  $('verifyBtn').addEventListener('click', async () => {
    showMsg('');
    const gender = document.querySelector('#genderOpts .chip.sel')?.dataset.g || '';
    const profile = await api('/api/profile', {
      nick: $('gateNick').value.trim(),
      gender,
      birthYear: Number($('gateYear').value),
    });
    if (!profile.user) { showMsg(profile.error || '프로필을 저장하지 못했어요'); profileOk = false; syncDone(); return; }
    profileOk = true;
    const checked = await api('/api/verify/test', {
      name: $('vName').value.trim(),
      birthdate: $('vBirth').value,
      phone: $('vPhone').value.trim(),
    });
    if (!checked.user) { showMsg(checked.error || '인증에 실패했어요'); verified = false; syncDone(); return; }
    verified = true;
    $('verifyMsg').textContent = '테스트 인증이 완료됐어요. 실제 PASS 인증은 나중에 연결됩니다.';
    if (checked.user.ready && checked.user.regionFresh) onReady(checked.user);
    syncDone();
  });

  $('geoBtn').addEventListener('click', () => {
    showMsg('');
    if (!navigator.geolocation) { showMsg('이 브라우저에서는 위치를 확인할 수 없어요'); return; }
    $('geoBtn').disabled = true;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      $('geoBtn').disabled = false;
      const data = await api('/api/region', { lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (!data.region) { showMsg(data.error || '동네를 확인하지 못했어요'); region = null; syncDone(); return; }
      region = data.region;
      $('regionResult').textContent = `${data.region.name} · 정확한 위치는 저장하지 않아요`;
      if (data.user?.ready) onReady(data.user);
      syncDone();
    }, () => {
      $('geoBtn').disabled = false;
      showMsg('위치 권한이 필요해요. 동네 이름만 서버에 저장됩니다.');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  });

  $('gateDone').addEventListener('click', async () => {
    const me = await api('/api/me');
    if (!me.user?.ready) { showMsg(me.error || '프로필, 만 19세 인증, 동네 인증이 모두 필요해요'); return; }
    onReady(me.user);
  });

  ensureSession().then(applyKnown).catch(() => showMsg('서버에 연결하지 못했어요'));
}
