"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type PlatformSelectOption<TValue extends string> = {
  value: TValue;
  label: string;
  description?: string;
  disabled?: boolean;
};

type PlatformSelectProps<TValue extends string> = {
  value: TValue;
  options: Array<PlatformSelectOption<TValue>>;
  onChange: (value: TValue) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
};

export function PlatformSelect<TValue extends string>({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select",
  className,
  buttonClassName,
}: PlatformSelectProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  function closeDropdown() {
    setIsOpen(false);
  }

  function toggleDropdown() {
    if (disabled) return;
    setIsOpen((current) => !current);
  }

  function selectOption(option: PlatformSelectOption<TValue>) {
    if (option.disabled) return;

    onChange(option.value);
    closeDropdown();
  }

  return (
    <div
      className={cx("relative", className)}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;

        if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
          closeDropdown();
        }
      }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggleDropdown}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeDropdown();
          }

          if (event.key === "ArrowDown" || event.key === "Enter") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={cx(
          "flex h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left text-sm font-bold outline-none transition",
          "hover:border-[var(--platform-primary)] focus:border-[var(--platform-primary)] focus:ring-4 focus:ring-[var(--platform-primary-soft)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName
        )}
        style={{
          borderColor: "var(--platform-border)",
          background: "var(--platform-surface)",
          color: "var(--platform-text)",
        }}
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedOption?.label || placeholder}
        </span>

        <ChevronDown
          className={cx(
            "h-4 w-4 shrink-0 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border p-1 shadow-2xl"
          style={{
            borderColor: "var(--platform-border)",
            background: "var(--platform-surface)",
            color: "var(--platform-text)",
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={cx(
                  "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition",
                  "hover:bg-[var(--platform-primary-soft)]",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">
                    {option.label}
                  </span>

                  {option.description ? (
                    <span className="mt-0.5 block text-xs font-semibold platform-muted">
                      {option.description}
                    </span>
                  ) : null}
                </span>

                {isSelected ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--platform-primary)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}