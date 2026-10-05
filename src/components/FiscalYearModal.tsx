import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  History,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { FiscalYear, Property, CompanyInfo } from '../types';
import { rolloverToNewFiscalYear } from '../utils/storage';
import {
  calculatePropertyFinancials,
  formatCurrency,
  calculateNextFiscalYearDates,
  estimateFiscalYearEndDate,
} from '../utils/calculations';

interface FiscalYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  fiscalYears: FiscalYear[];
  currentFY: FiscalYear;
  properties: Property[];
  companyInfo?: CompanyInfo;
  initialSubTab?: 'list' | 'create' | 'rollover';
  onFiscalYearsUpdated: (fiscalYears: FiscalYear[], properties: Property[], newFYId?: string) => void;
  onSelectFiscalYear: (fyId: string) => void;
}

export const FiscalYearModal: React.FC<FiscalYearModalProps> = ({
  isOpen,
  onClose,
  fiscalYears,
  currentFY,
  properties,
  companyInfo,
  initialSubTab,
  onFiscalYearsUpdated,
  onSelectFiscalYear,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create' | 'rollover'>('list');

  // New FY form state
  const [newPeriodNum, setNewPeriodNum] = useState<number>(1);
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [newEndDate, setNewEndDate] = useState<string>('');

  // 設定されている事業年度（または決算月）から新年度の開始日・終了日・期数を自動算出
  const resetToAutoCalculatedDates = () => {
    const calc = calculateNextFiscalYearDates(currentFY, companyInfo?.fiscalMonth);
    setNewPeriodNum(calc.periodNumber);
    setNewStartDate(calc.startDate);
    setNewEndDate(calc.endDate);
  };

  // モーダルオープン時または事業年度・初期タブ変更時に自動算出を同期
  useEffect(() => {
    if (isOpen) {
      if (initialSubTab) {
        setActiveSubTab(initialSubTab);
      }
      resetToAutoCalculatedDates();
    }
  }, [isOpen, currentFY, companyInfo?.fiscalMonth, initialSubTab]);

  // 開始日を手動で変更した場合、終了日を自動で1年後に推定調整
  const handleStartDateChange = (val: string) => {
    setNewStartDate(val);
    const estimated = estimateFiscalYearEndDate(val);
    if (estimated) {
      setNewEndDate(estimated);
    }
  };

  // Rollover Preview State
  const inventoryToCarryOver = properties.filter(p => {
    const fin = calculatePropertyFinancials(p, currentFY);
    return fin.status !== 'sold_out' && fin.endingInventory > 0;
  });

  const soldOutToExclude = properties.filter(p => {
    const fin = calculatePropertyFinancials(p, currentFY);
    return fin.status === 'sold_out' || fin.endingInventory === 0;
  });

  if (!isOpen) return null;

  // Delete FY
  const handleDeleteFY = (fy: FiscalYear) => {
    if (fiscalYears.length <= 1) {
      alert('事業年度は最低1つ必要です。これ以上削除できません。');
      return;
    }

    const confirmed = window.confirm(
      `事業年度「${fy.name}」を削除してもよろしいですか？\n※この操作は取り消せません。`
    );
    if (!confirmed) return;

    const updated = fiscalYears.filter(f => f.id !== fy.id);
    let nextFYId: string | undefined = undefined;

    if (fy.id === currentFY.id) {
      nextFYId = updated[0]?.id;
      if (nextFYId) {
        onSelectFiscalYear(nextFYId);
      }
    }

    onFiscalYearsUpdated(updated, properties, nextFYId);
    alert(`事業年度「${fy.name}」を削除しました。`);
  };

  // Manual Add FY (without rollover)
  const handleCreateFY = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `fy-${newStartDate.slice(0, 4)}`;
    const newFYName = `第${newPeriodNum}期 (${newStartDate.replace(/-/g, '/')} 〜 ${newEndDate.replace(/-/g, '/')})`;

    const newFY: FiscalYear = {
      id: newId,
      name: newFYName,
      periodNumber: newPeriodNum,
      startDate: newStartDate,
      endDate: newEndDate,
      isCurrent: false,
    };

    const updated = [...fiscalYears, newFY];
    onFiscalYearsUpdated(updated, properties, newId);
    setActiveSubTab('list');
  };

  // Perform Fiscal Year Rollover (決算繰越・年度更新)
  const handlePerformRollover = () => {
    if (
      !confirm(
        `【第${currentFY.periodNumber}期 → 第${newPeriodNum}期 への年度更新】\n\n・売却完了（完売）物件 ${soldOutToExclude.length}件 は新年度一覧から除外されます（過去履歴として保持）。\n・期末棚卸残高のある物件 ${inventoryToCarryOver.length}件 は新年度の期首棚卸資産として自動繰越されます。\n\n実行しますか？`
      )
    ) {
      return;
    }

    const { updatedFiscalYears, updatedProperties, newFYId } = rolloverToNewFiscalYear(
      currentFY,
      newPeriodNum,
      newStartDate,
      newEndDate,
      properties,
      fiscalYears
    );

    onFiscalYearsUpdated(updatedFiscalYears, updatedProperties, newFYId);
    alert(`第${newPeriodNum}期への年度更新と棚卸残高の繰越が完了しました！`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 bg-white text-slate-900 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">事業年度設定 & 決算・年度更新</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                会計期間の管理、期末棚卸残高の自動繰越、売却済み物件の年度除外
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

        {/* Tab Header */}
        <div className="flex border-b border-slate-200 px-4 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveSubTab('list')}
            className={`py-2 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeSubTab === 'list'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            登録済み事業年度一覧 ({fiscalYears.length}件)
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rollover')}
            className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1 cursor-pointer transition-colors ${
              activeSubTab === 'rollover'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3 h-3" />
            <span>決算繰越・年度更新 (推奨)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('create')}
            className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1 cursor-pointer transition-colors ${
              activeSubTab === 'create'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>年度新規作成</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">
          {/* 1. LIST TAB */}
          {activeSubTab === 'list' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-3">期数・名称</th>
                      <th className="py-1.5 px-3">開始日</th>
                      <th className="py-1.5 px-3">終了日 (期末)</th>
                      <th className="py-1.5 px-3 text-center">状態</th>
                      <th className="py-1.5 px-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fiscalYears.map(fy => {
                      const isCurrent = fy.id === currentFY.id;
                      return (
                        <tr
                          key={fy.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCurrent ? 'bg-amber-50/40 font-bold' : ''
                          }`}
                        >
                          <td className="py-1.5 px-3 text-slate-900">{fy.name}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-700">{fy.startDate}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-700">{fy.endDate}</td>
                          <td className="py-1.5 px-3 text-center">
                            {isCurrent ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                選択中 (当期)
                              </span>
                            ) : fy.isClosed ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                決算確定済
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectFiscalYear(fy.id);
                                    onClose();
                                  }}
                                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  表示切替
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={fiscalYears.length <= 1}
                                onClick={() => handleDeleteFY(fy)}
                                className={`p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ${
                                  fiscalYears.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                                title={
                                  fiscalYears.length <= 1
                                    ? '事業年度は最低1つ必要です'
                                    : `「${fy.name}」を削除`
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                <div className="font-bold text-slate-800">事業年度と判定の仕組み:</div>
                <p>
                  各取引（仕入本体の決済日、付随費用の支払日、売上の決済日）が選択中事業年度の「開始日〜終了日」の期間内にあるかを自動判定し、当期の会計仕訳・科目突合を行います。
                </p>
              </div>
            </div>
          )}

          {/* 2. ROLLOVER TAB (年度更新) */}
          {activeSubTab === 'rollover' && (
            <div className="space-y-3.5">
              <div className="bg-purple-50/70 p-3 rounded-lg border border-purple-200 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-purple-900 font-bold text-xs">
                  <History className="w-3.5 h-3.5" />
                  <span>年度更新 (決算繰越) の自動処理仕様</span>
                </div>
                <ul className="text-[11px] text-purple-800 space-y-0.5 list-disc list-inside">
                  <li>
                    <strong>売却完了 (完売) 物件:</strong>{' '}
                    新年度の在庫一覧から自動除外されます（過去年度選択時には閲覧可能）。
                  </li>
                  <li>
                    <strong>棚卸残高のある物件 (保有中・一部売却済):</strong>{' '}
                    新年度へ自動繰越され、現在の期末棚卸残高が新年度の<strong>「期首棚卸金額」</strong>として引き継がれます。
                  </li>
                </ul>
              </div>

              {/* Rollover Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                {/* 繰越対象 */}
                <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-emerald-800 flex items-center space-x-1 border-b border-emerald-100 pb-1.5 text-xs">
                    <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                    <span>新年度へ繰越される物件 ({inventoryToCarryOver.length}件)</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                    {inventoryToCarryOver.length === 0 ? (
                      <p className="text-slate-400 text-xs">棚卸残高のある物件はありません</p>
                    ) : (
                      inventoryToCarryOver.map(p => {
                        const fin = calculatePropertyFinancials(p, currentFY);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-1.5 rounded bg-emerald-50/50 border border-emerald-100 text-xs"
                          >
                            <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                              {p.name}
                            </span>
                            <span className="font-bold text-emerald-700 font-mono">
                              {formatCurrency(fin.endingInventory)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 除外対象 */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-700 flex items-center space-x-1 border-b border-slate-100 pb-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>新年度から除外される完売物件 ({soldOutToExclude.length}件)</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                    {soldOutToExclude.length === 0 ? (
                      <p className="text-slate-400 text-xs">完売物件はありません</p>
                    ) : (
                      soldOutToExclude.map(p => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100 text-slate-600 text-xs"
                        >
                          <span className="truncate max-w-[160px]">{p.name}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded">
                            完売
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* New FY Settings */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>新年度の期間設定（現事業年度から自動設定）:</span>
                  </div>
                  <button
                    type="button"
                    onClick={resetToAutoCalculatedDates}
                    className="inline-flex items-center space-x-1 text-[11px] text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                    title={`第${currentFY.periodNumber}期（${currentFY.startDate}〜${currentFY.endDate}）の翌日から算出した日付に再設定`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>現事業年度から再計算</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">期数</label>
                    <input
                      type="number"
                      value={newPeriodNum}
                      onChange={e => setNewPeriodNum(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">開始日</label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={e => handleStartDateChange(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">終了日 (期末)</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={e => setNewEndDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-slate-900"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  ※現在選択されている第{currentFY.periodNumber}期（期末: {currentFY.endDate}）の翌日から始まる1年間の期間が自動セットされています。必要に応じて変更も可能です。
                </p>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handlePerformRollover}
                  className="px-4 py-2 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>第{newPeriodNum}期へ年度更新・繰越を実行</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. CREATE TAB (空の年度作成) */}
          {activeSubTab === 'create' && (
            <form onSubmit={handleCreateFY} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">期数</label>
                  <input
                    type="number"
                    value={newPeriodNum}
                    onChange={e => setNewPeriodNum(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">開始日</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    終了日 (期末)
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#001529] hover:bg-[#002244] text-white text-xs font-bold rounded cursor-pointer"
                >
                  年度を追加
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
