// Blocks contact swapping until both people opt in.
// Returns a short reason code, or null when the text is fine to deliver.

const PHONE = /(?:\+?82)?01[016789]\d{7,8}/;
const LONG_DIGITS = /\d{10,}/;
const KAKAO = /카카오\s*톡|카카오톡|카톡|오픈\s*채팅|오픈채팅|kakaotalk|kakao/i;
const INSTA = /인스타(?:그램)?|instagram|(?:^|[\s,(])@[a-z0-9._]{3,}/i;
const URL = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|kr|net|me|io|co|gl|ly)\b/i;
const ACCOUNT = /계좌|은행\s*번호/;

export function contactKind(text) {
  const raw = String(text || '');
  const compact = raw.replace(/[\s.\-()]/g, '');
  if (PHONE.test(compact)) return 'phone';
  if (KAKAO.test(raw)) return 'kakao';
  if (INSTA.test(raw)) return 'instagram';
  if (URL.test(raw)) return 'url';
  if (ACCOUNT.test(raw) || LONG_DIGITS.test(compact)) return 'account';
  return null;
}
