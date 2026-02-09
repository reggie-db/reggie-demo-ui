// Token Input Component
// Token style multi-select input, backed by react-select.

import * as React from "react";

import { TokenInput as ReactSelectTokenInput, TokenSelect } from "./react-select";

interface TokenInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  options?: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /**
   * If true, only allow values from options.
   * This is the "constrained values" mode and uses react-select multi-select.
   */
  restrictToOptions?: boolean;
}

/**
 * This component is kept for backwards compatibility with existing imports.
 * Prefer using `TokenSelect` or `TokenInput` from `ui/react-select.tsx` directly
 * in new code.
 */
export function TokenInput({
  value,
  onChange,
  options = [],
  placeholder = "Type to search",
  className,
  disabled = false,
  restrictToOptions = false,
}: TokenInputProps) {
  const selectOptions = React.useMemo(
    () => options.map((opt) => ({ value: opt, label: opt })),
    [options],
  );

  if (restrictToOptions) {
    return (
      <TokenSelect
        className={className}
        values={value}
        onValuesChange={onChange}
        options={selectOptions}
        placeholder={placeholder}
        isDisabled={disabled}
      />
    );
  }

  return (
    <ReactSelectTokenInput
      className={className}
      values={value}
      onValuesChange={onChange}
      options={selectOptions}
      placeholder={placeholder}
      isDisabled={disabled}
      allowCreate={true}
      isValidNewValue={(val) => val.trim().length > 0}
    />
  );
}
