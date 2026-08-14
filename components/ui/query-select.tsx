"use client";

import { Combobox, type ComboboxPortalProps } from "@base-ui/react/combobox";
import { useState, useTransition } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type QuerySelectItem = { value: string; label: string };

type QuerySelectProps = {
  value: string;
  items: QuerySelectItem[];
  parameter?: string;
  variant?: "compact" | "comparison" | "map";
  className?: string;
  portalContainer?: ComboboxPortalProps["container"];
  "aria-label"?: string;
};

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
  "aria-label": ariaLabel = "Seleccioneu una opció"
}: QuerySelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const triggerClassName = [
    "species-select-trigger",
    `species-select-trigger-${variant}`,
    className
  ].filter(Boolean).join(" ");
  const selectedItem = items.find((item) => item.value === value) ?? null;
  const selectedLabel = selectedItem?.label ?? "";
  const [inputValue, setInputValue] = useState(selectedLabel);

  const selectValue = (nextItem: QuerySelectItem | null) => {
    const nextValue = nextItem?.value;
    if (!nextValue || nextValue === value) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set(parameter, nextValue);
    startTransition(() => {
      router.push(`${pathname}?${next}`, { scroll: false });
    });
  };

  return (
    <Combobox.Root
      value={selectedItem}
      items={items}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={selectValue}
      disabled={isPending}
    >
      <Combobox.InputGroup className={triggerClassName} aria-busy={isPending}>
        <Combobox.Input
          className="species-select-input"
          aria-label={ariaLabel}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Combobox.Trigger
          className={`species-select-icon${isPending ? " is-loading" : ""}`}
          aria-hidden="true"
        >
          {isPending ? (
            <LoaderCircle size={variant === "comparison" || variant === "map" ? 20 : 16} aria-hidden="true" />
          ) : (
            <ChevronDown size={variant === "comparison" || variant === "map" ? 20 : 16} aria-hidden="true" />
          )}
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
              <span>No s’ha trobat cap espècie.</span>
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
