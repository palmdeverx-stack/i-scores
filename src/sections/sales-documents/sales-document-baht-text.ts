const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

function spellThaiNumber(value: number, followsMillion = false): string {
  if (value >= 1_000_000) {
    const remainder = value % 1_000_000;
    return (
      spellThaiNumber(Math.floor(value / 1_000_000)) +
      'ล้าน' +
      (remainder ? spellThaiNumber(remainder, true) : '')
    );
  }

  if (value === 0) return digits[0];
  const characters = String(value);
  return [...characters]
    .map((character, index) => {
      const digit = Number(character);
      const place = characters.length - index - 1;
      if (digit === 0) return '';
      if (place === 1 && digit === 1) return 'สิบ';
      if (place === 1 && digit === 2) return 'ยี่สิบ';
      if (place === 0 && digit === 1 && (characters.length > 1 || followsMillion)) return 'เอ็ด';
      return digits[digit] + places[place];
    })
    .join('');
}

export function salesDocumentBahtText(amountSatang: number) {
  const baht = Math.floor(amountSatang / 100);
  const satang = amountSatang % 100;
  const whole = baht || !satang ? spellThaiNumber(baht) + 'บาท' : '';
  return whole + (satang ? spellThaiNumber(satang) + 'สตางค์' : 'ถ้วน');
}
