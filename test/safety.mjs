import { regionFromPoint, listRegions } from '../server/regions.js';
import { ageOn, normalizePhone, createVerifier } from '../server/verify.js';
import { contactKind } from '../server/filter.js';
import {
  resetStore, createUser, saveProfile, markVerified, setRegion, entryBlock, addReport,
  rateUser, isBlocked, blockUser, MANNER_START, REPORT_LIMIT,
} from '../server/store.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok', msg);
}

const seoul = listRegions().filter((r) => r.name.startsWith('서울 '));
assert(seoul.length === 25, `25 Seoul districts (${seoul.length})`);
const gangnam = regionFromPoint(37.5172, 127.0473);
assert(gangnam?.name === '서울 강남구', `Gangnam → ${gangnam?.name}`);
assert(!('lat' in (gangnam || {})), 'region result has no coordinates');
assert(regionFromPoint(35.1796, 129.0756)?.name === '부산광역시', 'Busan metro');
assert(regionFromPoint(37.2636, 127.0286)?.name === '경기 수원시', 'Suwon');
assert(regionFromPoint(37.5641, 126.9979)?.name === '서울 중구', 'Seoul Jung-gu');
assert(regionFromPoint(0, 0) === null, 'unknown point has no region');

const today = new Date(2026, 9, 31);
assert(ageOn('2007-10-31', today) === 19, 'turns 19 today');
assert(ageOn('2007-11-01', today) === 18, 'still 18 tomorrow-birthday');
assert(ageOn('1998-01-02', today) >= 19, 'adult');
assert(normalizePhone('010-1234-5678') === '01012345678', 'phone digits');
assert(normalizePhone('+82 10 1234 5678') === '01012345678', 'country code');
assert(normalizePhone('12345') === null, 'bad phone');

const verifier = createVerifier({ mode: 'test' });
const under = await verifier.verify({ name: '미성년', birthdate: '2010-01-01', phone: '01099998888' });
assert(!under.ok, `under 19 rejected (${under.error})`);
const adult = await verifier.verify({ name: '김성인', birthdate: '1995-04-12', phone: '010-1111-2222' });
assert(adult.ok && adult.phone === '01011112222', 'adult test verify');
const portone = await createVerifier({ mode: 'portone' }).verify({ name: '김성인', birthdate: '1995-04-12', phone: '01011112222' });
assert(!portone.ok, 'PASS adapter is not wired yet');

assert(contactKind('카톡 abcdef') === 'kakao', 'kakao');
assert(contactKind('인스타 @hello') === 'instagram', 'instagram');
assert(contactKind('https://example.com') === 'url', 'url');
assert(contactKind('제 번호 01012345678') === 'phone', 'phone in sentence');
assert(contactKind('계좌 110-123-456789') === 'account', 'account');
assert(contactKind('오늘 커피 맛있었어요') === null, 'normal chat');

resetStore();
const a = createUser();
const b = createUser();
saveProfile(a, { nick: '가', gender: 'female', birthYear: 1995 });
saveProfile(b, { nick: '나', gender: 'male', birthYear: 1994 });
assert(entryBlock(a).includes('인증'), 'unverified cannot enter');
const dup1 = markVerified(a, adult);
assert(dup1.ok, 'first phone claim');
const other = markVerified(b, { ...adult, birthdate: '1994-03-03' });
assert(!other.ok, `second account same phone blocked (${other.error})`);
markVerified(b, { name: '이나', birthdate: '1994-03-03', phone: '01033334444' });
setRegion(a, { id: 'seoul-gangnam', name: '서울 강남구' });
setRegion(b, { id: 'seoul-gangnam', name: '서울 강남구' });
assert(entryBlock(a) === null, 'verified adult in region can enter');
assert(a.manner === MANNER_START, 'manner starts at 36.5');

const reporters = [a, b];
for (let i = 0; i < REPORT_LIMIT - 2; i++) reporters.push(createUser());
const target = createUser();
saveProfile(target, { nick: '대상', gender: 'other', birthYear: 1990 });
markVerified(target, { name: '대상자', birthdate: '1990-01-01', phone: '01055556666' });
setRegion(target, { id: 'seoul-gangnam', name: '서울 강남구' });
let last;
for (const reporter of reporters) {
  last = addReport({ reporterId: reporter.id, targetId: target.id, reason: 'abuse' });
}
assert(last.suspended && target.suspended, '3 distinct reports suspend');
const reused = markVerified(createUser(), { name: '다른', birthdate: '1992-02-02', phone: '01055556666' });
assert(!reused.ok, 'suspended phone cannot verify again');

resetStore();
const p = createUser();
const q = createUser();
rateUser(p.id, q.id, 'bad');
rateUser(p.id, q.id, 'bad');
assert(q.manner < MANNER_START, `bad rating drops manner (${q.manner})`);
blockUser(p.id, q.id);
assert(isBlocked(p.id, q.id) && isBlocked(q.id, p.id), 'block is mutual for matching');

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('safety passed');
