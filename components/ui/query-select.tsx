"use client";

import { Select, type SelectPortalProps } from "@base-ui/react/select";
import { useTransition } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type QuerySelectItem = { value: string; label: string };

export function QuerySelect({
  value,
  items,
  parameter = "species",
  variant = "compact",
  className,
  portalContainer,
  "aria-label": ariaLabel = "Selecciona una opció"
}: {
  value: string;
  items: QuerySelectItem[];
  parameter?: string;
  variant?: "compact" | "comparison" | "map";
  className?: string;
  portalContainer?: SelectPortalProps["container"];
  "aria-label"?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const triggerClassName = [
    "species-select-trigger",
    `species-select-trigger-${variant}`,
    className
  ].filter(Boolean).join(" ");

  const selectValue = (nextValue: string | null) => {
    if (!nextValue || nextValue === value) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set(parameter, nextValue);
    startTransition(() => {
      router.push(`${pathname}?${next}`, { scroll: false });
    });
  };

  return (
    <Select.Root value={value} items={items} onValueChange={selectValue} disabled={isPending}>
      <Select.Trigger className={triggerClassName} aria-label={ariaLabel} aria-busy={isPending}>
        <Select.Value className="species-select-value" />
        <Select.Icon className={`species-select-icon${isPending ? " is-loading" : ""}`}>
          {isPending ? (
            <LoaderCircle size={variant === "comparison" || variant === "map" ? 20 : 16} aria-hidden="true" />
          ) : (
            <ChevronDown size={variant === "comparison" || variant === "map" ? 20 : 16} aria-hidden="true" />
          )}
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Positioner
          align="start"
          alignItemWithTrigger={false}
          sideOffset={7}
          className="species-select-positioner"
        >
          <Select.Popup className={`species-select-popup species-select-popup-${variant}`}>
            <Select.List className="species-select-list">
              {items.map((item) => (
                <Select.Item key={item.value} value={item.value} className="species-select-item">
                  <Select.ItemText className="species-select-item-text">{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="species-select-item-indicator">
                    <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
