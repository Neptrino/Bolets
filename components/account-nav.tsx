import { BookOpen, HandHeart, Sprout, UserRound } from "lucide-react";
import Link from "next/link";

export type AccountSection = "forest" | "findings" | "contributions" | "account";

const accountSections = [
  {
    id: "forest",
    href: "/compte/bosc",
    label: "El meu bosc",
    description: "Lectures i preferències",
    icon: Sprout,
  },
  {
    id: "findings",
    href: "/compte/troballes",
    label: "Quadern",
    description: "Troballes privades",
    icon: BookOpen,
  },
  {
    id: "contributions",
    href: "/compte/col-laboracio",
    label: "Col·laboració",
    description: "Accés al mapa detallat",
    icon: HandHeart,
  },
  {
    id: "account",
    href: "/compte/privadesa",
    label: "Compte i privadesa",
    description: "Identitat, accés i dades",
    icon: UserRound,
  },
] as const satisfies ReadonlyArray<{
  id: AccountSection;
  href: string;
  label: string;
  description: string;
  icon: typeof Sprout;
}>;

export function AccountNav({ current }: { current: AccountSection }) {
  return (
    <nav className="account-nav" aria-label="Seccions del compte">
      {accountSections.map(({ id, href, label, description, icon: Icon }) => (
        <Link
          href={href}
          id={current === "account" && id === "contributions" ? "collaboracio" : undefined}
          aria-current={current === id ? "page" : undefined}
          key={id}
        >
          <Icon size={19} aria-hidden="true" />
          <strong>{label}</strong>
          <small>{description}</small>
        </Link>
      ))}
    </nav>
  );
}
