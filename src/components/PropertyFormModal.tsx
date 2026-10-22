import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  Calculator,
  Building,
  FileText,
  DollarSign,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import {
  Property,
  PropertyType,
  LandCategory,
  IncidentalCost,
  IncidentalCostType,
  SaleRecord,
  SaleCategory,
  PurchaseRecord,
  FiscalYear,
} from '../types';
import {
  formatCurrency,
  SQM_TO_TSUBO,
  getPropertyPurchases,
} from '../utils/calculations';
import { generateNextPropertyCode } from '../utils/codeGenerator';
import { DateInput } from './DateInput';
import { ResizableModal } from './ResizableModal';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: Property) => void;
  editingProperty: Property | null;
  currentFY: FiscalYear;
  existingProperties?: Property[];
  initialTab?: 'purchase' | 'incidental' | 'sales' | 'calculator';
}

const LAND_CATEGORIES: string[] = [
  '宅地',
  '畑',
  '田',
  '山林',
  '原野',
  '雑種地',
  '公衆用道路',
  '保安林',
  '用悪水路',
  'ため池',
  '境内地',
  'その他',
];

const INCIDENTAL_COST_TYPES: IncidentalCostType[] = [
  '造成費用',
  '登記費用',
  '仲介手数料',
  '解体費用',
  '測量費用',
  '印紙税',
  '水道加入金・分担金',
  '設計・地盤調査費用',
  '修繕・リフォーム費用',
  'その他',
];

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProperty,
  currentFY,
  existingProperties = [],
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'purchase' | 'incidental' | 'sales' | 'calculator'>(
    initialTab || 'purchase'
  );

  // Form State
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('land');
  const [landCategory, setLandCategory] = useState<string>('宅地');
  const [landArea, setLandArea] = useState<number | ''>('');
  const [buildingArea, setBuildingArea] = useState<number | ''>('');

  // Multiple Purchase Records (税込経理)
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  const [isCarriedOver, setIsCarriedOver] = useState(false);
  const [initialInventoryCost, setInitialInventoryCost] = useState<number | ''>('');
  const [initialInventoryNote, setInitialInventoryNote] = useState('');
  const [notes, setNotes] = useState('');

  // Incidental Costs List
  const [incidentalCosts, setIncidentalCosts] = useState<IncidentalCost[]>([]);
  // Editing Incidental Cost ID
  const [editingCostId, setEditingCostId] = useState<string | null>(null);

  // New/Editing Incidental Cost Item Temp State
  const [newCostType, setNewCostType] = useState<string>('造成費用');
  const [newCostPayee, setNewCostPayee] = useState('');
  const [newCostPaymentDate, setNewCostPaymentDate] = useState('');
  const [newCostAmount, setNewCostAmount] = useState<string>('');
  const [newCostMemo, setNewCostMemo] = useState('');

  // Sales Records List
  const [sales, setSales] = useState<SaleRecord[]>([]);

  // Selected Sale for Editing or New Sale
  const [editingSaleIndex, setEditingSaleIndex] = useState<number | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (editingProperty) {
      setCode(editingProperty.code ? editingProperty.code.replace(/^P-?/i, '') : '');
      setLocation(editingProperty.location || '');
      setPropertyType(editingProperty.propertyType || 'land');
      setLandCategory(editingProperty.landCategory || '宅地');
      setLandArea(editingProperty.landArea || '');
      setBuildingArea(editingProperty.buildingArea || '');

      const rawPurchases = getPropertyPurchases(editingProperty);
      const normalizedPurchases: PurchaseRecord[] = rawPurchases.map((p, idx) => {
        const bldgGross = (p.buildingPurchasePrice || 0) + (p.buildingPurchaseTax || 0);
        const taxLand =
          p.fixedAssetTaxSettlementLand !== undefined
            ? p.fixedAssetTaxSettlementLand || 0
            : !p.fixedAssetTaxSettlementBuilding
            ? p.fixedAssetTaxSettlement || 0
            : 0;
        const taxBldgGross =
          (p.fixedAssetTaxSettlementBuilding || 0) +
          (p.fixedAssetTaxSettlementBuildingTax || 0);
        return {
          ...p,
          id: p.id || `purch-${Date.now()}-${idx}`,
          sellerName: p.sellerName || '',
          sellerAddress: p.sellerAddress || '',
          contractDate: p.contractDate || '',
          landPurchasePrice: p.landPurchasePrice || 0,
          buildingPurchasePrice: bldgGross,
          buildingPurchaseTax: 0,
          settlementDate: p.settlementDate || '',
          depositAmount: p.depositAmount || 0,
          depositSettlementDate: p.depositSettlementDate || '',
          fixedAssetTaxSettlementLand: taxLand,
          fixedAssetTaxSettlementBuilding: taxBldgGross,
          fixedAssetTaxSettlementBuildingTax: 0,
          fixedAssetTaxSettlement: taxLand + taxBldgGross,
        };
      });
      setPurchases(normalizedPurchases);

      setIsCarriedOver(editingProperty.isCarriedOver || false);
      setInitialInventoryCost(editingProperty.initialInventoryCost || 0);
      setInitialInventoryNote(editingProperty.initialInventoryNote || '');
      setNotes(editingProperty.notes || '');

      setIncidentalCosts(editingProperty.incidentalCosts || []);

      // 売上レコードも税込金額に正規化
      const normalizedSales = (editingProperty.sales || []).map(s => {
        const sBldgGross = (s.buildingPrice || 0) + (s.buildingTax || 0);
        const sTaxBldgGross = (s.fixedAssetTaxSettlementBuilding || 0) + (s.fixedAssetTaxSettlementBuildingTax || 0);
        return {
          ...s,
          buildingPrice: sBldgGross,
          fixedAssetTaxSettlementBuilding: sTaxBldgGross,
        };
      });
      setSales(normalizedSales);
    } else {
      // Default new property: 西暦下2桁 + 001〜 (例: 26001)
      const nextCode = generateNextPropertyCode(existingProperties);
      const today = new Date().toISOString().slice(0, 10);
      setCode(nextCode);
      setLocation('');
      setPropertyType('land');
      setLandCategory('宅地');
      setLandArea('');
      setBuildingArea('');

      setPurchases([
        {
          id: 'purch-' + Date.now(),
          label: '',
          sellerName: '',
          sellerAddress: '',
          purchaseType: 'land',
          contractDate: today,
          landPurchasePrice: 0,
          buildingPurchasePrice: 0,
          buildingPurchaseTax: 0,
          settlementDate: '',
          depositAmount: 0,
          depositSettlementDate: '',
          fixedAssetTaxSettlementLand: 0,
          fixedAssetTaxSettlementBuilding: 0,
          fixedAssetTaxSettlementBuildingTax: 0,
          fixedAssetTaxSettlement: 0,
          memo: '',
        },
      ]);

      setIsCarriedOver(false);
      setInitialInventoryCost('');
      setInitialInventoryNote('');
      setNotes('');

      setIncidentalCosts([]);
      setSales([]);
    }
    setEditingCostId(null);
    setNewCostType('造成費用');
    setNewCostPayee('');
    setNewCostPaymentDate('');
    setNewCostAmount('');
    setNewCostMemo('');
    setActiveTab(initialTab || 'purchase');
    setEditingSaleIndex(null);
  }, [editingProperty, isOpen, existingProperties, initialTab]);

  if (!isOpen) return null;

  // Summary Totals Calculation for current form (全仕入レコードの合算)
  const curLandPrice = purchases.reduce((acc, p) => acc + (Number(p.landPurchasePrice) || 0), 0);
  const curBldgPrice = purchases.reduce((acc, p) => acc + (Number(p.buildingPurchasePrice) || 0), 0);
  const curTaxLand = purchases.reduce(
    (acc, p) => acc + (Number(p.fixedAssetTaxSettlementLand) || 0),
    0
  );
  const curTaxBldg = purchases.reduce(
    (acc, p) => acc + (Number(p.fixedAssetTaxSettlementBuilding) || 0),
    0
  );
  const curFixedTaxTotal = curTaxLand + curTaxBldg;
  const hasAnySettledPurchase = purchases.some(p => !!p.settlementDate);
  const hasAnyDepositPaid =
    !hasAnySettledPurchase && purchases.some(p => !!p.depositSettlementDate);

  const curInitialCost = isCarriedOver ? Number(initialInventoryCost) || 0 : 0;
  const totalIncidental = incidentalCosts.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalAcquisition = curInitialCost + curLandPrice + curBldgPrice + curFixedTaxTotal + totalIncidental;

  const totalSalesAmount = sales.reduce((acc, s) => {
    const sTax = (s.fixedAssetTaxSettlementLand || 0) + (s.fixedAssetTaxSettlementBuilding || 0);
    const taxTotal = sTax > 0 ? sTax : (s.fixedAssetTaxSettlement || 0);
    return acc + (s.landPrice || 0) + (s.buildingPrice || 0) + taxTotal;
  }, 0);

  const totalCOGS = sales.reduce((acc, s) => acc + (s.costOfGoodsSold || 0), 0);
  const endingInventory = Math.max(0, totalAcquisition - totalCOGS);

  // 複数仕入レコードの追加・更新・削除ハンドラー
  const handleAddPurchase = () => {
    const defaultContractDate =
      purchases[0]?.contractDate || new Date().toISOString().slice(0, 10);
    const newPurchase: PurchaseRecord = {
      id: `purch-${Date.now()}-${purchases.length + 1}`,
      propertyId: editingProperty?.id || 'temp',
      label: '',
      sellerName: '',
      sellerAddress: '',
      purchaseType: propertyType,
      contractDate: defaultContractDate,
      landPurchasePrice: 0,
      buildingPurchasePrice: 0,
      buildingPurchaseTax: 0,
      settlementDate: '',
      depositAmount: 0,
      depositSettlementDate: '',
      fixedAssetTaxSettlementLand: 0,
      fixedAssetTaxSettlementBuilding: 0,
      fixedAssetTaxSettlementBuildingTax: 0,
      fixedAssetTaxSettlement: 0,
      memo: '',
    };
    setPurchases([...purchases, newPurchase]);
  };

  const handleUpdatePurchaseField = (
    index: number,
    field: keyof PurchaseRecord,
    value: any
  ) => {
    const updated = [...purchases];
    const item = { ...updated[index], [field]: value };
    const tLand = Number(item.fixedAssetTaxSettlementLand) || 0;
    const tBldg = Number(item.fixedAssetTaxSettlementBuilding) || 0;
    item.fixedAssetTaxSettlement = tLand + tBldg;
    updated[index] = item;
    setPurchases(updated);
  };

  const handleRemovePurchase = (index: number) => {
    if (purchases.length <= 1) return;
    if (confirm(`仕入情報 #${index + 1} を削除しますか？`)) {
      setPurchases(purchases.filter((_, i) => i !== index));
    }
  };

  // 地目の複数パース・選択判定・トグル処理
  const parseLandCategories = (catStr: string): string[] => {
    return (catStr || '')
      .split(/[,、・/\s+]+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const isLandCategorySelected = (cat: string): boolean => {
    const currentList = parseLandCategories(landCategory);
    return currentList.includes(cat);
  };

  const handleToggleLandCategory = (cat: string) => {
    const currentList = parseLandCategories(landCategory);
    let updatedList: string[];
    if (currentList.includes(cat)) {
      updatedList = currentList.filter(c => c !== cat);
    } else {
      updatedList = [...currentList, cat];
    }
    setLandCategory(updatedList.length > 0 ? updatedList.join('、') : '');
  };

  // 未計上原価残額の算出（全部売却時に全額または残額を充当）
  const calculateRemainingAcquisition = (excludeSaleIndex?: number) => {
    const otherCOGS = sales.reduce(
      (acc, s, idx) => (idx === excludeSaleIndex ? acc : acc + (s.costOfGoodsSold || 0)),
      0
    );
    return Math.max(0, totalAcquisition - otherCOGS);
  };

  // 未売却・残余土地面積の算出（全体面積 - 他の売却土地面積合計）
  const calculateRemainingLandArea = (excludeSaleIndex?: number): number => {
    const totalArea = typeof landArea === 'number' ? landArea : 0;
    if (totalArea <= 0) return 0;
    const otherSoldLandArea = sales.reduce(
      (acc, s, idx) => (idx === excludeSaleIndex ? acc : acc + (Number(s.soldLandArea) || 0)),
      0
    );
    const rem = totalArea - otherSoldLandArea;
    return rem > 0 ? Math.round(rem * 1000) / 1000 : 0;
  };

  // 未売却・残余建物面積の算出
  const calculateRemainingBuildingArea = (excludeSaleIndex?: number): number => {
    const totalArea = typeof buildingArea === 'number' ? buildingArea : 0;
    if (totalArea <= 0) return 0;
    const otherSoldBldgArea = sales.reduce(
      (acc, s, idx) => (idx === excludeSaleIndex ? acc : acc + (Number(s.soldBuildingArea) || 0)),
      0
    );
    const rem = totalArea - otherSoldBldgArea;
    return rem > 0 ? Math.round(rem * 1000) / 1000 : 0;
  };

  // Start Edit Incidental Cost
  const handleStartEditIncidentalCost = (cost: IncidentalCost) => {
    setEditingCostId(cost.id);
    setNewCostType(cost.costType || '造成費用');
    setNewCostPayee(cost.payee || '');
    setNewCostPaymentDate(cost.paymentDate || '');
    setNewCostAmount(cost.amount !== undefined && cost.amount !== null ? String(cost.amount) : '');
    setNewCostMemo(cost.memo || '');
  };

  // Cancel Edit Incidental Cost
  const handleCancelEditIncidentalCost = () => {
    setEditingCostId(null);
    setNewCostType('造成費用');
    setNewCostPayee('');
    setNewCostPaymentDate('');
    setNewCostAmount('');
    setNewCostMemo('');
  };

  // Add or Update Incidental Cost
  const handleSaveIncidentalCost = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedType = (newCostType || '').trim();
    if (!trimmedType) {
      alert('費用の種類（項目名）を入力してください');
      return;
    }
    const normalizedAmountStr = String(newCostAmount)
      .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/[－ー▲△]/g, '-')
      .replace(/[,，¥円\s]/g, '');
    const parsedAmount = Number(normalizedAmountStr);
    if (normalizedAmountStr === '' || normalizedAmountStr === '-' || isNaN(parsedAmount) || parsedAmount === 0) {
      alert('金額を正しく入力してください（マイナス金額も入力可能です）');
      return;
    }

    if (editingCostId) {
      // Update existing item
      const updated = incidentalCosts.map(c => {
        if (c.id === editingCostId) {
          return {
            ...c,
            costType: trimmedType,
            payee: newCostPayee,
            paymentDate: (newCostPaymentDate || '').trim(),
            amount: parsedAmount,
            memo: newCostMemo,
          };
        }
        return c;
      });
      setIncidentalCosts(updated);
      handleCancelEditIncidentalCost();
    } else {
      // Add new item
      const newCost: IncidentalCost = {
        id: 'cost-' + Date.now(),
        propertyId: editingProperty?.id || 'temp',
        costType: trimmedType,
        payee: newCostPayee,
        paymentDate: (newCostPaymentDate || '').trim(),
        amount: parsedAmount,
        memo: newCostMemo,
      };
      setIncidentalCosts([...incidentalCosts, newCost]);
      setNewCostPayee('');
      setNewCostAmount('');
      setNewCostPaymentDate('');
      setNewCostMemo('');
    }
  };

  const handleQuickUpdateCostPaymentDate = (costId: string, paymentDate: string) => {
    setIncidentalCosts(prev =>
      prev.map(c => (c.id === costId ? { ...c, paymentDate: (paymentDate || '').trim() } : c))
    );
  };

  const handleRemoveIncidentalCost = (id: string) => {
    if (editingCostId === id) {
      handleCancelEditIncidentalCost();
    }
    setIncidentalCosts(incidentalCosts.filter(c => c.id !== id));
  };

  // Add or Update Sale Record
  const handleAddNewSale = () => {
    const isFullSale = sales.length === 0;
    const remainingAcq = calculateRemainingAcquisition();
    const remainingLand = calculateRemainingLandArea();
    const remainingBldg = calculateRemainingBuildingArea();

    const autoCOGS = isFullSale ? remainingAcq : 0;
    const autoNote =
      isFullSale && remainingAcq > 0
        ? `【全部売却】物件の総仕入原価 ${formatCurrency(remainingAcq)} を売上原価として全額計上。`
        : '';

    // 全部売却の場合、一部売却後の残余土地面積があれば自動設定
    const initialSoldLandArea = isFullSale
      ? (remainingLand > 0 ? remainingLand : (typeof landArea === 'number' ? landArea : 0))
      : (sales.length > 0 && remainingLand > 0 ? 0 : 0);

    const initialSoldBldgArea = isFullSale
      ? (remainingBldg > 0 ? remainingBldg : (typeof buildingArea === 'number' ? buildingArea : 0))
      : 0;

    const newSale: SaleRecord = {
      id: 'sale-' + Date.now(),
      propertyId: editingProperty?.id || 'temp',
      buyerName: '',
      buyerAddress: '',
      saleType: propertyType,
      saleCategory: isFullSale ? 'full' : 'partial',
      partialSaleName: isFullSale ? '' : `${String.fromCharCode(65 + sales.length)}区画`,
      soldLandArea: initialSoldLandArea,
      soldBuildingArea: initialSoldBldgArea,
      contractDate: new Date().toISOString().slice(0, 10),
      landPrice: 0,
      buildingPrice: 0,
      settlementDate: '',
      depositAmount: 0,
      depositSettlementDate: '',
      fixedAssetTaxSettlementLand: 0,
      fixedAssetTaxSettlementBuilding: 0,
      fixedAssetTaxSettlement: 0,
      costOfGoodsSold: autoCOGS,
      costCalculationNote: autoNote,
      memo: '',
    };
    setSales([...sales, newSale]);
    setEditingSaleIndex(sales.length);
  };

  const handleUpdateSaleField = (index: number, field: keyof SaleRecord, value: any) => {
    const updated = [...sales];
    const item = { ...updated[index], [field]: value };

    // 精算金合計の自動同期 (土地分 + 建物分(税込))
    const sLand = Number(item.fixedAssetTaxSettlementLand) || 0;
    const sBldg = Number(item.fixedAssetTaxSettlementBuilding) || 0;
    item.fixedAssetTaxSettlement = sLand + sBldg;

    // 全部売却に切り替えた場合は売上原価と面積（一部売却後の残余土地面積）と計算メモを自動入力
    if (field === 'saleCategory' && value === 'full') {
      const remaining = calculateRemainingAcquisition(index);
      const remainingLand = calculateRemainingLandArea(index);
      const remainingBldg = calculateRemainingBuildingArea(index);

      item.costOfGoodsSold = remaining;
      // 一部売却後の残りの全部売却時は残余土地面積を自動計算してセット
      if (remainingLand > 0) {
        item.soldLandArea = remainingLand;
      } else if (typeof landArea === 'number' && landArea > 0) {
        item.soldLandArea = landArea;
      }

      if (remainingBldg > 0) {
        item.soldBuildingArea = remainingBldg;
      } else if (typeof buildingArea === 'number' && buildingArea > 0) {
        item.soldBuildingArea = buildingArea;
      }

      const noteParts = [`【全部売却】物件の総仕入原価 ${formatCurrency(remaining)} を売上原価として全額計上。`];
      if (sales.length > 1 && remainingLand > 0) {
        noteParts.push(`一部売却後の残余土地面積 ${remainingLand.toFixed(2)}㎡ を自動計算し適用。`);
      }
      item.costCalculationNote = noteParts.join(' ');
    }

    updated[index] = item;
    setSales(updated);
  };

  // 全部売却用 売上原価・残余土地面積の自動適用ボタンハンドラー
  const handleApplyFullSaleCOGS = (saleIndex: number) => {
    const remaining = calculateRemainingAcquisition(saleIndex);
    const remainingLand = calculateRemainingLandArea(saleIndex);
    const remainingBldg = calculateRemainingBuildingArea(saleIndex);

    const noteParts = [`【全部売却】物件の総仕入原価 ${formatCurrency(remaining)} を売上原価として全額計上。`];
    if (sales.length > 1 && remainingLand > 0) {
      noteParts.push(`一部売却後の残余土地面積 ${remainingLand.toFixed(2)}㎡ を自動計算し適用。`);
    }

    const updated = [...sales];
    const item = { ...updated[saleIndex] };
    item.costOfGoodsSold = remaining;
    item.costCalculationNote = noteParts.join(' ');

    // 残存土地面積を自動設定
    if (remainingLand > 0) {
      item.soldLandArea = remainingLand;
    } else if (typeof landArea === 'number' && landArea > 0) {
      item.soldLandArea = landArea;
    }

    if (remainingBldg > 0) {
      item.soldBuildingArea = remainingBldg;
    } else if (typeof buildingArea === 'number' && buildingArea > 0) {
      item.soldBuildingArea = buildingArea;
    }

    updated[saleIndex] = item;
    setSales(updated);
  };

  const handleRemoveSale = (index: number) => {
    if (confirm('この売上レコードを削除しますか？')) {
      const updated = sales.filter((_, i) => i !== index);
      setSales(updated);
      if (editingSaleIndex === index) {
        setEditingSaleIndex(null);
      } else if (editingSaleIndex !== null && editingSaleIndex > index) {
        setEditingSaleIndex(editingSaleIndex - 1);
      }
    }
  };

  // Assistant Area Proportion Calculator
  const handleApplyAreaProportion = (saleIndex: number) => {
    const sale = sales[saleIndex];
    if (!sale) return;
    const totalAreaNum = Number(landArea) || 0;
    const soldAreaNum = Number(sale.soldLandArea) || 0;
    if (totalAreaNum <= 0 || soldAreaNum <= 0) {
      alert('全体土地面積と売却土地面積を正しく入力してください');
      return;
    }
    const ratio = soldAreaNum / totalAreaNum;
    const allocatedCOGS = Math.round(totalAcquisition * ratio);
    const note = `【面積按分法】総仕入原価 ${formatCurrency(totalAcquisition)} × 面積割合(${soldAreaNum.toFixed(2)}㎡ / ${totalAreaNum.toFixed(2)}㎡ ≒ ${(ratio * 100).toFixed(2)}%) ＝ ${formatCurrency(allocatedCOGS)} を売上原価として計上。`;

    handleUpdateSaleField(saleIndex, 'costOfGoodsSold', allocatedCOGS);
    handleUpdateSaleField(saleIndex, 'costCalculationNote', note);
  };

  // Save full property
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      alert('物件所在地（住所・地番）を入力してください');
      setActiveTab('purchase');
      return;
    }

    const cleanCode = code.trim() || generateNextPropertyCode(existingProperties);
    const propId = editingProperty?.id || 'prop-' + Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);

    const cleanedPurchases: PurchaseRecord[] = purchases.map((p, idx) => {
      const tLand = Number(p.fixedAssetTaxSettlementLand) || 0;
      const tBldg = Number(p.fixedAssetTaxSettlementBuilding) || 0;
      return {
        ...p,
        id: p.id || `purch-${Date.now()}-${idx}`,
        propertyId: propId,
        label: p.label ? p.label.trim() : undefined,
        sellerName: (p.sellerName || '').trim(),
        sellerAddress: (p.sellerAddress || '').trim(),
        landArea: p.landArea ? Number(p.landArea) : undefined,
        buildingArea: p.buildingArea ? Number(p.buildingArea) : undefined,
        contractDate: p.contractDate || todayStr,
        landPurchasePrice: Number(p.landPurchasePrice) || 0,
        buildingPurchasePrice: Number(p.buildingPurchasePrice) || 0,
        buildingPurchaseTax: 0,
        settlementDate: p.settlementDate || undefined,
        depositAmount: Number(p.depositAmount) || 0,
        depositSettlementDate: p.depositSettlementDate || undefined,
        fixedAssetTaxSettlementLand: tLand,
        fixedAssetTaxSettlementBuilding: tBldg,
        fixedAssetTaxSettlementBuildingTax: 0,
        fixedAssetTaxSettlement: tLand + tBldg,
        memo: p.memo ? p.memo.trim() : undefined,
      };
    });

    // 複数仕入レコードから物件トップレベルのサマリー項目を自動合成
    const uniqueSellerNames = Array.from(
      new Set(cleanedPurchases.map(p => p.sellerName).filter(Boolean))
    );
    const combinedSellerName = uniqueSellerNames.join('、');

    const uniqueSellerAddresses = Array.from(
      new Set(cleanedPurchases.map(p => p.sellerAddress).filter(Boolean))
    );
    const combinedSellerAddress = uniqueSellerAddresses.join(' / ');

    const contractDates = cleanedPurchases
      .map(p => p.contractDate)
      .filter(Boolean)
      .sort();
    const primaryContractDate = contractDates[0] || todayStr;

    const settledDates = cleanedPurchases
      .map(p => p.settlementDate)
      .filter((d): d is string => !!d)
      .sort();
    const latestSettlementDate =
      settledDates.length > 0 ? settledDates[settledDates.length - 1] : undefined;

    const depositDates = cleanedPurchases
      .map(p => p.depositSettlementDate)
      .filter((d): d is string => !!d)
      .sort();
    const earliestDepositDate = depositDates.length > 0 ? depositDates[0] : undefined;

    const sumDeposit = cleanedPurchases.reduce((acc, p) => acc + (p.depositAmount || 0), 0);

    // もし物件全体の土地面積・建物面積が未入力で、各仕入レコードに面積が入っている場合は合算値を適用
    const purchasesLandAreaSum = cleanedPurchases.reduce(
      (acc, p) => acc + (Number(p.landArea) || 0),
      0
    );
    const purchasesBldgAreaSum = cleanedPurchases.reduce(
      (acc, p) => acc + (Number(p.buildingArea) || 0),
      0
    );
    const finalLandArea =
      Number(landArea) > 0
        ? Number(landArea)
        : purchasesLandAreaSum > 0
        ? Math.round(purchasesLandAreaSum * 100) / 100
        : 0;
    const finalBldgArea =
      Number(buildingArea) > 0
        ? Number(buildingArea)
        : purchasesBldgAreaSum > 0
        ? Math.round(purchasesBldgAreaSum * 100) / 100
        : 0;

    const newProperty: Property = {
      id: propId,
      code: cleanCode,
      location: location.trim(),
      sellerName: combinedSellerName,
      sellerAddress: combinedSellerAddress,
      propertyType,
      landCategory,
      landArea: finalLandArea,
      buildingArea: finalBldgArea,
      contractDate: primaryContractDate,
      landPurchasePrice: curLandPrice,
      buildingPurchasePrice: curBldgPrice,
      buildingPurchaseTax: 0,
      settlementDate: latestSettlementDate,
      depositAmount: sumDeposit,
      depositSettlementDate: earliestDepositDate,
      fixedAssetTaxSettlementLand: curTaxLand,
      fixedAssetTaxSettlementBuilding: curTaxBldg,
      fixedAssetTaxSettlementBuildingTax: 0,
      fixedAssetTaxSettlement: curFixedTaxTotal,
      purchases: cleanedPurchases,
      isCarriedOver,
      initialInventoryCost: isCarriedOver ? Number(initialInventoryCost) || 0 : undefined,
      initialInventoryNote: isCarriedOver ? initialInventoryNote : undefined,
      fiscalYearId: editingProperty?.fiscalYearId || currentFY.id,
      incidentalCosts,
      sales,
      notes,
      createdAt: editingProperty?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newProperty);
    onClose();
  };

  return (
    <ResizableModal
      defaultWidth={896}
      minWidth={520}
      minHeight={420}
      storageKey="property_form_modal"
    >
      {({ renderHeaderControls }) => (
        <>
          {/* Modal Header */}
          <div className="px-4 py-3 bg-[#001529] text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold border border-blue-400/30">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center space-x-2">
                  <span>{editingProperty ? `物件情報の編集 [${code}]` : '新規物件・仕入契約の登録'}</span>
                  {location && (
                    <span className="text-xs font-normal text-slate-300 truncate max-w-xs">
                      {location}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-300 font-medium">
                  仕入情報（複数売主・土地建物別仕入に対応）、固定資産税精算金、付随費用、売上・原価按分を一括管理
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {renderHeaderControls('dark')}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* Status & Financial Summary Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3 text-[11px]">
            <div>
              <span className="text-slate-500">総仕入原価: </span>
              <span className="font-bold text-slate-900 font-mono">{formatCurrency(totalAcquisition)}</span>
            </div>
            <div className="text-slate-300">|</div>
            <div>
              <span className="text-slate-500">売上累計: </span>
              <span className="font-bold text-blue-700 font-mono">{formatCurrency(totalSalesAmount)}</span>
            </div>
            <div className="text-slate-300">|</div>
            <div>
              <span className="text-slate-500">計上売上原価: </span>
              <span className="font-bold text-amber-700 font-mono">{formatCurrency(totalCOGS)}</span>
            </div>
            <div className="text-slate-300">|</div>
            <div>
              <span className="text-slate-500">現在棚卸金額 (在庫): </span>
              <span className="font-bold text-emerald-700 font-mono">{formatCurrency(endingInventory)}</span>
            </div>
          </div>
          <div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                hasAnySettledPurchase
                  ? sales.length > 0 && sales.some(s => s.settlementDate)
                    ? endingInventory === 0
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-purple-100 text-purple-800'
                    : 'bg-emerald-100 text-emerald-800'
                  : hasAnyDepositPaid
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              状態: {
                hasAnySettledPurchase
                  ? sales.length > 0 && sales.some(s => s.settlementDate)
                    ? endingInventory === 0
                      ? '売却済み (完売)'
                      : '一部売却済み (残あり)'
                    : '決済済み (棚卸保有中)'
                  : hasAnyDepositPaid
                  ? '手付金支払済 (決済待ち)'
                  : '仕入契約済 (未決済)'
              }
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 px-4 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('purchase')}
            className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'purchase'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. 物件・仕入契約情報</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('incidental')}
            className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'incidental'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>2. 仕入付随費用 ({incidentalCosts.length}件)</span>
            {incidentalCosts.length > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold font-mono">
                {formatCurrency(totalIncidental)}
              </span>
            )}
            {incidentalCosts.some(c => !c.paymentDate) && (
              <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
                未払 {incidentalCosts.filter(c => !c.paymentDate).length}件
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'sales'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>3. 売上・分筆売却情報 ({sales.length}件)</span>
            {sales.length > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold font-mono">
                {formatCurrency(totalSalesAmount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'calculator'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>4. 原価按分・収支シミュレーション</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {/* TAB 1: 仕入入力項目 */}
          {activeTab === 'purchase' && (
            <div className="space-y-4">
              {/* 基本特定情報 */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>物件基本情報</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    管理コードは「西暦下2桁＋001連番」形式で自動採番されます
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      管理コード <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="例: 26001"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">例: 26001 (西暦下2桁+連番)</p>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      物件所在地 (住所・地番) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="例: 東京都世田谷区代沢4丁目18-12"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                      required
                    />
                  </div>
                </div>

                {/* 種類・面積 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      物件全体の種類
                    </label>
                    <select
                      value={propertyType}
                      onChange={e => setPropertyType(e.target.value as PropertyType)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="land">土地のみ</option>
                      <option value="building">建物のみ</option>
                      <option value="land_and_building">土地 ＋ 建物</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        全体土地面積 (㎡)
                      </label>
                      {purchases.length > 1 &&
                        purchases.some(p => Number(p.landArea) > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              const sum = purchases.reduce(
                                (acc, p) => acc + (Number(p.landArea) || 0),
                                0
                              );
                              setLandArea(Math.round(sum * 100) / 100);
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                          >
                            仕入内訳面積計を反映
                          </button>
                        )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={landArea}
                        onChange={e => setLandArea(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="例: 330.58"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 pr-7"
                      />
                      <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">㎡</span>
                    </div>
                    {typeof landArea === 'number' && landArea > 0 && (
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        約 {(landArea * SQM_TO_TSUBO).toFixed(2)} 坪
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        全体建物面積 (㎡)
                      </label>
                      {purchases.length > 1 &&
                        purchases.some(p => Number(p.buildingArea) > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              const sum = purchases.reduce(
                                (acc, p) => acc + (Number(p.buildingArea) || 0),
                                0
                              );
                              setBuildingArea(Math.round(sum * 100) / 100);
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                          >
                            仕入内訳面積計を反映
                          </button>
                        )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={buildingArea}
                        onChange={e => setBuildingArea(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="例: 115.42"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 pr-7"
                      />
                      <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">㎡</span>
                    </div>
                    {typeof buildingArea === 'number' && buildingArea > 0 && (
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        約 {(buildingArea * SQM_TO_TSUBO).toFixed(2)} 坪
                      </p>
                    )}
                  </div>
                </div>

                {/* 地目 (複数入力・選択) */}
                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700">
                      地目 <span className="text-[10px] text-slate-500 font-normal">（複数選択・直接入力可）</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        候補をクリックで追加/解除、または直接入力
                      </span>
                      {landCategory && (
                        <button
                          type="button"
                          onClick={() => setLandCategory('')}
                          className="text-[10px] text-slate-500 hover:text-red-600 font-semibold cursor-pointer underline"
                        >
                          クリア
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={landCategory}
                    onChange={e => setLandCategory(e.target.value)}
                    placeholder="例: 宅地、畑、公衆用道路"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                  />

                  {/* クイック選択タグチップ */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium mr-0.5">クイック選択:</span>
                    {LAND_CATEGORIES.map(cat => {
                      const active = isLandCategorySelected(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleLandCategory(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer border ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {active ? `✓ ${cat}` : `+ ${cat}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 備考メモ */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    社内備考・特記事項
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="道路後退、越境、建築確認、用途地域などの特記事項"
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 前期繰越設定 */}
              <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCarriedOver}
                      onChange={e => setIsCarriedOver(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
                    />
                    <span>前期からの繰越物件として登録する（期首棚卸残高の引継ぎ）</span>
                  </label>
                </div>
                {isCarriedOver && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2 pt-2 border-t border-amber-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        期首棚卸金額 (前期繰越原価)
                      </label>
                      <input
                        type="number"
                        value={initialInventoryCost}
                        onChange={e =>
                          setInitialInventoryCost(e.target.value === '' ? '' : parseFloat(e.target.value))
                        }
                        placeholder="例: 43500000"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        {formatCurrency(Number(initialInventoryCost) || 0)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        繰越メモ・内訳根拠
                      </label>
                      <input
                        type="text"
                        value={initialInventoryNote}
                        onChange={e => setInitialInventoryNote(e.target.value)}
                        placeholder="例: 第24期末棚卸残高より繰越"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 仕入契約情報リスト (1つの管理コードに対して複数登録可能) */}
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      <span>仕入契約・仕入先情報 ({purchases.length}件)</span>
                      {purchases.length > 1 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">
                          複数仕入合算管理
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      土地と建物を別々の人から仕入れた場合や、複数人から仕入れた土地を1つの管理コードとして扱う場合は「＋ 仕入情報を追加」から複数登録できます
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPurchase}
                    className="px-3 py-1.5 rounded bg-[#001529] hover:bg-[#002244] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>仕入情報を追加</span>
                  </button>
                </div>

                {/* 複数仕入時の合算サマリーバー */}
                {purchases.length > 1 && (
                  <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <span className="text-[10px] text-slate-500 block">土地仕入 合計 ({purchases.length}件)</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(curLandPrice)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <span className="text-[10px] text-slate-500 block">建物仕入 合計 (税込)</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(curBldgPrice)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <span className="text-[10px] text-slate-500 block">固都税精算金 合計</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(curFixedTaxTotal)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-200">
                      <span className="text-[10px] text-blue-700 font-bold block">仕入本体 総合計</span>
                      <span className="font-mono font-bold text-blue-700">
                        {formatCurrency(curLandPrice + curBldgPrice + curFixedTaxTotal)}
                      </span>
                    </div>
                  </div>
                )}

                {purchases.map((purchase, pIdx) => {
                  const pTaxLand = Number(purchase.fixedAssetTaxSettlementLand) || 0;
                  const pTaxBldg = Number(purchase.fixedAssetTaxSettlementBuilding) || 0;
                  const pTaxTotal = pTaxLand + pTaxBldg;
                  const pSubtotal =
                    (Number(purchase.landPurchasePrice) || 0) +
                    (Number(purchase.buildingPurchasePrice) || 0) +
                    pTaxTotal;

                  return (
                    <div
                      key={purchase.id || pIdx}
                      className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden"
                    >
                      {/* Purchase Card Header */}
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                            {pIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            仕入情報 #{pIdx + 1}
                          </span>
                          <div className="flex items-center space-x-1 ml-1">
                            <input
                              type="text"
                              value={purchase.label || ''}
                              onChange={e =>
                                handleUpdatePurchaseField(pIdx, 'label', e.target.value)
                              }
                              placeholder="区分ラベル(任意: 土地分 / 建物分 / 北側隣地 等)"
                              className="px-2 py-0.5 text-[11px] bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-52"
                            />
                            <div className="hidden sm:flex items-center space-x-1">
                              {['土地分', '建物分', '土地①', '土地②', '持分'].map(preset => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleUpdatePurchaseField(pIdx, 'label', preset)}
                                  className={`px-1.5 py-0.2 rounded text-[10px] border transition-colors cursor-pointer ${
                                    purchase.label === preset
                                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 mr-1.5">この仕入の小計:</span>
                            <span className="text-xs font-bold text-blue-700 font-mono">
                              {formatCurrency(pSubtotal)}
                            </span>
                          </div>
                          {purchases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePurchase(pIdx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer flex items-center space-x-0.5 text-[11px]"
                              title="この仕入情報を削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>削除</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Purchase Card Body */}
                      <div className="p-3.5 space-y-3">
                        {/* 仕入先 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              仕入先 (売主名)
                            </label>
                            <input
                              type="text"
                              value={purchase.sellerName}
                              onChange={e =>
                                handleUpdatePurchaseField(pIdx, 'sellerName', e.target.value)
                              }
                              placeholder="例: 山田中 太郎"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              仕入先の住所
                            </label>
                            <input
                              type="text"
                              value={purchase.sellerAddress}
                              onChange={e =>
                                handleUpdatePurchaseField(pIdx, 'sellerAddress', e.target.value)
                              }
                              placeholder="例: 東京都世田谷区北沢2-10-5"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* 複数仕入時の個別面積（任意） */}
                        {purchases.length > 1 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50/70 p-2.5 rounded border border-slate-200">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                この仕入の対象土地面積 (㎡・任意)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={purchase.landArea !== undefined && purchase.landArea !== null ? purchase.landArea : ''}
                                  onChange={e =>
                                    handleUpdatePurchaseField(
                                      pIdx,
                                      'landArea',
                                      e.target.value === '' ? undefined : parseFloat(e.target.value)
                                    )
                                  }
                                  placeholder="例: 165.29"
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono pr-6"
                                />
                                <span className="absolute right-2 top-1 text-[10px] text-slate-400">㎡</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                この仕入の対象建物面積 (㎡・任意)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={purchase.buildingArea !== undefined && purchase.buildingArea !== null ? purchase.buildingArea : ''}
                                  onChange={e =>
                                    handleUpdatePurchaseField(
                                      pIdx,
                                      'buildingArea',
                                      e.target.value === '' ? undefined : parseFloat(e.target.value)
                                    )
                                  }
                                  placeholder="例: 115.42"
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono pr-6"
                                />
                                <span className="absolute right-2 top-1 text-[10px] text-slate-400">㎡</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 契約日・土地仕入金額・建物仕入金額 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              契約日
                            </label>
                            <DateInput
                              value={purchase.contractDate}
                              onChange={val => handleUpdatePurchaseField(pIdx, 'contractDate', val)}
                              placeholder="例: 260401 または 2026/04/01"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              土地仕入金額 (円・非課税)
                            </label>
                            <input
                              type="number"
                              value={purchase.landPurchasePrice || ''}
                              onChange={e =>
                                handleUpdatePurchaseField(
                                  pIdx,
                                  'landPurchasePrice',
                                  e.target.value === '' ? 0 : parseFloat(e.target.value)
                                )
                              }
                              placeholder="例: 120000000"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {formatCurrency(Number(purchase.landPurchasePrice) || 0)}
                            </p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              建物仕入金額 (円・税込)
                            </label>
                            <input
                              type="number"
                              value={purchase.buildingPurchasePrice || ''}
                              onChange={e =>
                                handleUpdatePurchaseField(
                                  pIdx,
                                  'buildingPurchasePrice',
                                  e.target.value === '' ? 0 : parseFloat(e.target.value)
                                )
                              }
                              placeholder="例: 5500000"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {formatCurrency(Number(purchase.buildingPurchasePrice) || 0)}
                            </p>
                          </div>
                        </div>

                        {/* 固定資産税等精算金 (土地 / 建物 税込入力) */}
                        <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-950 flex items-center space-x-1">
                              <span>固定資産税等精算金 (支払・仕入原価算入)</span>
                            </span>
                            <span className="text-xs font-bold text-blue-700 font-mono">
                              精算金合計: {formatCurrency(pTaxTotal)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                土地分 精算金 (円・非課税)
                              </label>
                              <input
                                type="number"
                                value={purchase.fixedAssetTaxSettlementLand || ''}
                                onChange={e =>
                                  handleUpdatePurchaseField(
                                    pIdx,
                                    'fixedAssetTaxSettlementLand',
                                    e.target.value === '' ? 0 : parseFloat(e.target.value)
                                  )
                                }
                                placeholder="例: 250000"
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                              />
                              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                {formatCurrency(pTaxLand)}
                              </p>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                建物分 精算金 (円・税込)
                              </label>
                              <input
                                type="number"
                                value={purchase.fixedAssetTaxSettlementBuilding || ''}
                                onChange={e =>
                                  handleUpdatePurchaseField(
                                    pIdx,
                                    'fixedAssetTaxSettlementBuilding',
                                    e.target.value === '' ? 0 : parseFloat(e.target.value)
                                  )
                                }
                                placeholder="例: 110000"
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                              />
                              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                {formatCurrency(pTaxBldg)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 手付金 & 決済日 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              手付金額 (円)
                            </label>
                            <input
                              type="number"
                              value={purchase.depositAmount || ''}
                              onChange={e =>
                                handleUpdatePurchaseField(
                                  pIdx,
                                  'depositAmount',
                                  e.target.value === '' ? 0 : parseFloat(e.target.value)
                                )
                              }
                              placeholder="例: 10000000"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {formatCurrency(Number(purchase.depositAmount) || 0)}
                            </p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              手付金の決済日 (支払日)
                            </label>
                            <DateInput
                              value={purchase.depositSettlementDate || ''}
                              onChange={val =>
                                handleUpdatePurchaseField(pIdx, 'depositSettlementDate', val)
                              }
                              placeholder="例: 260410"
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">手付金のみ支払済の判定</p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-emerald-800 mb-0.5 flex items-center space-x-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>本決済日 (残代金決済・引渡支払日)</span>
                            </label>
                            <DateInput
                              value={purchase.settlementDate || ''}
                              onChange={val =>
                                handleUpdatePurchaseField(pIdx, 'settlementDate', val)
                              }
                              placeholder="例: 260530"
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">決済日入力で仕入・棚卸に計上</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 下部の追加ボタン */}
                <button
                  type="button"
                  onClick={handleAddPurchase}
                  className="w-full py-2 px-3 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>別の仕入情報を追加する（土地と建物が別売主・複数筆の合算など）</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 仕入付随費用入力項目 */}
          {activeTab === 'incidental' && (
            <div className="space-y-4">
              {/* 新規付随費用の追加・編集フォーム */}
              <div
                className={`bg-white p-3.5 rounded-lg border transition-all shadow-2xs space-y-3 ${
                  editingCostId
                    ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20'
                    : 'border-slate-200'
                }`}
              >
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {editingCostId ? (
                      <>
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-blue-900">仕入付随費用の編集・更新</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">
                          編集中
                        </span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>仕入付随費用の追加</span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    造成費用、登記費用、仲介手数料、解体費用、測量費用など
                  </span>
                </h3>

                <form onSubmit={handleSaveIncidentalCost} className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  <div className="md:col-span-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        費用の種類 (手入力可) <span className="text-red-500">*</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        list="incidental-cost-suggestions"
                        value={newCostType}
                        onChange={e => setNewCostType(e.target.value)}
                        placeholder="例: 造成費用, 登記費用, 看板設置等"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                      <datalist id="incidental-cost-suggestions">
                        {INCIDENTAL_COST_TYPES.map(type => (
                          <option key={type} value={type} />
                        ))}
                        {/* 既存の付随費用から重複なしでカスタム項目を補完 */}
                        {Array.from(
                          new Set(
                            existingProperties
                              .flatMap(p => p.incidentalCosts || [])
                              .map(c => c.costType)
                              .filter(Boolean)
                          )
                        )
                          .filter(t => !INCIDENTAL_COST_TYPES.includes(t as any))
                          .map(customType => (
                            <option key={customType} value={customType} />
                          ))}
                      </datalist>
                    </div>
                    {/* クイック選択タグ */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['造成費用', '登記費用', '仲介手数料', '解体費用', '測量費用', '印紙税', '修繕・リフォーム費用'].map(
                        preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setNewCostType(preset)}
                            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer border ${
                              newCostType === preset
                                ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {preset}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      相手先 (支払先)
                    </label>
                    <input
                      type="text"
                      value={newCostPayee}
                      onChange={e => setNewCostPayee(e.target.value)}
                      placeholder="例: 大和土木開発株式会社"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        支払日
                      </label>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        空欄で「未払」登録可
                      </span>
                    </div>
                    <DateInput
                      value={newCostPaymentDate}
                      onChange={setNewCostPaymentDate}
                      placeholder="例: 260515 (未入力で未払)"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      ※空欄で登録すると「未払」になり後から支払日を入力できます
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        金額 (円) <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const s = String(newCostAmount).trim();
                          if (!s) {
                            setNewCostAmount('-');
                          } else if (s.startsWith('-')) {
                            setNewCostAmount(s.slice(1));
                          } else {
                            setNewCostAmount('-' + s);
                          }
                        }}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-mono font-semibold cursor-pointer transition-colors"
                        title="プラス・マイナスを切り替え"
                      >
                        ± マイナス切替
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newCostAmount}
                      onChange={e => {
                        const raw = e.target.value
                          .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                          .replace(/[－ー▲△]/g, '-')
                          .replace(/[,，¥円\s]/g, '');
                        if (raw === '' || raw === '-' || /^-?\d*\.?\d*$/.test(raw)) {
                          setNewCostAmount(raw);
                        }
                      }}
                      placeholder="例: 5200000 または -50000"
                      className={`w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono ${
                        String(newCostAmount).startsWith('-') ? 'text-red-600 font-bold' : ''
                      }`}
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {newCostAmount && newCostAmount !== '-' && !isNaN(Number(newCostAmount)) ? (
                        <span className={Number(newCostAmount) < 0 ? 'text-red-600 font-bold' : ''}>
                          {formatCurrency(Number(newCostAmount))}
                        </span>
                      ) : (
                        <span className="text-slate-400">※マイナス（返金・減額等）も入力可</span>
                      )}
                    </p>
                  </div>

                  <div className={editingCostId ? 'md:col-span-2' : 'md:col-span-3'}>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      備考 / 内容明細
                    </label>
                    <input
                      type="text"
                      value={newCostMemo}
                      onChange={e => setNewCostMemo(e.target.value)}
                      placeholder="例: 敷地内アスファルト舗装・給排水引込・擁壁整備"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className={`flex items-end space-x-2 ${editingCostId ? 'md:col-span-2' : ''}`}>
                    {editingCostId ? (
                      <>
                        <button
                          type="submit"
                          className="flex-1 py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>費用を更新する</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditIncidentalCost}
                          className="py-1.5 px-3 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>キャンセル</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="submit"
                        className="w-full py-1.5 px-3 rounded bg-[#001529] hover:bg-[#002244] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>費用を追加</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* 付随費用一覧テーブル */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      登録済みの仕入付随費用一覧 ({incidentalCosts.length}件)
                    </h4>
                    {incidentalCosts.some(c => !c.paymentDate) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        うち未払: {incidentalCosts.filter(c => !c.paymentDate).length}件 (
                        {formatCurrency(
                          incidentalCosts
                            .filter(c => !c.paymentDate)
                            .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
                        )}
                        )
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    累計: {formatCurrency(totalIncidental)}
                  </span>
                </div>

                {incidentalCosts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    登録されている付随費用はありません。上のフォームから追加してください。
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 text-slate-600 border-b border-slate-200 text-[11px]">
                          <th className="py-2 px-3">費用の種類</th>
                          <th className="py-2 px-3">支払先</th>
                          <th className="py-2 px-3">支払日 (未払時は直接入力可)</th>
                          <th className="py-2 px-3 text-right">金額 (円)</th>
                          <th className="py-2 px-3">備考</th>
                          <th className="py-2 px-3 text-center w-20">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {incidentalCosts.map(cost => {
                          const isBeingEdited = editingCostId === cost.id;
                          const isUnpaid = !cost.paymentDate || !cost.paymentDate.trim();
                          return (
                            <tr
                              key={cost.id}
                              className={`transition-colors ${
                                isBeingEdited
                                  ? 'bg-blue-50/90 font-medium border-l-2 border-l-blue-600'
                                  : isUnpaid
                                  ? 'bg-rose-50/30 hover:bg-rose-50/60'
                                  : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                <div className="flex items-center space-x-1.5">
                                  <span>{cost.costType}</span>
                                  {isUnpaid && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                                      未払
                                    </span>
                                  )}
                                  {isBeingEdited && (
                                    <span className="px-1 py-0.2 rounded text-[9px] bg-blue-200 text-blue-900 font-bold">
                                      編集中
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-slate-600">{cost.payee || '-'}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">
                                {isUnpaid ? (
                                  <div className="flex items-center space-x-1.5 max-w-[170px]">
                                    <DateInput
                                      value={cost.paymentDate || ''}
                                      onChange={val => handleQuickUpdateCostPaymentDate(cost.id, val)}
                                      placeholder="支払日を入力 (例:260515)"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-mono font-semibold text-slate-800">
                                      {cost.paymentDate}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-bold font-mono ${
                                  cost.amount < 0 ? 'text-red-600' : 'text-slate-900'
                                }`}
                              >
                                {formatCurrency(cost.amount)}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                                {cost.memo || '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditIncidentalCost(cost)}
                                    className={`p-1 rounded transition-colors cursor-pointer ${
                                      isBeingEdited
                                        ? 'bg-blue-200 text-blue-800'
                                        : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="この付随費用を編集"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveIncidentalCost(cost.id)}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                    title="この付随費用を削除"
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
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 売上・分筆売却情報 */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    売上・分筆売却レコード一覧 ({sales.length}件)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    全部売却または分筆・区画ごとの売却金額、精算金、売上原価を管理
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewSale}
                  className="px-3 py-1.5 rounded bg-[#001529] hover:bg-[#002244] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>売上レコードを追加</span>
                </button>
              </div>

              {sales.length === 0 ? (
                <div className="bg-white p-8 rounded-lg border border-slate-200 text-center space-y-2">
                  <DollarSign className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">売上レコードがまだ登録されていません</p>
                  <p className="text-[11px] text-slate-400">
                    「売上レコードを追加」ボタンをクリックして、買主や売却金額を入力してください。
                  </p>
                  <button
                    type="button"
                    onClick={handleAddNewSale}
                    className="mt-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    最初の売上を登録する
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale, index) => {
                    const isExpanded = editingSaleIndex === index;
                    const saleTaxLand = sale.fixedAssetTaxSettlementLand || 0;
                    const saleTaxBldg = (sale.fixedAssetTaxSettlementBuilding || 0) + (sale.fixedAssetTaxSettlementBuildingTax || 0);
                    const saleTaxTotal = (saleTaxLand + saleTaxBldg) > 0 ? (saleTaxLand + saleTaxBldg) : (sale.fixedAssetTaxSettlement || 0);
                    const saleTotal = (sale.landPrice || 0) + (sale.buildingPrice || 0) + saleTaxTotal;

                    return (
                      <div
                        key={sale.id}
                        className={`bg-white rounded-lg border transition-all ${
                          isExpanded
                            ? 'border-blue-400 ring-1 ring-blue-100 shadow-xs'
                            : 'border-slate-200 shadow-2xs'
                        }`}
                      >
                        {/* Sale Card Header */}
                        <div
                          className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between cursor-pointer rounded-t-lg"
                          onClick={() => setEditingSaleIndex(isExpanded ? null : index)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div>
                              <span className="font-bold text-xs text-slate-900">
                                {sale.buyerName || '(買主未定・入力中)'}
                              </span>
                              {sale.saleCategory === 'partial' && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  一部売却: {sale.partialSaleName || '区画指定なし'}
                                </span>
                              )}
                              {sale.saleCategory === 'full' && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  全部売却 (一括完売)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-500">売上総額 (土地+建物+精算金)</div>
                              <div className="text-xs font-bold text-blue-700 font-mono">
                                {formatCurrency(saleTotal)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleRemoveSale(index);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-200/50 transition-colors"
                              title="売上レコード削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Sale Form Body */}
                        {isExpanded && (
                          <div className="p-3.5 space-y-3">
                            {/* 売却区分・区画名 */}
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                                  売却区分 (全部 or 一部)
                                </label>
                                <select
                                  value={sale.saleCategory}
                                  onChange={e =>
                                    handleUpdateSaleField(index, 'saleCategory', e.target.value as SaleCategory)
                                  }
                                  className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="partial">一部売却 (分筆・分譲・一部持分)</option>
                                  <option value="full">全部売却 (物件全体の完売)</option>
                                </select>
                              </div>

                              {sale.saleCategory === 'partial' && (
                                <div>
                                  <label className="block text-[11px] font-bold text-purple-900 mb-0.5">
                                    区画名 / 号地名 / 持分
                                  </label>
                                  <input
                                    type="text"
                                    value={sale.partialSaleName || ''}
                                    onChange={e =>
                                      handleUpdateSaleField(index, 'partialSaleName', e.target.value)
                                    }
                                    placeholder="例: A区画, 1号地, 持分1/2"
                                    className="w-full px-2 py-1 text-xs bg-white border border-purple-300 rounded focus:outline-hidden focus:ring-1 focus:ring-purple-600 font-semibold text-purple-900"
                                  />
                                </div>
                              )}

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="block text-[11px] font-bold text-slate-700">
                                    売却土地面積 (㎡)
                                  </label>
                                  {typeof landArea === 'number' && landArea > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const rem = calculateRemainingLandArea(index);
                                        handleUpdateSaleField(index, 'soldLandArea', rem > 0 ? rem : landArea);
                                      }}
                                      className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                                      title="全体面積から他の売却面積を差し引いた残余土地面積を自動反映"
                                    >
                                      残面積({calculateRemainingLandArea(index)}㎡)を自動入力
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={sale.soldLandArea !== undefined && sale.soldLandArea !== null ? sale.soldLandArea : ''}
                                    onChange={e =>
                                      handleUpdateSaleField(
                                        index,
                                        'soldLandArea',
                                        e.target.value === '' ? '' : parseFloat(e.target.value)
                                      )
                                    }
                                    placeholder="例: 110.19"
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 pr-6"
                                  />
                                  <span className="absolute right-2 top-1 text-[10px] text-slate-400">㎡</span>
                                </div>
                                {sales.length > 1 && typeof landArea === 'number' && landArea > 0 && (
                                  <p className="text-[10px] text-purple-700 mt-0.5 font-medium">
                                    残余土地面積: {calculateRemainingLandArea(index)}㎡ (全体: {landArea}㎡)
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* 買主情報 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                  買主名 (売上先) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={sale.buyerName}
                                  onChange={e => handleUpdateSaleField(index, 'buyerName', e.target.value)}
                                  placeholder="例: 佐藤 一郎・花子 ご夫妻"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-semibold"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                  買主住所
                                </label>
                                <input
                                  type="text"
                                  value={sale.buyerAddress}
                                  onChange={e => handleUpdateSaleField(index, 'buyerAddress', e.target.value)}
                                  placeholder="例: 東京都目黒区駒場1-4-8"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            {/* 金額・契約日 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                  売買契約日
                                </label>
                                <DateInput
                                  value={sale.contractDate}
                                  onChange={val => handleUpdateSaleField(index, 'contractDate', val)}
                                  placeholder="例: 260501"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                  土地売上金額 (円・非課税)
                                </label>
                                <input
                                  type="number"
                                  value={sale.landPrice || ''}
                                  onChange={e =>
                                    handleUpdateSaleField(
                                      index,
                                      'landPrice',
                                      e.target.value === '' ? '' : parseFloat(e.target.value)
                                    )
                                  }
                                  placeholder="例: 58000000"
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                                />
                                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                  {formatCurrency(sale.landPrice)}
                                </p>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                  建物売上金額 (円・税込)
                                </label>
                                <input
                                  type="number"
                                  value={sale.buildingPrice || ''}
                                  onChange={e =>
                                    handleUpdateSaleField(
                                      index,
                                      'buildingPrice',
                                      e.target.value === '' ? '' : parseFloat(e.target.value)
                                    )
                                  }
                                  placeholder="例: 0"
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                                />
                                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                  {formatCurrency(sale.buildingPrice)}
                                </p>
                              </div>
                            </div>

                            {/* 売上 固定資産税等精算金 (土地 / 建物 税込分割) */}
                            <div className="bg-blue-50/40 p-2.5 rounded border border-blue-100 space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                                <span>固定資産税等精算金 (受取・売上算入)</span>
                                <span className="font-mono text-blue-700">
                                  精算金計: {formatCurrency(saleTaxTotal)}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                    土地分 精算金 (円・非課税)
                                  </label>
                                  <input
                                    type="number"
                                    value={sale.fixedAssetTaxSettlementLand || ''}
                                    onChange={e =>
                                      handleUpdateSaleField(
                                        index,
                                        'fixedAssetTaxSettlementLand',
                                        e.target.value === '' ? '' : parseFloat(e.target.value)
                                      )
                                    }
                                    placeholder="例: 50000"
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                    建物分 精算金 (円・税込)
                                  </label>
                                  <input
                                    type="number"
                                    value={sale.fixedAssetTaxSettlementBuilding || ''}
                                    onChange={e =>
                                      handleUpdateSaleField(
                                        index,
                                        'fixedAssetTaxSettlementBuilding',
                                        e.target.value === '' ? '' : parseFloat(e.target.value)
                                      )
                                    }
                                    placeholder="例: 22000"
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 手付金 & 決済日 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-50/70 p-2.5 rounded border border-slate-200">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                  手付金額 (円)
                                </label>
                                <input
                                  type="number"
                                  value={sale.depositAmount || ''}
                                  onChange={e =>
                                    handleUpdateSaleField(
                                      index,
                                      'depositAmount',
                                      e.target.value === '' ? '' : parseFloat(e.target.value)
                                    )
                                  }
                                  placeholder="例: 3000000"
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                  手付金の決済日 (入金日)
                                </label>
                                <DateInput
                                  value={sale.depositSettlementDate || ''}
                                  onChange={val => handleUpdateSaleField(index, 'depositSettlementDate', val)}
                                  placeholder="例: 260510"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-emerald-800 mb-0.5">
                                  売上決済日 (残代金入金・引渡日)
                                </label>
                                <DateInput
                                  value={sale.settlementDate || ''}
                                  onChange={val => handleUpdateSaleField(index, 'settlementDate', val)}
                                  placeholder="例: 260630"
                                />
                                <p className="text-[10px] text-slate-400 mt-0.5">※後から入力可能</p>
                              </div>
                            </div>

                            {/* 売上原価 & 原価計算プロセス (メモ) */}
                            <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-1.5">
                                  <Calculator className="w-3.5 h-3.5 text-amber-800" />
                                  <span className="text-xs font-bold text-amber-900">
                                    計上売上原価の入力 & 計算プロセス
                                  </span>
                                  {sale.saleCategory === 'full' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                                      全部売却 (原価自動連携)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {sale.saleCategory === 'full' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleApplyFullSaleCOGS(index)}
                                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                                      title="物件の総仕入原価（未計上残額）および一部売却後の残余土地面積を自動反映します"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>残余原価・残面積を自動適用 ({formatCurrency(calculateRemainingAcquisition(index))})</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleApplyAreaProportion(index)}
                                      className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                                    >
                                      <Calculator className="w-3 h-3" />
                                      <span>面積按分で自動計算・入力</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-start">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                                    計上売上原価 (円) <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={sale.costOfGoodsSold || ''}
                                    onChange={e =>
                                      handleUpdateSaleField(
                                        index,
                                        'costOfGoodsSold',
                                        e.target.value === '' ? '' : parseFloat(e.target.value)
                                      )
                                    }
                                    placeholder="例: 44042000"
                                    className="w-full px-2 py-1 text-xs bg-white border border-amber-300 rounded focus:outline-hidden focus:ring-1 focus:ring-amber-600 font-mono font-bold"
                                  />
                                  <div className="flex items-center justify-between text-[10px] text-amber-800 font-semibold mt-0.5 font-mono">
                                    <span>原価: {formatCurrency(sale.costOfGoodsSold)}</span>
                                    {sale.saleCategory === 'full' && sale.costOfGoodsSold !== calculateRemainingAcquisition(index) && (
                                      <button
                                        type="button"
                                        onClick={() => handleApplyFullSaleCOGS(index)}
                                        className="text-emerald-700 underline text-[9px] hover:text-emerald-900 cursor-pointer"
                                      >
                                        総原価に合わせる
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                                    売上原価の計算プロセス (計算根拠メモ)
                                  </label>
                                  <textarea
                                    value={sale.costCalculationNote || ''}
                                    onChange={e =>
                                      handleUpdateSaleField(index, 'costCalculationNote', e.target.value)
                                    }
                                    placeholder="例: 【全部売却】物件の総仕入原価 44,042,000円 を売上原価として全額計上。"
                                    rows={2}
                                    className="w-full px-2 py-1 text-[11px] bg-white border border-amber-300 rounded focus:outline-hidden focus:ring-1 focus:ring-amber-600"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 原価按分・収支シミュレーション */}
          {activeTab === 'calculator' && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center space-x-1.5">
                  <Calculator className="w-3.5 h-3.5 text-slate-900" />
                  <span>物件原価・棚卸残高サマリー</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium">仕入本体合計 (土地+建物+精算金)</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                      {formatCurrency(curLandPrice + curBldgPrice + curFixedTaxTotal)}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium">仕入付随費用累計</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                      {formatCurrency(totalIncidental)}
                    </p>
                  </div>

                  <div className="bg-amber-50/70 p-2.5 rounded border border-amber-200">
                    <span className="text-[10px] text-amber-800 font-medium">総仕入原価 (本体+付随費用)</span>
                    <p className="text-sm font-bold text-amber-900 mt-0.5 font-mono">
                      {formatCurrency(totalAcquisition)}
                    </p>
                  </div>

                  <div className="bg-emerald-50/70 p-2.5 rounded border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-medium">期末棚卸残高 (現在在庫)</span>
                    <p className="text-sm font-bold text-emerald-900 mt-0.5 font-mono">
                      {formatCurrency(endingInventory)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 面積按分電卓カード */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  面積按分原価の計算アシスタント
                </h3>
                <p className="text-[11px] text-slate-600">
                  分筆分譲や一部売却の際、売却した区画の面積比率に応じて原価を算出し、残りを棚卸資産(期末在庫)として管理します。
                </p>

                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    計算式: [総仕入原価 ({formatCurrency(totalAcquisition)})] × [売却面積 (㎡)] ÷ [全体面積 ({Number(landArea) || 0}㎡)]
                  </div>

                  {sales.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-700">登録済み売上レコードへの反映:</div>
                      {sales.map((sale, idx) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs"
                        >
                          <div className="space-x-2">
                            <span className="font-bold text-slate-800">
                              {sale.buyerName || `売上#${idx + 1}`} ({sale.partialSaleName || '区画'})
                            </span>
                            <span className="text-slate-500">面積: {sale.soldLandArea || 0} ㎡</span>
                            <span className="text-slate-500 font-mono">現在原価: {formatCurrency(sale.costOfGoodsSold)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyAreaProportion(idx)}
                            className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            按分計算して適用
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      ※「3. 売上情報」タブで売上レコードを追加すると、ワンクリックで按分原価を適用できます。
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {editingProperty ? '※変更内容は「保存する」を押すまで反映されません' : '※新規物件の登録'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              キャンセル
            </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-[#001529] hover:bg-[#002244] text-white rounded shadow-2xs transition-all cursor-pointer"
              >
                {editingProperty ? '変更を保存する' : '物件を登録する'}
              </button>
            </div>
          </div>
        </>
      )}
    </ResizableModal>
  );
};
