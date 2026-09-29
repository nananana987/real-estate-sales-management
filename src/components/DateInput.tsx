import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateInputProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

/**
 * ユーザー入力の各種形式（8桁, 6桁, スラッシュ, 和暦など）を YYYY-MM-DD に正規化
 */
export function normalizeDateInput(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // すでに YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 1. 和暦パース (R8.4.1, R8/4/1, 令8.4.1, H30.5.1 等)
  const reiwaMatch = trimmed.match(/^(?:[Rr令]|令和)\s*(\d{1,2})[\.\/\-\s](\d{1,2})[\.\/\-\s](\d{1,2})$/i);
  if (reiwaMatch) {
    const year = 2018 + parseInt(reiwaMatch[1], 10);
    const month = reiwaMatch[2].padStart(2, '0');
    const day = reiwaMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const heiseiMatch = trimmed.match(/^(?:[Hh平]|平成)\s*(\d{1,2})[\.\/\-\s](\d{1,2})[\.\/\-\s](\d{1,2})$/i);
  if (heiseiMatch) {
    const year = 1988 + parseInt(heiseiMatch[1], 10);
    const month = heiseiMatch[2].padStart(2, '0');
    const day = heiseiMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. 8桁数字 (例: 20260401)
  if (/^\d{8}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    const mNum = parseInt(m, 10);
    const dNum = parseInt(d, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 3. 6桁数字 (例: 260401 -> 2026-04-01)
  if (/^\d{6}$/.test(trimmed)) {
    const yy = parseInt(trimmed.slice(0, 2), 10);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy;
    const m = trimmed.slice(2, 4);
    const d = trimmed.slice(4, 6);
    const mNum = parseInt(m, 10);
    const dNum = parseInt(d, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${year}-${m}-${d}`;
    }
  }

  // 4. 4桁数字 (例: 0401 -> 当年-04-01)
  if (/^\d{4}$/.test(trimmed)) {
    const currentYear = new Date().getFullYear();
    const m = trimmed.slice(0, 2);
    const d = trimmed.slice(2, 4);
    const mNum = parseInt(m, 10);
    const dNum = parseInt(d, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${currentYear}-${m}-${d}`;
    }
  }

  // 5. 区切り文字 (2026/4/1, 2026.4.1, 26/4/1 等)
  const parts = trimmed.split(/[\/\-\.\s]/);
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    if (year < 100) {
      year = year >= 70 ? 1900 + year : 2000 + year;
    }
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    const mNum = parseInt(month, 10);
    const dNum = parseInt(day, 10);
    if (year >= 1900 && year <= 2100 && mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 6. 月/日 のみ (例: 4/1, 04/01 -> 当年-04-01)
  if (parts.length === 2) {
    const currentYear = new Date().getFullYear();
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const mNum = parseInt(month, 10);
    const dNum = parseInt(day, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${currentYear}-${month}-${day}`;
    }
  }

  return trimmed;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = '例: 260401 または 2026/04/01',
  className = '',
  disabled = false,
  required = false,
  id,
  name,
}) => {
  const [textVal, setTextVal] = useState(value || '');
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextVal(value || '');
  }, [value]);

  const handleBlur = () => {
    if (!textVal.trim()) {
      if (value !== '') onChange('');
      return;
    }
    const normalized = normalizeDateInput(textVal);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      setTextVal(normalized);
      onChange(normalized);
    } else {
      // 変換できない場合は元の値またはそのまま
      onChange(textVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
  };

  const handleCalendarClick = () => {
    if (hiddenDateRef.current && !disabled) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          hiddenDateRef.current.showPicker();
        } else {
          hiddenDateRef.current.focus();
          hiddenDateRef.current.click();
        }
      } catch {
        hiddenDateRef.current.focus();
      }
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setTextVal(newVal);
    onChange(newVal);
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        id={id}
        name={name}
        value={textVal}
        disabled={disabled}
        required={required}
        onChange={e => setTextVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full pr-8 py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
      />

      {/* Hidden Native Date Input for Picker */}
      <input
        ref={hiddenDateRef}
        type="date"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
        onChange={handleNativePickerChange}
        tabIndex={-1}
        className="sr-only absolute opacity-0 pointer-events-none w-0 h-0"
      />

      {/* Calendar Picker Trigger Icon */}
      <button
        type="button"
        tabIndex={-1}
        onClick={handleCalendarClick}
        disabled={disabled}
        className="absolute right-2 text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer disabled:pointer-events-none"
        title="カレンダーから選択"
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
