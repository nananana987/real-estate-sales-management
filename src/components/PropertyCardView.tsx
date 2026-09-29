import React from 'react';
import {
  Building,
  Edit,
  FileText,
  Trash2,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  Receipt,
  Boxes,
} from 'lucide-react';
import { Property, FiscalYear } from '../types';
import {
  calculatePropertyFinancials,
  formatCurrency,
  formatArea,
  getStatusBadgeClass,
  getPropertyTypeBadgeClass,
} from '../utils/calculations';

interface PropertyCardViewProps {
  properties: Property[];
  currentFY: FiscalYear;
  onEditProperty: (property: Property) => void;
  onOpenDetail: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
}

export const PropertyCardView: React.FC<PropertyCardViewProps> = ({
  properties,
  currentFY,
  onEditProperty,
  onOpenDetail,
  onDeleteProperty,
}) => {
  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500 shadow-2xs">
        <div className="flex flex-col items-center justify-center space-y-2">
          <Building className="w-8 h-8 text-slate-300" />
          <p className="font-bold text-slate-700 text-xs">登録されている物件データはありません</p>
          <p className="text-[11px] text-slate-400">
            右上の「新規物件」ボタンから最初の仕入物件を登録してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {properties.map(property => {
        const fin = calculatePropertyFinancials(property, currentFY);
        const badgeStyle = getStatusBadgeClass(fin.status);
        const typeBadge = getPropertyTypeBadgeClass(property.propertyType);
        const landArea = formatArea(property.landArea);

        return (
          <div
            key={property.id}
            className="bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                  {property.code}
                </span>
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`}></span>
                  <span>{fin.statusLabel}</span>
                </span>
              </div>

              <div>
                <h3
                  onClick={() => onOpenDetail(property)}
                  className="font-bold text-sm text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-1 transition-colors flex items-center"
                  title={property.location}
                >
                  <MapPin className="w-3.5 h-3.5 mr-1 shrink-0 text-blue-600" />
                  <span>{property.location}</span>
                </h3>
                {property.name && property.name !== property.location && (
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {property.name}
                  </p>
                )}
              </div>

              <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-md border border-slate-200 space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400">種類:</span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}
                    >
                      {typeBadge.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">地目: </span>
                    <span className="font-semibold">{property.landCategory}</span>
                  </div>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400">土地面積</span>
                  <span className="font-medium text-slate-700 font-mono">
                    {landArea.sqm}
                  </span>
                </div>
                {property.buildingArea ? (
                  <div className="flex justify-between pt-0.5 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400">建物面積</span>
                    <span className="font-medium text-slate-700 font-mono">
                      {property.buildingArea} ㎡
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-0.5 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400">決済日</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {property.settlementDate || '未決済'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-slate-50/40 space-y-1 text-xs border-b border-slate-100 flex-1">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-[11px]">総仕入原価:</span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {formatCurrency(fin.totalAcquisitionCost)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="text-blue-700 font-medium text-[11px]">当期仕入合計:</span>
                <span className="font-mono font-bold text-blue-700 text-xs">
                  {formatCurrency(fin.currentPeriodPurchase)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="text-emerald-700 font-medium text-[11px]">当期売上合計:</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {formatCurrency(fin.currentPeriodSalesTotal)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/80">
                <span className="text-purple-800 font-bold text-[11px]">期末棚卸残高:</span>
                <span className="font-mono font-bold text-purple-700 text-xs">
                  {formatCurrency(fin.endingInventory)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="text-[11px]">確定粗利益:</span>
                <span
                  className={`font-mono font-bold text-xs ${
                    fin.grossProfit > 0
                      ? 'text-emerald-700'
                      : fin.grossProfit < 0
                      ? 'text-red-600'
                      : 'text-slate-600'
                  }`}
                >
                  {formatCurrency(fin.grossProfit)}
                </span>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="p-2.5 bg-white flex items-center justify-between no-print">
              <div className="text-[10px] text-slate-400 font-mono">
                売上 {property.sales?.length || 0}件 / 付随 {property.incidentalCosts?.length || 0}件
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => onOpenDetail(property)}
                  className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                >
                  収支書
                </button>
                <button
                  type="button"
                  onClick={() => onEditProperty(property)}
                  className="px-2 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors cursor-pointer"
                >
                  編集
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
