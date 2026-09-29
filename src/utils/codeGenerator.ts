import { Property } from '../types';

/**
 * 新規物件の管理コードを自動生成
 * ルール:
 * - 「p-」を除外
 * - 西暦下2桁 + 001からの3桁通し番号 (例: 2026年なら 26001, 26002...)
 */
export function generateNextPropertyCode(existingProperties: Property[], baseDate?: string): string {
  const targetYear = baseDate ? new Date(baseDate).getFullYear() : new Date().getFullYear();
  const yearSuffix = (targetYear % 100).toString().padStart(2, '0'); // e.g. "26"

  // 既存の物件コードから、現在の西暦下2桁で始まる5桁以上の数字コードを抽出
  const currentYearCodes = existingProperties
    .map(p => p.code ? p.code.replace(/^P-?/i, '').trim() : '')
    .filter(c => c.startsWith(yearSuffix) && /^\d+$/.test(c))
    .map(c => {
      const numPart = parseInt(c.slice(2), 10);
      return isNaN(numPart) ? 0 : numPart;
    });

  const maxSeq = currentYearCodes.length > 0 ? Math.max(...currentYearCodes, 0) : 0;
  const nextSeq = maxSeq + 1;
  const nextSeqStr = nextSeq.toString().padStart(3, '0');

  return `${yearSuffix}${nextSeqStr}`;
}
