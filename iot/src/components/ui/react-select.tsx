import * as React from "react";
import Select, {
  type GroupBase,
  type MultiValue,
  type Props as ReactSelectProps,
  type SingleValue,
} from "react-select";
import CreatableSelect from "react-select/creatable";

import { cn } from "./utils";

/**
 * Shared React Select wrappers used for:
 * - constrained single selects (searchable)
 * - token style multi selects (constrained values, optionally creatable)
 *
 * This keeps styling consistent with the existing Tailwind + CSS variable theme.
 */

export type ConstrainedOption<TValue extends string = string> = {
  value: TValue;
  label: string;
  isDisabled?: boolean;
};

type _BaseFieldProps = {
  /** Tailwind class applied to the outer React Select container. */
  className?: string;
  /** Placeholder shown when no value is selected. */
  placeholder?: string;
  /** Disables the control. */
  isDisabled?: boolean;
  /** Use "sm" to align with other compact inputs. */
  size?: "sm" | "default";
  /**
   * Portals the menu to `document.body` to avoid clipping inside overflow containers.
   * This is enabled by default since the app uses dialogs, sheets, and panels.
   */
  menuPortalToBody?: boolean;
};

function _findOptionByValue<TValue extends string>(
  options: readonly ConstrainedOption<TValue>[],
  value: TValue | null | undefined,
): ConstrainedOption<TValue> | null {
  if (!value) {
    return null;
  }

  return options.find((opt) => opt.value === value) ?? null;
}

function _findOptionsByValues<TValue extends string>(
  options: readonly ConstrainedOption<TValue>[],
  values: readonly TValue[] | null | undefined,
): ConstrainedOption<TValue>[] {
  if (!values || values.length === 0) {
    return [];
  }

  const valueSet = new Set(values);
  return options.filter((opt) => valueSet.has(opt.value));
}

function _getControlHeightClasses(size: "sm" | "default") {
  return size === "sm" ? "min-h-8" : "min-h-9";
}

function _getReactSelectClassNames<TValue extends string>(
  size: "sm" | "default",
): ReactSelectProps<ConstrainedOption<TValue>, boolean, GroupBase<ConstrainedOption<TValue>>>["classNames"] {
  const controlHeight = _getControlHeightClasses(size);

  return {
    container: (state) =>
      cn(
        "text-sm",
        state.isDisabled && "opacity-50 cursor-not-allowed",
      ),
    control: (state) =>
      cn(
        controlHeight,
        "border-input bg-input-background text-foreground flex w-full rounded-md border px-3 outline-none transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        state.isFocused && "border-ring ring-ring/50 ring-[3px]",
      ),
    valueContainer: () => cn("gap-1 py-1"),
    placeholder: () => cn("text-muted-foreground"),
    input: () => cn("text-foreground"),
    singleValue: () => cn("text-foreground"),
    indicatorsContainer: () => cn("gap-1"),
    dropdownIndicator: (state) =>
      cn(
        "text-muted-foreground hover:text-foreground px-1",
        state.isFocused && "text-foreground",
      ),
    clearIndicator: () => cn("text-muted-foreground hover:text-foreground px-1"),
    indicatorSeparator: () => cn("bg-border my-2 w-px"),
    menuPortal: () => cn("z-50"),
    menu: () =>
      cn(
        "bg-popover text-popover-foreground z-50 mt-1 rounded-md border shadow-md overflow-hidden",
      ),
    menuList: () => cn("p-1"),
    option: (state) =>
      cn(
        "cursor-default select-none rounded-sm px-2 py-1.5 text-sm outline-none",
        state.isFocused && "bg-accent text-accent-foreground",
        state.isSelected && "bg-accent text-accent-foreground",
        state.isDisabled && "opacity-50 pointer-events-none",
      ),
    multiValue: () => cn("bg-muted rounded-sm"),
    multiValueLabel: () => cn("px-2 py-0.5"),
    multiValueRemove: () =>
      cn(
        "px-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm",
      ),
    noOptionsMessage: () => cn("text-muted-foreground px-2 py-2 text-sm"),
  };
}

type _CommonSelectProps<TValue extends string> = _BaseFieldProps & {
  options: readonly ConstrainedOption<TValue>[];
  /** Allow clearing the selection via the UI. */
  isClearable?: boolean;
  /** Disables the built-in search input. Defaults to searchable. */
  isSearchable?: boolean;
};

export type ConstrainedSelectProps<TValue extends string = string> =
  _CommonSelectProps<TValue> & {
    value: TValue | null;
    onValueChange: (value: TValue | null) => void;
  };

/**
 * Constrained single-select with optional search.
 * Use this for selects where values must be chosen from a known list.
 */
export function ConstrainedSelect<TValue extends string = string>({
  value,
  onValueChange,
  options,
  className,
  placeholder,
  isDisabled,
  isClearable = false,
  isSearchable = true,
  size = "default",
  menuPortalToBody = true,
}: ConstrainedSelectProps<TValue>) {
  const selectedOption = React.useMemo(
    () => _findOptionByValue(options, value),
    [options, value],
  );

  const classNames = React.useMemo(
    () => _getReactSelectClassNames<TValue>(size),
    [size],
  );

  return (
    <Select<ConstrainedOption<TValue>, false, GroupBase<ConstrainedOption<TValue>>>
      unstyled
      className={className}
      classNames={classNames}
      menuPortalTarget={
        menuPortalToBody && typeof document !== "undefined" ? document.body : null
      }
      menuPosition={menuPortalToBody ? "fixed" : "absolute"}
      options={options}
      value={selectedOption}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={isSearchable}
      placeholder={placeholder}
      onChange={(next: SingleValue<ConstrainedOption<TValue>>) =>
        onValueChange(next?.value ?? null)
      }
    />
  );
}

export type TokenSelectProps<TValue extends string = string> =
  _CommonSelectProps<TValue> & {
    values: readonly TValue[];
    onValuesChange: (values: TValue[]) => void;
  };

/**
 * Token-style multi-select for constrained values.
 * This is the "token input" variant when values are chosen from a known list.
 */
export function TokenSelect<TValue extends string = string>({
  values,
  onValuesChange,
  options,
  className,
  placeholder,
  isDisabled,
  isClearable = false,
  isSearchable = true,
  size = "default",
  menuPortalToBody = true,
}: TokenSelectProps<TValue>) {
  const selectedOptions = React.useMemo(
    () => _findOptionsByValues(options, values),
    [options, values],
  );

  const classNames = React.useMemo(
    () => _getReactSelectClassNames<TValue>(size),
    [size],
  );

  return (
    <Select<ConstrainedOption<TValue>, true, GroupBase<ConstrainedOption<TValue>>>
      unstyled
      isMulti
      className={className}
      classNames={classNames}
      menuPortalTarget={
        menuPortalToBody && typeof document !== "undefined" ? document.body : null
      }
      menuPosition={menuPortalToBody ? "fixed" : "absolute"}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      options={options}
      value={selectedOptions}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={isSearchable}
      placeholder={placeholder}
      onChange={(next: MultiValue<ConstrainedOption<TValue>>) =>
        onValuesChange(next.map((opt) => opt.value))
      }
    />
  );
}

export type TokenInputProps<TValue extends string = string> =
  _CommonSelectProps<TValue> & {
    /**
     * Selected values.
     * When `allowCreate` is true, these may include values not present in `options`.
     */
    values: readonly TValue[];
    onValuesChange: (values: TValue[]) => void;
    /**
     * When enabled, users can add new tokens by typing and pressing Enter.
     * Keep this off for fully constrained inputs.
     */
    allowCreate?: boolean;
    /**
     * Optional validation for new token values.
     * This runs only when `allowCreate` is true.
     */
    isValidNewValue?: (value: string) => boolean;
  };

/**
 * Token input that can be constrained (default) or allow creation.
 * Use `TokenSelect` when you never want free-form values.
 */
export function TokenInput<TValue extends string = string>({
  values,
  onValuesChange,
  options,
  className,
  placeholder,
  isDisabled,
  isClearable = false,
  isSearchable = true,
  size = "default",
  menuPortalToBody = true,
  allowCreate = false,
  isValidNewValue,
}: TokenInputProps<TValue>) {
  const selectedOptions = React.useMemo(() => {
    // If allowCreate is enabled, preserve existing values even if they are not in options.
    if (allowCreate) {
      const optionMap = new Map(options.map((opt) => [opt.value, opt]));
      return values.map((v) => optionMap.get(v) ?? { value: v, label: v });
    }

    return _findOptionsByValues(options, values);
  }, [allowCreate, options, values]);

  const classNames = React.useMemo(
    () => _getReactSelectClassNames<TValue>(size),
    [size],
  );

  const commonProps = {
    unstyled: true,
    isMulti: true as const,
    className,
    classNames,
    menuPortalTarget:
      menuPortalToBody && typeof document !== "undefined" ? document.body : null,
    menuPosition: menuPortalToBody ? ("fixed" as const) : ("absolute" as const),
    closeMenuOnSelect: false,
    hideSelectedOptions: false,
    options,
    value: selectedOptions,
    isDisabled,
    isClearable,
    isSearchable,
    placeholder,
    onChange: (next: MultiValue<ConstrainedOption<TValue>>) =>
      onValuesChange(next.map((opt) => opt.value)),
  };

  if (!allowCreate) {
    return (
      <Select<ConstrainedOption<TValue>, true, GroupBase<ConstrainedOption<TValue>>>
        {...commonProps}
      />
    );
  }

  return (
    <CreatableSelect<
      ConstrainedOption<TValue>,
      true,
      GroupBase<ConstrainedOption<TValue>>
    >
      {...commonProps}
      isValidNewOption={(inputValue, selectValue) => {
        const trimmed = inputValue.trim();
        if (!trimmed) {
          return false;
        }

        if (isValidNewValue && !isValidNewValue(trimmed)) {
          return false;
        }

        // Prevent duplicates (case-insensitive) when creating new values.
        const normalized = trimmed.toLowerCase();
        const existing = selectValue.some(
          (opt) => String(opt.value).toLowerCase() === normalized,
        );
        return !existing;
      }}
      formatCreateLabel={(inputValue) => `Add "${inputValue.trim()}"`}
    />
  );
}

