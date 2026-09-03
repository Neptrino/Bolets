import type { ReactNode } from "react";

import styles from "./page-layout.module.css";

type PageShellProps = {
  as?: "div" | "section" | "article";
  children: ReactNode;
  className?: string;
};

type PageHeaderProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  titleAs?: "h1" | "h2" | "div";
  actions?: ReactNode;
  description?: ReactNode;
  layout?: "stacked" | "split";
  tone?: "clay" | "forest" | "danger";
  className?: string;
};

type PageTitleAccentProps = {
  children: ReactNode;
};

type SectionHeaderProps = {
  meta?: ReactNode;
  title: ReactNode;
  titleId?: string;
  actions?: ReactNode;
  description?: ReactNode;
  className?: string;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function PageShell({
  as: Element = "div",
  children,
  className,
}: PageShellProps) {
  return (
    <Element
      className={joinClassNames("page-width", styles.pageShell, className)}
      data-page-shell
    >
      {children}
    </Element>
  );
}

export function PageHeader({
  eyebrow,
  title,
  titleAs: TitleElement = "h1",
  actions,
  description,
  layout = "stacked",
  tone = "clay",
  className,
}: PageHeaderProps) {
  return (
    <header
      className={joinClassNames(
        styles.pageHeader,
        styles[layout],
        styles[tone],
        className,
      )}
      data-layout={layout}
      data-page-header
    >
      <div className={styles.pageHeading}>
        <p className={joinClassNames("eyebrow", styles.eyebrow)}>{eyebrow}</p>
        <div className={styles.pageTitleRow}>
          <TitleElement className={styles.pageTitle}>{title}</TitleElement>
          {actions !== undefined && actions !== null ? (
            <div className={styles.pageActions}>{actions}</div>
          ) : null}
        </div>
      </div>
      {description !== undefined && description !== null ? (
        <p className={styles.pageDescription}>{description}</p>
      ) : null}
    </header>
  );
}

export function PageTitleAccent({ children }: PageTitleAccentProps) {
  return <span className={styles.pageTitleAccent}>{children}</span>;
}

export function SectionHeader({
  meta,
  title,
  titleId,
  actions,
  description,
  className,
}: SectionHeaderProps) {
  return (
    <header
      className={joinClassNames(styles.sectionHeader, className)}
      data-section-header
    >
      <div className={styles.sectionHeading}>
        {meta !== undefined && meta !== null ? (
          <div className={styles.sectionMeta}>{meta}</div>
        ) : null}
        <h2 className={styles.sectionTitle} id={titleId}>{title}</h2>
        {description !== undefined && description !== null ? (
          <p className={styles.sectionDescription}>{description}</p>
        ) : null}
      </div>
      {actions !== undefined && actions !== null ? (
        <div className={styles.sectionActions}>{actions}</div>
      ) : null}
    </header>
  );
}
