const ARABIC_TO_THAI: Record<string, string> = {
  '0': '๐',
  '1': '๑',
  '2': '๒',
  '3': '๓',
  '4': '๔',
  '5': '๕',
  '6': '๖',
  '7': '๗',
  '8': '๘',
  '9': '๙',
};

const THAI_TO_ARABIC = Object.fromEntries(
  Object.entries(ARABIC_TO_THAI).map(([arabic, thai]) => [thai, arabic])
);

export function formatNumerals(value: string | number, style?: 'arabic' | 'thai') {
  const text = String(value);
  if (style === 'thai') return text.replace(/[0-9]/g, (digit) => ARABIC_TO_THAI[digit]);
  return text.replace(/[๐-๙]/g, (digit) => THAI_TO_ARABIC[digit]);
}
