import React, { useState, useEffect } from 'react';
import { Building2, X, Check, Save, User, MapPin, Phone, Calendar, Briefcase, FileText, AlertTriangle, ShieldAlert, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { CompanyInfo } from '../types';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyInfo: CompanyInfo;
  onSaveCompanyInfo: (company: CompanyInfo) => void;
  onResetAllData?: () => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  companyInfo,
  onSaveCompanyInfo,
  onResetAllData,
}) => {
  const [formData, setFormData] = useState<CompanyInfo>(companyInfo);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  useEffect(() => {
    setFormData(companyInfo);
    setShowDangerZone(false);
    setResetConfirmInput('');
  }, [companyInfo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCompanyInfo(formData);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 500);
  };

  const handleClear = () => {
    if (window.confirm('会社情報をすべて消去して空にしますか？')) {
      const cleared: CompanyInfo = {
        name: '',
        representative: '',
        address: '',
        phone: '',
        fiscalMonth: 3,
        taxOffice: '',
        advisorTaxAccountant: '',
        notes: '',
      };
      setFormData(cleared);
      onSaveCompanyInfo(cleared);
    }
  };

  const handleExecuteFullReset = () => {
    if (resetConfirmInput !== 'クリア') {
      alert('確認のため入力欄に「クリア」と入力してください。');
      return;
    }
    const confirmed = window.confirm(
      '【最終警告・完全初期化】\n本当にすべての物件データ、取引履歴、事業年度をリセットして初期サンプル状態に戻しますか？\nこの操作は取り消せません。'
    );
    if (confirmed && onResetAllData) {
      onResetAllData();
      alert('全データを初期化しました。');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 bg-white text-slate-900 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                会社・顧問先情報の設定
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                対象企業・顧問先の基本情報および決算・税務情報の管理
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
            {/* 会社名 / 屋号 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                会社名・商号 / 顧問先名 <span className="text-slate-400 text-[10px]">(未設定可)</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 株式会社〇〇不動産開発"
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 代表者名 & 決算月 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  代表者名
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={formData.representative || ''}
                    onChange={e => setFormData({ ...formData, representative: e.target.value })}
                    placeholder="例: 代表取締役 山田 太郎"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  決算月
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    value={formData.fiscalMonth || 3}
                    onChange={e => setFormData({ ...formData, fiscalMonth: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>
                        {m}月 決算
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 本社所在地 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                本社所在地
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="例: 東京都港区六本木1丁目..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 電話番号 & 所轄税務署 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  電話番号
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="例: 03-1234-5678"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  所轄税務署
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={formData.taxOffice || ''}
                    onChange={e => setFormData({ ...formData, taxOffice: e.target.value })}
                    placeholder="例: 芝税務署"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 担当税理士・会計事務所名 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                担当税理士・会計事務所名
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={formData.advisorTaxAccountant || ''}
                  onChange={e =>
                    setFormData({ ...formData, advisorTaxAccountant: e.target.value })
                  }
                  placeholder="例: 税理士法人〇〇パートナーズ"
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 備考メモ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                税務・事業メモ
              </label>
              <textarea
                rows={2}
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="事業規模、消費税免税・簡易課税区分、特記事項など"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* 高度な管理・データ初期化 (誤爆防止) */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDangerZone(!showDangerZone)}
                className="text-[11px] text-slate-500 hover:text-red-600 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer py-1"
              >
                {showDangerZone ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>高度な設定・システム全データの初期化</span>
              </button>

              {showDangerZone && (
                <div className="mt-2 p-3 bg-red-50/60 border border-red-200 rounded-lg space-y-2.5">
                  <div className="flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-red-900">
                        全データ完全リセット（初期化）
                      </h4>
                      <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">
                        登録されているすべての物件データ、売買取引、仕入費用、事業年度を初期サンプル状態にリセットします。誤爆防止のため、下の欄に「<strong>クリア</strong>」と入力してください。
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      value={resetConfirmInput}
                      onChange={e => setResetConfirmInput(e.target.value)}
                      placeholder="「クリア」と入力"
                      className="px-2.5 py-1 text-xs bg-white border border-red-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-hidden font-bold text-red-900 placeholder:text-red-300 w-36"
                    />
                    <button
                      type="button"
                      disabled={resetConfirmInput !== 'クリア'}
                      onClick={handleExecuteFullReset}
                      className={`px-3 py-1 text-xs font-bold rounded flex items-center space-x-1 transition-colors ${
                        resetConfirmInput === 'クリア'
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xs cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>全データを初期化実行</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
            >
              会社情報を消去
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                {isSavedNotice ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavedNotice ? '保存完了' : '設定を保存'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
