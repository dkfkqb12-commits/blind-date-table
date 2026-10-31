// Pluggable identity check. The test adapter is what ships today.
// A PortOne (아임포트) PASS / phone adapter can implement the same verify() shape later.

export const ADULT_AGE = 19;

export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('82')) d = `0${d.slice(2)}`;
  if (d.length === 10 && d.startsWith('10')) d = `0${d}`;
  if (!/^01[016789]\d{7,8}$/.test(d)) return null;
  return d;
}

export function ageOn(birthdate, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthdate || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  let age = today.getFullYear() - y;
  const todayMd = (today.getMonth() + 1) * 100 + today.getDate();
  if (todayMd < mo * 100 + d) age -= 1;
  return age;
}

/**
 * @param {{ mode?: 'test'|'portone' }} [opts]
 * @returns {{ mode: string, label: string, verify: Function }}
 */
export function createVerifier(opts = {}) {
  const mode = opts.mode === 'portone' ? 'portone' : 'test';
  return {
    mode,
    label: mode === 'test' ? '테스트 인증' : 'PASS',
    async verify({ name, birthdate, phone }) {
      if (mode !== 'test') {
        return { ok: false, error: 'PASS 본인인증은 아직 연결되지 않았어요. 테스트 인증을 이용해 주세요.' };
      }
      const cleanName = String(name || '').trim();
      if (cleanName.length < 2 || cleanName.length > 20) return { ok: false, error: '이름을 입력해주세요' };
      const age = ageOn(birthdate);
      if (age == null) return { ok: false, error: '생년월일을 확인해주세요' };
      if (age < ADULT_AGE) return { ok: false, error: '만 19세 이상만 이용할 수 있어요' };
      const normalized = normalizePhone(phone);
      if (!normalized) return { ok: false, error: '휴대폰 번호를 확인해주세요' };
      return { ok: true, name: cleanName, birthdate: String(birthdate), phone: normalized, age };
    },
  };
}
