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

function convertTwoDigits(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o > 0 ? `${tens[t]}-${ones[o]}` : tens[t];
}

function convertThreeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let res = '';
  if (h > 0) {
    res += `${ones[h]} Hundred`;
    if (rest > 0) res += ' ';
  }
  if (rest > 0) {
    res += convertTwoDigits(rest);
  }
  return res;
}

/**
 * Converts a number to words following Indian numbering system (Lakhs, Crores)
 * Example: 61000 => "Indian Rupee Sixty-One Thousand Only"
 */
export function numberToIndianWords(amount: number): string {
  if (amount === 0 || isNaN(amount)) {
    return 'Indian Rupee Zero Only';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return 'Indian Rupee Zero Only';
  }

  // Indian format splits:
  // Crores (>= 1,00,00,000)
  // Lakhs (>= 1,00,000)
  // Thousands (>= 1,000)
  // Hundreds (last 3 digits)

  let num = integerPart;
  const parts: string[] = [];

  const crores = Math.floor(num / 10000000);
  num %= 10000000;

  const lakhs = Math.floor(num / 100000);
  num %= 100000;

  const thousands = Math.floor(num / 1000);
  num %= 1000;

  const hundreds = num; // remaining 0-999

  if (crores > 0) {
    parts.push(`${convertThreeDigits(crores)} Crore`);
  }
  if (lakhs > 0) {
    parts.push(`${convertTwoDigits(lakhs)} Lakh`);
  }
  if (thousands > 0) {
    parts.push(`${convertTwoDigits(thousands)} Thousand`);
  }
  if (hundreds > 0) {
    parts.push(convertThreeDigits(hundreds));
  }

  let words = parts.join(' ').trim();
  if (!words) words = 'Zero';

  let result = `Indian Rupee ${words}`;

  if (decimalPart > 0) {
    const paiseWords = convertTwoDigits(decimalPart);
    result += ` and ${paiseWords} Paise`;
  }

  result += ' Only';

  if (isNegative) {
    result = `Minus ${result}`;
  }

  return result;
}

/**
 * Formats a number in Indian currency style (e.g., 61,000.00 or 1,25,000.50)
 */
export function formatIndianCurrency(amount: number, showSymbol: boolean = true): string {
  if (isNaN(amount)) return showSymbol ? '₹0.00' : '0.00';
  const isNegative = amount < 0;
  const abs = Math.abs(amount).toFixed(2);
  const [intPart, decPart] = abs.split('.');

  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const formatted = `${formattedInt}.${decPart}`;

  return `${isNegative ? '-' : ''}${showSymbol ? '₹' : ''}${formatted}`;
}

