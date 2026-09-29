import { Property, FiscalYear, CompanyInfo } from '../types';

export const initialCompanyInfo: CompanyInfo = {
  name: '',
  representative: '',
  address: '',
  phone: '',
  fiscalMonth: 3,
  taxOffice: '',
  advisorTaxAccountant: '',
  notes: '',
};

export const initialFiscalYears: FiscalYear[] = [
  {
    id: 'fy-1',
    name: '第1期 (2025/04/01 〜 2026/03/31) [当期]',
    periodNumber: 1,
    startDate: '2025-04-01',
    endDate: '2026-03-31',
    isCurrent: true,
  },
];

// サンプル物件データはすべて削除（空データ初期状態）
export const initialProperties: Property[] = [];
