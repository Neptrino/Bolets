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
  variant?: "region" | "compact" | "comparison" | "map";
  className?: string;
  portalContainer?: SelectPortalProps["container"];
  "aria-label"?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isRegion = variant === "region";
  const prefix = isRegion ? "region" : "species";
  const triggerClassName = [
    `${prefix}-select-trigger`,
    !isRegion && `species-select-trigger-${variant}`,
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
        <Select.Value className={isRegion ? undefined : "species-select-value"} />
        <Select.Icon className={isRegion ? undefined : `species-select-icon${isPending ? " is-loading" : ""}`}>
          {isPending ? (
            <LoaderCircle size={variant === "comparison" || variant === "map" ? 20 : 16} aria-hidden="true" />
          ) : (
            <ChevronDown size={variant === "comparison" || variant === "map" ? 20 : 16} aria-hidden="true" />
          )}
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Positioner
          align={isRegion ? undefined : "start"}
          alignItemWithTrigger={isRegion ? undefined : false}
          sideOffset={isRegion ? 8 : 7}
          className={`${prefix}-select-positioner`}
        >
          <Select.Popup className={`${prefix}-select-popup${isRegion ? "" : ` species-select-popup-${variant}`}`}>
            <Select.List className={isRegion ? undefined : "species-select-list"}>
              {items.map((item) => (
                <Select.Item key={item.value} value={item.value} className={`${prefix}-select-item`}>
                  <Select.ItemText className={isRegion ? undefined : "species-select-item-text"}>{item.label}</Select.ItemText>
                  <Select.ItemIndicator className={isRegion ? undefined : "species-select-item-indicator"}>
                    <Check size={15} strokeWidth={isRegion ? undefined : 2.4} aria-hidden="true" />
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
