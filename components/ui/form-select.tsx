"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type { Ref } from "react";

export type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  value: string;
  options: FormSelectOption[];
  onValueChange: (value: string) => void;
  emptyLabel?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerRef?: Ref<HTMLButtonElement>;
  "aria-label": string;
};

export function FormSelect({
  value,
  options,
  onValueChange,
  emptyLabel,
  disabled = false,
  required = false,
  className,
  triggerRef,
  "aria-label": ariaLabel,
}: FormSelectProps) {
  const items = emptyLabel
    ? [{ value: null, label: emptyLabel }, ...options]
    : options;
  const triggerClassName = ["form-select-trigger", className].filter(Boolean).join(" ");

  return (
    <Select.Root<string>
      value={value || null}
      items={items}
      onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
      disabled={disabled}
      required={required}
    >
      <Select.Trigger ref={triggerRef} className={triggerClassName} aria-label={ariaLabel}>
        <Select.Value className="form-select-value" placeholder={emptyLabel ?? "Selecciona una opció"} />
        <Select.Icon className="form-select-icon"><ChevronDown size={18} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="form-select-positioner" sideOffset={7} align="start" alignItemWithTrigger={false}>
          <Select.Popup className="form-select-popup">
            <Select.List className="form-select-list">
              {emptyLabel ? <Select.Item className="form-select-item" value={null} label={emptyLabel}>
                <Select.ItemIndicator className="form-select-item-indicator" keepMounted><Check size={16} aria-hidden="true" /></Select.ItemIndicator>
                <Select.ItemText>{emptyLabel}</Select.ItemText>
              </Select.Item> : null}
              {options.map((option) => <Select.Item className="form-select-item" value={option.value} label={option.label} key={option.value}>
                <Select.ItemIndicator className="form-select-item-indicator" keepMounted><Check size={16} aria-hidden="true" /></Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>)}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
