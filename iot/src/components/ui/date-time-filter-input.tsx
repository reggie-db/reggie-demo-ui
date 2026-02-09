"use client";

import * as React from "react";
import parser from "any-date-parser";
import { Calendar as CalendarIcon, X as ClearIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

type _DateTimeFilterInputProps = {
  /** Used for label association and test targeting. */
  id: string;
  /** ISO string used by APIs (UTC). */
  value?: string;
  /** Called with a new ISO string (UTC) or undefined when cleared. */
  onValueChange: (next?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const _toDisplayString = (iso?: string): string => {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  // Display in local time to match user intent while storing ISO (UTC).
  return format(date, "yyyy-MM-dd HH:mm");
};

const _toTimeString = (iso?: string): string => {
  if (!iso) return "00:00";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "00:00";

  return format(date, "HH:mm");
};

const _applyDateAndTime = (date: Date, time: string): Date => {
  const next = new Date(date);
  const [hStr, mStr] = time.split(":");
  const hours = Number.parseInt(hStr || "0", 10);
  const minutes = Number.parseInt(mStr || "0", 10);

  // Use local time parts; final storage is UTC via toISOString().
  next.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return next;
};

const _parseFreeformToDate = (raw: string): Date | undefined => {
  const text = raw.trim();
  if (!text) return undefined;

  // any-date-parser returns a MaybeValidDate (subclass of Date) with `isValid()`.
  const parsed: any = parser.fromString(text);
  const isValid =
    parsed &&
    typeof parsed.isValid === "function" &&
    parsed.isValid() === true &&
    !Number.isNaN(new Date(parsed).getTime());

  if (!isValid) return undefined;
  return new Date(parsed);
};

/**
 * Date-time filter input that supports:
 * - Freeform typing (parsed by any-date-parser on blur / Enter)
 * - Calendar selection via popover (date) plus time input
 *
 * Stores filter values as ISO strings (UTC) via `toISOString()`.
 */
function DateTimeFilterInput({
  id,
  value,
  onValueChange,
  placeholder = "e.g. yesterday 5pm, 2026-02-01 13:00",
  disabled,
  className,
}: _DateTimeFilterInputProps) {
  const [draft, setDraft] = React.useState<string>(() => _toDisplayString(value));
  const [invalid, setInvalid] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const [calendarDate, setCalendarDate] = React.useState<Date | undefined>(() => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  });
  const [time, setTime] = React.useState<string>(() => _toTimeString(value));

  // Keep local UI in sync with external filter state when not actively editing.
  React.useEffect(() => {
    if (isFocused) return;
    setDraft(_toDisplayString(value));
    setInvalid(false);
    setCalendarDate(value ? new Date(value) : undefined);
    setTime(_toTimeString(value));
  }, [value, isFocused]);

  const commitDraft = React.useCallback(() => {
    const text = draft.trim();
    if (!text) {
      setInvalid(false);
      setCalendarDate(undefined);
      setTime("00:00");
      onValueChange(undefined);
      return;
    }

    const parsedDate = _parseFreeformToDate(text);
    if (!parsedDate) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setCalendarDate(parsedDate);
    setTime(format(parsedDate, "HH:mm"));
    setDraft(_toDisplayString(parsedDate.toISOString()));
    onValueChange(parsedDate.toISOString());
  }, [draft, onValueChange]);

  const applyCalendarSelection = React.useCallback(
    (nextDate: Date) => {
      const withTime = _applyDateAndTime(nextDate, time);
      setCalendarDate(withTime);
      setInvalid(false);
      setDraft(_toDisplayString(withTime.toISOString()));
      onValueChange(withTime.toISOString());
    },
    [onValueChange, time],
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        id={id}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          commitDraft();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        className={cn(
          invalid ? "border-destructive focus-visible:border-destructive" : undefined,
        )}
      />

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label="Open calendar"
          >
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex flex-col gap-3">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={(d) => {
                if (!d) return;
                applyCalendarSelection(d);
              }}
              initialFocus
            />

            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={time}
                onChange={(e) => {
                  const nextTime = e.target.value;
                  setTime(nextTime);
                  if (calendarDate) {
                    applyCalendarSelection(calendarDate);
                  }
                }}
                disabled={disabled}
                aria-label="Time"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDraft("");
                  setInvalid(false);
                  setCalendarDate(undefined);
                  setTime("00:00");
                  onValueChange(undefined);
                  setCalendarOpen(false);
                }}
                disabled={disabled}
                aria-label="Clear"
              >
                <ClearIcon className="size-4" />
              </Button>
            </div>

            {invalid && (
              <div className="text-xs text-destructive">
                Unable to parse that date and time. Try an ISO date, a common format, or "yesterday 5pm".
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DateTimeFilterInput };

