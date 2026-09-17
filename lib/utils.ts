import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a numeric string or number into Indian comma format (e.g. 1,23,42,345.00)
 */
export function formatAmountWithCommas(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '';
  const str = String(value).replace(/,/g, '');
  if (str === '') return '';

  const parts = str.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

  if (!integerPart && decimalPart) return '0' + decimalPart;
  if (!integerPart) return '';

  // Indian number formatting:
  // Last 3 digits grouped, preceding digits grouped in pairs of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return formattedInt + decimalPart;
}

/**
 * Parses a comma-separated formatted amount string into a clean float number
 */
export function parseFormattedAmount(value: string | number): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

