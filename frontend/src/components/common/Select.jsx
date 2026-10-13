import React, { useRef, useCallback } from 'react';
import ReactSelect from 'react-select';
import AsyncReactSelect from 'react-select/async';

const customSelectStyles = (size = 'md') => ({
  control: (base, state) => ({
    ...base,
    minHeight: size === 'sm' ? '34px' : '40px',
    height: size === 'sm' ? '34px' : '40px',
    backgroundColor: '#ffffff',
    borderColor: state.isFocused ? '#ef4444' : '#e2e8f0',
    borderRadius: '0.75rem', // rounded-xl
    fontSize: size === 'sm' ? '11px' : '12px',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#ef4444' : '#cbd5e1',
    },
    transition: 'all 0.15s ease-in-out',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 10px',
    height: size === 'sm' ? '32px' : '38px',
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: '#0f172a',
    fontSize: size === 'sm' ? '11px' : '12px',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
    fontSize: size === 'sm' ? '11px' : '12px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#0f172a',
    fontWeight: '600',
    fontSize: size === 'sm' ? '11px' : '12px',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #f1f5f9',
    zIndex: 9999,
    overflow: 'hidden',
    marginTop: '4px',
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
    maxHeight: '220px',
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    margin: '1px 0',
    padding: size === 'sm' ? '6px 10px' : '8px 12px',
    fontSize: size === 'sm' ? '11px' : '12px',
    fontWeight: state.isSelected ? '700' : '500',
    backgroundColor: state.isSelected
      ? '#dc2626' // red-600
      : state.isFocused
      ? '#fef2f2' // red-50
      : 'transparent',
    color: state.isSelected ? '#ffffff' : state.isFocused ? '#b91c1c' : '#334155',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: state.isSelected ? '#dc2626' : '#fee2e2',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    padding: '0 8px',
    color: state.isFocused ? '#ef4444' : '#94a3b8',
    '&:hover': {
      color: '#64748b',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: '0 6px',
    color: '#94a3b8',
    '&:hover': {
      color: '#ef4444',
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: '11px',
    color: '#94a3b8',
    padding: '10px',
  }),
  loadingMessage: (base) => ({
    ...base,
    fontSize: '11px',
    color: '#94a3b8',
    padding: '10px',
  }),
});

/**
 * Standard styled Select component with full React-Select features
 */
export const Select = ({
  options = [],
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  isSearchable = true,
  isClearable = false,
  isDisabled = false,
  size = 'md',
  className = '',
  id,
  name,
  noOptionsMessage = () => 'Tidak ada opsi ditemukan',
  ...props
}) => {
  // Normalize value: if primitive string/number is passed, match with option
  const selectedOption =
    typeof value === 'object' && value !== null
      ? value
      : options.find((opt) => String(opt.value) === String(value)) || null;

  const handleChange = (selected) => {
    if (!onChange) return;
    onChange(selected);
  };

  return (
    <div className={className}>
      <ReactSelect
        id={id}
        name={name}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isSearchable={isSearchable}
        isClearable={isClearable}
        isDisabled={isDisabled}
        styles={customSelectStyles(size)}
        noOptionsMessage={noOptionsMessage}
        {...props}
      />
    </div>
  );
};

/**
 * Debounced AsyncSelect component with API search integration
 */
export const DebouncedAsyncSelect = ({
  loadOptions, // async (searchTerm) => options array
  value,
  onChange,
  placeholder = 'Ketik untuk mencari...',
  debounceMs = 350,
  defaultOptions = true,
  isClearable = false,
  isDisabled = false,
  size = 'md',
  className = '',
  id,
  name,
  noOptionsMessage = ({ inputValue }) =>
    inputValue ? `Tidak ada hasil untuk "${inputValue}"` : 'Ketik untuk mencari dari database...',
  loadingMessage = () => 'Mencari data...',
  ...props
}) => {
  const timerRef = useRef(null);

  // Debounced wrapper for loadOptions
  const debouncedLoadOptions = useCallback(
    (inputValue, callback) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        try {
          const results = await loadOptions(inputValue);
          callback(results || []);
        } catch (err) {
          callback([]);
        }
      }, debounceMs);
    },
    [loadOptions, debounceMs]
  );

  return (
    <div className={className}>
      <AsyncReactSelect
        id={id}
        name={name}
        loadOptions={debouncedLoadOptions}
        defaultOptions={defaultOptions}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        isClearable={isClearable}
        isDisabled={isDisabled}
        styles={customSelectStyles(size)}
        noOptionsMessage={noOptionsMessage}
        loadingMessage={loadingMessage}
        {...props}
      />
    </div>
  );
};
