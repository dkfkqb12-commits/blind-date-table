import crypto from 'crypto';

export const REGION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MANNER_START = 36.5;
export const MANNER_MIN = 30;
export const REPORT_LIMIT = 3;

const MANNER_DELTA = { good: 0.4, ok: 0, bad: -1.2, noshow: -2 };
export const REPORT_REASONS = ['sexual', 'scam', 'minor', 'abuse', 'other'];

const users = new Map();
const tokens = new Map();
const phoneOwner = new Map();
const suspendedPhones = new Set();
const reports = [];
const blocks = new Set();
const ratings = new Set();

function id() {
  return crypto.randomBytes(16).toString('hex');
}

export function resetStore() {
  users.clear();
  tokens.clear();
  phoneOwner.clear();
  suspendedPhones.clear();
  reports.length = 0;
  blocks.clear();
  ratings.clear();
}

export function createUser() {
  const user = {
    id: id(),
    token: id() + id(),
    nick: '',
    gender: '',
    birthYear: null,
    region: null,
    verified: false,
    phone: '',
    legalName: '',
    birthdate: '',
    suspended: false,
    suspendReason: '',
    manner: MANNER_START,
    createdAt: Date.now(),
  };
  users.set(user.id, user);
  tokens.set(user.token, user.id);
  return user;
}

export function userByToken(token) {
  if (!token) return null;
  const uid = tokens.get(String(token));
  return uid ? users.get(uid) || null : null;
}

export function userById(uid) {
  return users.get(uid) || null;
}

export function isRegionFresh(user, now = Date.now()) {
  return !!(user?.region && now <= user.region.expiresAt);
}

export function isReady(user, now = Date.now()) {
  if (!user || user.suspended) return false;
  if (!user.verified || !user.phone) return false;
  if (!user.nick || !user.gender || !user.birthYear) return false;
  if (!isRegionFresh(user, now)) return false;
  if (user.manner < MANNER_MIN) return false;
  return true;
}

export function entryBlock(user, now = Date.now()) {
  if (!user) return '로그인이 필요해요';
  if (user.suspended) return '신고가 누적되어 이용이 제한됐어요';
  if (user.manner < MANNER_MIN) return '매너 온도가 낮아 테이블에 들어갈 수 없어요';
  if (!user.verified) return '만 19세 본인 인증 후 입장할 수 있어요';
  if (!user.region) return '동네 인증 후 입장할 수 있어요';
  if (!isRegionFresh(user, now)) return '동네 인증이 만료됐어요. 다시 인증해주세요';
  if (!user.nick) return '닉네임을 입력해주세요';
  return null;
}

export function publicUser(user, now = Date.now()) {
  if (!user) return null;
  return {
    id: user.id,
    nick: user.nick,
    gender: user.gender,
    birthYear: user.birthYear,
    region: user.region ? { id: user.region.id, name: user.region.name, verifiedAt: user.region.verifiedAt, expiresAt: user.region.expiresAt } : null,
    regionFresh: isRegionFresh(user, now),
    verified: user.verified,
    phoneMasked: user.phone ? `${user.phone.slice(0, 3)}-****-${user.phone.slice(-4)}` : '',
    manner: user.manner,
    suspended: user.suspended,
    ready: isReady(user, now),
  };
}

export function saveProfile(user, { nick, gender, birthYear }) {
  const name = String(nick || '').trim().slice(0, 12);
  if (name.length < 1) return { ok: false, error: '닉네임을 입력해주세요' };
  const g = String(gender || '');
  if (!['female', 'male', 'other'].includes(g)) return { ok: false, error: '성별을 선택해주세요' };
  const year = Number(birthYear);
  const max = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1940 || year > max) return { ok: false, error: '태어난 해를 확인해주세요' };
  user.nick = name;
  user.gender = g;
  user.birthYear = year;
  return { ok: true };
}

export function markVerified(user, { name, birthdate, phone }) {
  if (suspendedPhones.has(phone)) return { ok: false, error: '이용이 제한된 번호예요' };
  const owner = phoneOwner.get(phone);
  if (owner && owner !== user.id) return { ok: false, error: '이미 다른 계정에서 인증된 번호예요' };
  if (user.phone && user.phone !== phone) phoneOwner.delete(user.phone);
  const year = Number(String(birthdate).slice(0, 4));
  if (user.birthYear && user.birthYear !== year) return { ok: false, error: '프로필의 태어난 해와 생년월일이 달라요' };
  phoneOwner.set(phone, user.id);
  user.phone = phone;
  user.legalName = name;
  user.birthdate = birthdate;
  user.verified = true;
  if (!user.birthYear) user.birthYear = year;
  return { ok: true };
}

export function setRegion(user, region, now = Date.now()) {
  user.region = {
    id: region.id,
    name: region.name,
    verifiedAt: now,
    expiresAt: now + REGION_TTL_MS,
  };
  return user.region;
}

export function isBlocked(a, b) {
  if (!a || !b || a === b) return false;
  return blocks.has(`${a}>${b}`) || blocks.has(`${b}>${a}`);
}

export function blockUser(fromId, targetId) {
  if (!users.has(fromId) || !users.has(targetId) || fromId === targetId) return { ok: false, error: '차단할 수 없어요' };
  blocks.add(`${fromId}>${targetId}`);
  return { ok: true };
}

export function addReport({ reporterId, targetId, reason, detail }) {
  if (!users.has(reporterId) || !users.has(targetId)) return { ok: false, error: '사용자를 찾을 수 없어요' };
  if (reporterId === targetId) return { ok: false, error: '본인을 신고할 수는 없어요' };
  if (!REPORT_REASONS.includes(reason)) return { ok: false, error: '신고 사유를 골라주세요' };
  const already = reports.some((r) => r.reporterId === reporterId && r.targetId === targetId);
  if (!already) {
    reports.push({
      id: id(),
      reporterId,
      targetId,
      reason,
      detail: String(detail || '').slice(0, 200),
      createdAt: Date.now(),
    });
  }
  const distinct = new Set(reports.filter((r) => r.targetId === targetId).map((r) => r.reporterId));
  let suspended = false;
  if (distinct.size >= REPORT_LIMIT) {
    suspend(targetId, '서로 다른 사용자의 신고 3회');
    suspended = true;
  }
  return { ok: true, suspended, count: distinct.size };
}

export function suspend(userId, reason) {
  const user = users.get(userId);
  if (!user) return;
  user.suspended = true;
  user.suspendReason = reason || '신고';
  if (user.phone) suspendedPhones.add(user.phone);
}

export function unsuspend(userId) {
  const user = users.get(userId);
  if (!user) return { ok: false, error: '사용자를 찾을 수 없어요' };
  user.suspended = false;
  user.suspendReason = '';
  if (user.phone) suspendedPhones.delete(user.phone);
  return { ok: true };
}

export function rateUser(fromId, targetId, score) {
  if (!MANNER_DELTA[score] && MANNER_DELTA[score] !== 0) return { ok: false, error: '평가를 골라주세요' };
  if (!users.has(fromId) || !users.has(targetId) || fromId === targetId) return { ok: false, error: '평가할 수 없어요' };
  const key = `${fromId}>${targetId}`;
  if (ratings.has(key)) return { ok: false, error: '이미 평가했어요' };
  const user = users.get(targetId);
  const next = Math.round((user.manner + MANNER_DELTA[score]) * 10) / 10;
  user.manner = Math.min(99, Math.max(0, next));
  ratings.add(key);
  return { ok: true, manner: user.manner };
}

export function listReports() {
  return reports.map((r) => {
    const target = users.get(r.targetId);
    const reporter = users.get(r.reporterId);
    return {
      ...r,
      targetNick: target?.nick || '',
      reporterNick: reporter?.nick || '',
      targetSuspended: !!target?.suspended,
      targetPhoneMasked: target?.phone ? `${target.phone.slice(0, 3)}-****-${target.phone.slice(-4)}` : '',
    };
  });
}

export function listSuspended() {
  return [...users.values()].filter((u) => u.suspended).map((u) => publicUser(u));
}
