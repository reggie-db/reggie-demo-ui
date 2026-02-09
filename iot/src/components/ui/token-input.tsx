// Token Input Component
// Multi-select input with token/chip display and autocomplete

import { Check, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from './badge';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './command';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from './utils';

interface TokenInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  options?: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  restrictToOptions?: boolean; // If true, only allow values from options
}

export function TokenInput({
  value,
  onChange,
  options = [],
  placeholder = 'Type and press Enter',
  className,
  disabled = false,
  restrictToOptions = false,
}: TokenInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug: log options when they change
  useEffect(() => {
    if (options.length > 0) {
      console.log(`TokenInput options updated: ${options.length} options`, options.slice(0, 10));
    }
  }, [options]);

  // Filter options based on input and exclude already selected values
  const filteredOptions = useMemo(() => {
    // Filter out already selected values
    const available = options.filter((opt) => !value.includes(opt));

    if (!inputValue.trim()) {
      // Show all available options when input is empty (up to 50)
      return available.slice(0, 50);
    }
    // Filter by input value
    return available
      .filter((opt) => opt.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, 50); // Limit to 50 suggestions
  }, [inputValue, options, value]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const trimmed = inputValue.trim();

      // If restrictToOptions is true, only allow values from options
      if (restrictToOptions && !options.includes(trimmed)) {
        return; // Don't add if not in options
      }

      if (!value.includes(trimmed)) {
        onChange([...value, trimmed]);
        setInputValue('');
        setOpen(false);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last token on backspace when input is empty
      onChange(value.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleRemoveToken = (tokenToRemove: string) => {
    onChange(value.filter((token) => token !== tokenToRemove));
  };

  const handleSelectOption = (option: string) => {
    if (!value.includes(option)) {
      onChange([...value, option]);
      setInputValue('');
      setOpen(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            'flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-sm',
            'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && inputRef.current?.focus()}
        >
          {value.map((token) => (
            <Badge
              key={token}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {token}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveToken(token);
                  }}
                  className="ml-1 rounded-full hover:bg-slate-400 focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          <PopoverTrigger asChild>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Keep popover open when typing
                if (!open) {
                  setOpen(true);
                }
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={() => {
                // Always open popover on focus to show available options
                setOpen(true);
              }}
              placeholder={value.length === 0 ? placeholder : ''}
              disabled={disabled}
              className="flex-1 min-w-[120px] border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandList>
              {filteredOptions.length === 0 && (
                <CommandEmpty>
                  {options.length === 0
                    ? 'Loading options...'
                    : restrictToOptions
                      ? (inputValue.trim()
                        ? `No matching options. ${options.length} total available.`
                        : `No options available. ${options.length} total.`)
                      : inputValue.trim()
                        ? `Press Enter to add "${inputValue.trim()}"`
                        : 'Start typing to search'}
                </CommandEmpty>
              )}
              {filteredOptions.length > 0 && (
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => handleSelectOption(option)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value.includes(option) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
