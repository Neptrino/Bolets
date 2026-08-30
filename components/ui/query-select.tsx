"use client";

import { Combobox, type ComboboxPortalProps } from "@base-ui/react/combobox";
import { useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  queueUmamiEvent,
  type UmamiEventName,
} from "@/src/lib/umami-goals";

export type QuerySelectItem = { value: string; label: string };

type SearchSelectProps = {
  value: QuerySelectItem | null;
  items: QuerySelectItem[];
  onValueChange: (item: QuerySelectItem) => void;
  variant?: "compact" | "comparison" | "map" | "preference";
  className?: string;
  portalContainer?: ComboboxPortalProps["container"];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  resetOnSelect?: boolean;
  "aria-label"?: string;
};

type QuerySelectProps = {
  value: string;
  items: QuerySelectItem[];
  parameter?: string;
  variant?: "compact" | "comparison" | "map";
  className?: string;
  portalContainer?: ComboboxPortalProps["container"];
  analyticsEvent?: UmamiEventName;
  "aria-label"?: string;
};

export function SearchSelect(props: SearchSelectProps) {
  return <SearchSelectControl key={props.value?.value ?? "empty"} {...props} />;
}

function SearchSelectControl({
  value,
  items,
  onValueChange,
  variant = "compact",
  className,
  portalContainer,
  placeholder,
  emptyMessage = "No s’ha trobat cap opció.",
  disabled = false,
  resetOnSelect = false,
  "aria-label": ariaLabel = "Selecciona una opció",
}: SearchSelectProps) {
  const [inputValue, setInputValue] = useState(value?.label ?? "");
  const triggerClassName = [
    "species-select-trigger",
    `species-select-trigger-${variant}`,
    className,
  ].filter(Boolean).join(" ");

  const selectValue = (nextItem: QuerySelectItem | null) => {
    if (!nextItem || nextItem.value === value?.value) return;
    onValueChange(nextItem);
    if (resetOnSelect) setInputValue("");
  };

  return (
    <Combobox.Root
      value={value}
      items={items}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={selectValue}
      disabled={disabled}
    >
      <Combobox.InputGroup className={triggerClassName} aria-busy={disabled}>
        <Combobox.Input
          className="species-select-input"
          aria-label={ariaLabel}
          placeholder={placeholder}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Combobox.Trigger className="species-select-icon" aria-label="Mostra les opcions">
          <ChevronDown size={variant === "comparison" || variant === "map" ? 20 : 16} aria-hidden="true" />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal container={portalContainer}>
        <Combobox.Positioner
          align="start"
          sideOffset={7}
          className="species-select-positioner"
        >
          <Combobox.Popup className={`species-select-popup species-select-popup-${variant}`}>
            <Combobox.Empty className="species-select-empty">
              <span>{emptyMessage}</span>
            </Combobox.Empty>
            <Combobox.List className="species-select-list">
              {(item: QuerySelectItem) => (
                <Combobox.Item key={item.value} value={item} className="species-select-item">
                  <Combobox.ItemIndicator className="species-select-item-indicator">
                    <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                  </Combobox.ItemIndicator>
                  <span className="species-select-item-text">{item.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

export function QuerySelect(props: QuerySelectProps) {
  return <QuerySelectControl key={props.value} {...props} />;
}

function QuerySelectControl({
  value,
  items,
  parameter = "species",
  variant = "compact",
  className,
  portalContainer,
  analyticsEvent,
  "aria-label": ariaLabel = "Selecciona una opció"
}: QuerySelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const selectedItem = items.find((item) => item.value === value) ?? null;

  const selectValue = (nextItem: QuerySelectItem) => {
    if (nextItem.value === value) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set(parameter, nextItem.value);
    if (analyticsEvent) queueUmamiEvent(analyticsEvent);
    startTransition(() => {
      router.push(`${pathname}?${next}`, { scroll: false });
    });
  };

  return (
    <SearchSelect
      value={selectedItem}
      items={items}
      onValueChange={selectValue}
      variant={variant}
      className={className}
      portalContainer={portalContainer}
      disabled={isPending}
      aria-label={ariaLabel}
    />
  );
}
