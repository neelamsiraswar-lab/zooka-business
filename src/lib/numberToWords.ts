// Indian Number System to Words Converter (Rupees & Paise) for Cheques & Invoices

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertLessThanThousand(num: number): string {
  let str = '';
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ones[num] + ' ';
  }
  return str.trim();
}

export function numberToIndianWords(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const integerPart = Math.floor(absNum);
  const decimalPart = Math.round((absNum - integerPart) * 100);

  let crores = Math.floor(integerPart / 10000000);
  let remainingAfterCrores = integerPart % 10000000;

  let lakhs = Math.floor(remainingAfterCrores / 100000);
  let remainingAfterLakhs = remainingAfterCrores % 100000;

  let thousands = Math.floor(remainingAfterLakhs / 1000);
  let hundredsAndUnits = remainingAfterLakhs % 1000;

  let result = '';

  if (crores > 0) {
    result += convertLessThanThousand(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    result += convertLessThanThousand(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    result += convertLessThanThousand(thousands) + ' Thousand ';
  }
  if (hundredsAndUnits > 0) {
    result += convertLessThanThousand(hundredsAndUnits) + ' ';
  }

  result = result.trim();
  if (!result) {
    result = 'Zero';
  }

  let finalWords = `Rupees ${result}`;

  if (decimalPart > 0) {
    const paiseWords = convertLessThanThousand(decimalPart);
    finalWords += ` and ${paiseWords} Paise`;
  }

  finalWords += ' Only';

  return isNegative ? `Minus ${finalWords}` : finalWords;
}
