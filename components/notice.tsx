import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/* An editorial note: icon, a bold title line and a short explanation, on
   the .notice primitive. Use tone="emergency" for poisoning and safety
   escalation. Pass a className only for placement on the page. */
export function Notice({
  icon: Icon,
  title,
  children,
  tone,
  className,
  ...aside
}: {
  icon: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  tone?: "emergency";
  className?: string;
} & Omit<ComponentProps<"aside">, "title" | "children">) {
  return (
    <aside className={["notice notice-block", className].filter(Boolean).join(" ")} data-tone={tone} {...aside}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children ? <p>{children}</p> : null}
      </div>
    </aside>
  );
}
