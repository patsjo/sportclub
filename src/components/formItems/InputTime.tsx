import { Input } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ValidTimeTypes = 'HH:mm:ss' | 'HH:mm' | 'mm:ss' | 'mm:ss.SSS';

const autofillZeros = (value: string, format: ValidTimeTypes) => {
  let val = value;
  if (format === 'HH:mm:ss' && val.length === 5) val = `00:${val}`;
  const zeros = format.length - value.length;
  for (let i = 0; i < zeros; i++) val += '0';
  return val;
};

const validValue = (value: string | undefined, format: ValidTimeTypes): string | null => {
  if (!value) return null;
  let val = autofillZeros(value.replace('-', ''), format);
  let valid = false;
  switch (format) {
    case 'HH:mm:ss':
      valid = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/i.test(val);
      break;
    case 'HH:mm':
      valid = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/i.test(val);
      val += ':00';
      break;
    case 'mm:ss':
      valid = /^[0-9][0-9]:[0-5][0-9]$/i.test(val);
      val = '00:' + val;
      break;
    case 'mm:ss.SSS':
      valid = /^[0-9][0-9]:[0-5][0-9].[0-9][0-9][0-9]$/i.test(val);
      val = '00:' + val;
      break;
    default:
  }
  return valid ? val : null;
};

const valueToInnerValue = (value: string | null | undefined, format: ValidTimeTypes): string | undefined =>
  !value ? undefined : format === 'HH:mm' ? value.substr(0, 5) : format.substr(0, 2) === 'mm' ? value.substr(3) : value;

const formatInputValue = (value: string | undefined, format: ValidTimeTypes, allowNegativeTime?: boolean) => {
  const val: { innerValue?: string; value: string | null } = { innerValue: undefined, value: null };
  const isNegative = !!allowNegativeTime && !!value && value.substr(0, 1) === '-';

  if (!value) val.innerValue = undefined;
  else if (format === 'mm:ss.SSS') val.innerValue = value.replace(',', '.').replace(/([^0-9:.])/g, '');
  else
    val.innerValue = value
      .replace(',', ':')
      .replace('.', ':')
      .replace(/([^0-9:])/g, '');

  if (!val.innerValue) return val;

  if (
    format === 'HH:mm:ss' &&
    val.innerValue.length >= 2 &&
    val.innerValue.length <= 3 &&
    !val.innerValue.startsWith('0') &&
    !isNaN(parseInt(val.innerValue))
  ) {
    if (val.innerValue.length === 3 || (val.innerValue.length === 2 && parseInt(val.innerValue) >= 15)) {
      const minutes = parseInt(val.innerValue);
      const hoursString = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
      const minutesString = (minutes % 60).toString().padStart(2, '0');
      val.innerValue = `${hoursString}:${minutesString}:`;
    }
  } else {
    if (val.innerValue.length === 2 && val.innerValue.substr(1, 1) === ':') val.innerValue = `0${val.innerValue}`;
    if (format === 'mm:ss.SSS' && val.innerValue.length === 5) val.innerValue += '.000';
    if (val.innerValue.length === 2 || val.innerValue.length === 5) val.innerValue += ':';
  }

  val.innerValue = val.innerValue.substr(0, format.length);
  val.value = validValue(val.innerValue, format);

  if (isNegative) {
    val.innerValue = `-${val.innerValue}`;
    if (val.value) val.value = `-${val.value}`;
  }

  return val;
};

export const stringToMilliSeconds = (value: string | undefined, format: ValidTimeTypes): number => {
  if (value == null) return 0;
  const isNegative = value.substr(0, 1) === '-';
  let ms = 0;
  switch (format) {
    case 'HH:mm:ss':
      ms =
        3600000 * parseInt(value.replace('-', '').substr(0, 2)) +
        60000 * parseInt(value.replace('-', '').substr(3, 2)) +
        1000 * parseInt(value.replace('-', '').substr(6, 2));
      break;
    case 'HH:mm':
      ms =
        3600000 * parseInt(value.replace('-', '').substr(0, 2)) + 60000 * parseInt(value.replace('-', '').substr(3, 2));
      break;
    case 'mm:ss':
      ms = 60000 * parseInt(value.replace('-', '').substr(0, 2)) + 1000 * parseInt(value.replace('-', '').substr(3, 2));
      break;
    case 'mm:ss.SSS':
      ms =
        60000 * parseInt(value.replace('-', '').substr(0, 2)) +
        1000 * parseInt(value.replace('-', '').substr(3, 2)) +
        parseInt(value.replace('-', '').substr(6, 3));
      break;
    default:
  }
  if (isNaN(ms)) ms = 0;
  if (isNegative) ms *= -1;

  return ms;
};

const milliSecondsToString = (value: number, format: ValidTimeTypes): string | undefined => {
  const isNegativeStr = value < 0 ? '-' : '';
  const ms = Math.abs(value);
  const msString = ('000' + (ms % 1000)).slice(-3);
  const s = Math.trunc(ms / 1000);
  const sString = ('00' + (s % 60)).slice(-2);
  const m = Math.trunc(s / 60);
  const mString = format.substr(0, 2) === 'mm' ? ('00' + (m % 100)).slice(-2) : ('00' + (m % 60)).slice(-2);
  const h = Math.trunc(m / 60);
  const hString = ('00' + (h % 60)).slice(-2);

  switch (format) {
    case 'HH:mm:ss':
      return `${isNegativeStr}${hString}:${mString}:${sString}`;
    case 'HH:mm':
      return `${isNegativeStr}${hString}:${mString}`;
    case 'mm:ss':
      return `${isNegativeStr}${mString}:${sString}`;
    case 'mm:ss.SSS':
      return `${isNegativeStr}${mString}:${sString}.${msString}`;
      break;
    default:
  }
  return undefined;
};

const increaseInputValue = (
  value: string | undefined,
  increaseValue: -1 | 1,
  selectionStart: number | null,
  selectionEnd: number | null,
  format: ValidTimeTypes,
  allowNegativeTime?: boolean
): string | undefined => {
  if (value == null || selectionStart == null || selectionEnd == null) return value;
  const ms = stringToMilliSeconds(value, format);
  const leastValue = !allowNegativeTime
    ? 0
    : format === 'HH:mm:ss'
    ? -86399000
    : format === 'HH:mm'
    ? -86340000
    : format === 'mm:ss'
    ? -5999000
    : -5999900;
  const greatestValue =
    format === 'HH:mm:ss' ? 86399000 : format === 'HH:mm' ? 86340000 : format === 'mm:ss' ? 5999000 : 5999900;
  const isNegativeAdd = value.substr(0, 1) === '-' ? 1 : 0;
  const start = selectionStart < 3 + isNegativeAdd ? 0 : selectionStart < 6 + isNegativeAdd ? 3 : 6;
  const end = selectionEnd < 3 + isNegativeAdd ? 2 : selectionEnd < 6 + isNegativeAdd ? 5 : format.length;
  if (end - start > 3) return value;
  const sectionFormat = format.substr(start, end - start);
  let absIncreaseValue = 0;

  switch (sectionFormat) {
    case 'HH':
      absIncreaseValue = 3600000;
      break;
    case 'mm':
      absIncreaseValue = 60000;
      break;
    case 'ss':
      absIncreaseValue = ms % 1000 === 0 ? 1000 : (1000 - increaseValue * (ms % 1000)) % 1000;
      break;
    case 'SSS':
      absIncreaseValue = ms % 100 === 0 ? 100 : (100 - increaseValue * (ms % 100)) % 100;
      break;
    default:
  }

  let val = ms + increaseValue * absIncreaseValue;
  if (val < leastValue) val = ms;
  if (val > greatestValue) val = ms;

  return milliSecondsToString(val, format);
};

interface IInputTimeProps {
  format: ValidTimeTypes;
  disabled?: boolean;
  allowClear?: boolean;
  allowNegativeTime?: boolean;
  style?: React.CSSProperties;
  value?: string | null;
  onChange?: (value: string | null) => void;
}
const InputTime = ({ format, disabled, allowClear, allowNegativeTime, style, value, onChange }: IInputTimeProps) => {
  const inputRef = useRef<Input>(null);
  const selectionStartRef = useRef<number | null>(null);
  const selectionEndRef = useRef<number | null>(null);
  const placeholder = useMemo(() => `Ex: ${format.replace(/([A-Z]|[a-z])/g, '0')}`, [format]);
  const [innerValue, setInnerValue] = useState(valueToInnerValue(value, format));

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const values = formatInputValue(e.target.value, format, allowNegativeTime);
    setInnerValue(values.innerValue ? values.innerValue : undefined);
  }, []);

  const onBlur = useCallback(() => {
    const values = formatInputValue(innerValue, format, allowNegativeTime);
    onChange && onChange(values.value);
    setInnerValue(valueToInnerValue(values.value, format));
  }, [innerValue]);

  const onKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.stopPropagation();
        const values = formatInputValue(innerValue, format, allowNegativeTime);
        setInnerValue(valueToInnerValue(values.value, format));
      }
    },
    [innerValue]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      selectionStartRef.current = target.selectionStart;
      selectionEndRef.current = target.selectionEnd;
      if (e.key === 'ArrowUp') {
        e.stopPropagation();
        e.preventDefault();
        const values = formatInputValue(innerValue, format, allowNegativeTime);
        if (values.value) {
          const newValue = increaseInputValue(
            values.innerValue,
            1,
            target.selectionStart,
            target.selectionEnd,
            format,
            allowNegativeTime
          );
          setInnerValue(newValue);
          window.requestAnimationFrame(() => {
            target.setSelectionRange(selectionStartRef.current, selectionEndRef.current);
          });
        }
      }
      if (e.key === 'ArrowDown') {
        e.stopPropagation();
        e.preventDefault();
        const values = formatInputValue(innerValue, format, allowNegativeTime);
        if (values.value) {
          const newValue = increaseInputValue(
            values.innerValue,
            -1,
            target.selectionStart,
            target.selectionEnd,
            format,
            allowNegativeTime
          );
          setInnerValue(newValue);
          window.requestAnimationFrame(() => {
            target.setSelectionRange(selectionStartRef.current, selectionEndRef.current);
          });
        }
      }
    },
    [innerValue]
  );

  useEffect(() => {
    setInnerValue(valueToInnerValue(value, format));
  }, [value]);

  return (
    <Input
      ref={inputRef}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      style={style}
      value={innerValue}
      onChange={onInputChange}
      onKeyDown={onKeyDown}
      onKeyPress={onKeyPress}
      onBlur={onBlur}
    />
  );
};

export default InputTime;
