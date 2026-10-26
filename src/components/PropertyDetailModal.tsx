import React, { useEffect } from 'react';
import {
  X,
  Printer,
  Edit,
  Building,
  Calendar,
  DollarSign,
  Receipt,
  FileText,
  Boxes,
  Percent,
} from 'lucide-react';
import { Property, FiscalYear } from '../types';
import {
  calculatePropertyFinancials,
  formatCurrency,
  formatArea,
  getStatusBadgeClass,
  getPropertyPurchases,
  getPurchaseRecordFixedAssetTax,
  getPropertyTotalAttachmentsCount,
} from '../utils/calculations';
import { ResizableModal } from './ResizableModal';
import { AttachmentBadgeList } from './AttachmentManager';
import { Paperclip } from 'lucide-react';

interface PropertyDetailModalProps {
  property: Property | null;
  currentFY: FiscalYear;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (property: Property) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  currentFY,
  isOpen,
  onClose,
  onEdit,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !property) return null;

  const fin = calculatePropertyFinancials(property, currentFY);
  const badgeStyle = getStatusBadgeClass(fin.status);
  const landArea = formatArea(property.landArea);
  const buildingArea = property.buildingArea ? formatArea(property.buildingArea) : null;
  const purchases = getPropertyPurchases(property);
  const totalAttachmentsCount = getPropertyTotalAttachmentsCount(property);

  const handlePrint = () => {
    window.print();
  };

  return (
    <ResizableModal
      id="property-detail-modal-container"
      backdropId="property-detail-modal-backdrop"
      onBackdropClick={onClose}
      defaultWidth={768}
      minWidth={480}
      minHeight={360}
      storageKey="property_detail_modal"
    >
      {({ renderHeaderControls }) => (
        <>
          {/* Header */}
          <div className="px-4 py-3 bg-white text-slate-900 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                    {property.code}
                  </span>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">{property.location}</h2>
                  {totalAttachmentsCount > 0 && (
                    <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      <Paperclip className="w-2.5 h-2.5 text-blue-600" />
                      <span>添付書類 {totalAttachmentsCount}件</span>
                    </span>
                  )}
                </div>
                {property.name && property.name !== property.location && (
                  <p className="text-[11px] text-slate-400 font-medium">{property.name}</p>
                )}
                <p className="text-[11px] text-slate-500 font-medium">物件別収支計算書 兼 原価台帳</p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {renderHeaderControls('light')}
              <button
                type="button"
                onClick={handlePrint}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                title="印刷"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(property);
                }}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>編集</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* Financial KPI Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500">総仕入原価 (本体+付随)</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
              {formatCurrency(fin.totalAcquisitionCost)}
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500">売上総額 (累計)</span>
            <p className="text-sm font-bold text-blue-700 mt-0.5 font-mono">
              {formatCurrency(fin.totalSalesAmount)}
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500">期末棚卸残高 (現在在庫・決済済分)</span>
            <p className="text-sm font-bold text-purple-700 mt-0.5 font-mono">
              {formatCurrency(fin.endingInventory)}
            </p>
            {(fin.unsettledPurchaseTotal > 0 || fin.unpaidIncidentalCostsTotal > 0) && (
              <p className="text-[9px] text-amber-700 mt-0.5 leading-tight">
                ※未決済仕入・未払付随費用 ({formatCurrency(fin.unsettledPurchaseTotal + fin.unpaidIncidentalCostsTotal)}) は除外
              </p>
            )}
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500">確定粗利益 (粗利率)</span>
            <p className="text-sm font-bold text-emerald-700 mt-0.5 font-mono">
              {formatCurrency(fin.grossProfit)}{' '}
              <span className="text-[10px] font-semibold text-slate-600">
                ({fin.grossProfitMargin.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Status & Location Section */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`}></span>
                <span>{fin.statusLabel}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                登録日: {property.createdAt?.slice(0, 10)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500">所在地: </span>
                <span className="font-bold text-slate-900">{property.location}</span>
              </div>
              <div>
                <span className="text-slate-500">地目 / 面積: </span>
                <span className="font-bold text-slate-900">
                  {property.landCategory} ｜ 土地 {landArea.sqm} ({landArea.tsubo})
                  {buildingArea ? ` ｜ 建物 ${buildingArea.sqm} (${buildingArea.tsubo})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500">
                  仕入先 (売主){purchases.length > 1 ? ` [${purchases.length}件]` : ''}:{' '}
                </span>
                <span className="font-medium text-slate-800">
                  {purchases.length > 1
                    ? purchases
                        .map(
                          (p, i) =>
                            `${p.label ? `[${p.label}] ` : `#${i + 1}: `}${p.sellerName || '未登録'}`
                        )
                        .join(' ／ ')
                    : `${property.sellerName || '未登録'} (${property.sellerAddress || '住所未登録'})`}
                </span>
              </div>
              <div>
                <span className="text-slate-500">仕入契約日 / 決済日: </span>
                <span className="font-mono text-slate-800">
                  {purchases.length > 1
                    ? purchases
                        .map(
                          (p, i) =>
                            `#${i + 1}: 契約 ${p.contractDate || '-'}・決済 ${p.settlementDate || '未決済'}`
                        )
                        .join(' ／ ')
                    : `契約: ${property.contractDate || '-'} ｜ 決済: ${property.settlementDate || '未決済'}`}
                </span>
              </div>
            </div>

            {property.attachments && property.attachments.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1 mr-1">
                  <Paperclip className="w-3 h-3 text-blue-600" />
                  <span>物件基本資料:</span>
                </span>
                <AttachmentBadgeList
                  attachments={property.attachments}
                  contextLabel={`物件 [${property.code}] ${property.location} 基本資料`}
                />
              </div>
            )}
          </div>

          {/* 仕入・原価内訳明細 */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>仕入原価内訳 (本体 ＋ 付随費用)</span>
              {purchases.length > 1 && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                  複数仕入合算 ({purchases.length}契約)
                </span>
              )}
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8fafc] text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-3">科目 / 費用の種類</th>
                  <th className="py-1.5 px-3">相手先 (支払先)</th>
                  <th className="py-1.5 px-3">支払日 / 決済日</th>
                  <th className="py-1.5 px-3 text-right">金額 (円)</th>
                  <th className="py-1.5 px-3">備考・添付書類</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p, idx) => {
                  const pTax = getPurchaseRecordFixedAssetTax(p);
                  const bldgGross = (p.buildingPurchasePrice || 0) + (p.buildingPurchaseTax || 0);
                  const prefix =
                    purchases.length > 1
                      ? p.label
                        ? `[${p.label}] `
                        : `[仕入#${idx + 1}] `
                      : '';
                  const hasPurchaseAtts = p.attachments && p.attachments.length > 0;
                  let renderedAtts = false;
                  const renderPurchaseAttsOnce = () => {
                    if (renderedAtts || !hasPurchaseAtts) return null;
                    renderedAtts = true;
                    return (
                      <div className="mt-1">
                        <AttachmentBadgeList
                          compact
                          attachments={p.attachments}
                          contextLabel={`${prefix || '仕入契約'} (${p.sellerName || '-'})`}
                        />
                      </div>
                    );
                  };

                  return (
                    <React.Fragment key={p.id || idx}>
                      {(p.landPurchasePrice || 0) > 0 && (
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-3 font-bold text-slate-800">
                            {prefix}土地仕入本体
                            {p.landArea ? (
                              <span className="ml-1 text-[10px] font-normal text-slate-500">
                                ({p.landArea}㎡)
                              </span>
                            ) : null}
                          </td>
                          <td className="py-1.5 px-3">{p.sellerName || '-'}</td>
                          <td className="py-1.5 px-3 font-mono">{p.settlementDate || '未決済'}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold">
                            {formatCurrency(p.landPurchasePrice)}
                          </td>
                          <td className="py-1.5 px-3 text-slate-500">
                            <div>非課税</div>
                            {renderPurchaseAttsOnce()}
                          </td>
                        </tr>
                      )}
                      {bldgGross > 0 && (
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-3 font-bold text-slate-800">
                            {prefix}建物仕入本体
                            {p.buildingArea ? (
                              <span className="ml-1 text-[10px] font-normal text-slate-500">
                                ({p.buildingArea}㎡)
                              </span>
                            ) : null}
                          </td>
                          <td className="py-1.5 px-3">{p.sellerName || '-'}</td>
                          <td className="py-1.5 px-3 font-mono">{p.settlementDate || '未決済'}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold">
                            {formatCurrency(bldgGross)}
                          </td>
                          <td className="py-1.5 px-3 text-slate-500">
                            <div>消費税込/本体</div>
                            {renderPurchaseAttsOnce()}
                          </td>
                        </tr>
                      )}
                      {pTax.total > 0 && (
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-3 font-bold text-slate-800">
                            {prefix}固定資産税等精算金 (支払)
                            <span className="block text-[10px] font-normal text-slate-500">
                              内訳: 土地(非課税) {formatCurrency(pTax.land)} / 建物(税込){' '}
                              {formatCurrency(pTax.building + pTax.buildingTax)}
                            </span>
                          </td>
                          <td className="py-1.5 px-3">{p.sellerName || '-'}</td>
                          <td className="py-1.5 px-3 font-mono">{p.settlementDate || '-'}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold">
                            {formatCurrency(pTax.total)}
                          </td>
                          <td className="py-1.5 px-3 text-slate-500">
                            <div>仕入原価算入</div>
                            {renderPurchaseAttsOnce()}
                          </td>
                        </tr>
                      )}
                      {!renderedAtts && hasPurchaseAtts && (
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-3 font-bold text-slate-800">
                            {prefix}仕入契約書類
                          </td>
                          <td className="py-1.5 px-3">{p.sellerName || '-'}</td>
                          <td className="py-1.5 px-3 font-mono">{p.contractDate || '-'}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-400">¥0</td>
                          <td className="py-1.5 px-3">
                            {renderPurchaseAttsOnce()}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {(property.incidentalCosts || []).map(cost => {
                  const isUnpaid = !cost.paymentDate || !cost.paymentDate.trim();
                  return (
                    <tr
                      key={cost.id}
                      className={`transition-colors ${
                        isUnpaid ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-1.5 px-3 font-semibold text-blue-800">
                        付随費用: {cost.costType}
                      </td>
                      <td className="py-1.5 px-3">{cost.payee || '-'}</td>
                      <td className="py-1.5 px-3 font-mono">
                        {isUnpaid ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            未払 (支払日未入力)
                          </span>
                        ) : (
                          cost.paymentDate
                        )}
                      </td>
                      <td
                        className={`py-1.5 px-3 text-right font-mono font-bold ${
                          cost.amount < 0 ? 'text-red-600' : 'text-blue-700'
                        }`}
                      >
                        {formatCurrency(cost.amount)}
                      </td>
                      <td className="py-1.5 px-3 text-slate-500">
                        {cost.memo && <div>{cost.memo}</div>}
                        {cost.attachments && cost.attachments.length > 0 ? (
                          <div className={cost.memo ? 'mt-1' : ''}>
                            <AttachmentBadgeList
                              compact
                              attachments={cost.attachments}
                              contextLabel={`付随費用: ${cost.costType} (${cost.payee || '-'})`}
                            />
                          </div>
                        ) : (
                          !cost.memo && '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right">
                    総仕入原価合計:
                  </td>
                  <td className="py-2 px-3 text-right text-slate-900 font-mono">
                    {formatCurrency(fin.totalAcquisitionCost)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 売上・分筆売却明細 & 原価計算プロセス */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              売上・分筆売却実績 ＆ 計上売上原価
            </div>
            {property.sales && property.sales.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {property.sales.map((sale, sIdx) => (
                  <div key={sale.id} className="p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                          {sIdx + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {sale.buyerName} 様
                        </span>
                        {sale.partialSaleName && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            {sale.partialSaleName}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 mr-1.5 text-[11px]">売上総額:</span>
                        <span className="font-mono font-bold text-blue-700 text-xs">
                          {formatCurrency(
                            (sale.landPrice || 0) +
                              (sale.buildingPrice || 0) +
                              (sale.fixedAssetTaxSettlement || 0)
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-slate-600 bg-slate-50 p-2 rounded text-[11px]">
                      <div>契約日: {sale.contractDate || '-'}</div>
                      <div>決済日: {sale.settlementDate || '未決済'}</div>
                      <div>
                        土地売上: {formatCurrency(sale.landPrice)}
                      </div>
                      <div>
                        計上原価: {formatCurrency(sale.costOfGoodsSold)}
                      </div>
                    </div>

                    {sale.costCalculationNote && (
                      <div className="bg-amber-50/80 p-2 rounded border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                        <strong className="block mb-0.5 text-amber-950 font-bold">
                          原価計算根拠・按分プロセス:
                        </strong>
                        {sale.costCalculationNote}
                      </div>
                    )}

                    {sale.attachments && sale.attachments.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 flex items-center space-x-0.5">
                          <Paperclip className="w-3 h-3 text-blue-600" />
                          <span>売上添付書類:</span>
                        </span>
                        <AttachmentBadgeList
                          compact
                          attachments={sale.attachments}
                          contextLabel={`売上 #${sIdx + 1} (${sale.buyerName || '-'} 様)`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">
                売上レコードはまだ登録されていません。
              </div>
            )}
          </div>

          {/* 備考 */}
          {property.notes && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-0.5">
              <span className="font-bold text-slate-800">特記事項・社内メモ:</span>
              <p className="text-slate-600 whitespace-pre-wrap text-[11px]">{property.notes}</p>
            </div>
          )}
        </div>
      </>
    )}
    </ResizableModal>
  );
};
