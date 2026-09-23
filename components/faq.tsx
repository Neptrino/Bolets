import type { DetailsHTMLAttributes, ReactNode } from "react";
import { SectionHeader } from "@/components/page-layout";
import type { FaqEntry } from "@/src/lib/faq-schema";
import styles from "./faq.module.css";

export function FaqList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `${styles.list} ${className}` : styles.list}>{children}</div>;
}

type FaqItemProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "children"> & {
  question: ReactNode;
  answerId?: string;
  children: ReactNode;
};

export function FaqItem({ question, answerId, children, className, ...details }: FaqItemProps) {
  return (
    <details {...details} className={className ? `${styles.item} ${className}` : styles.item}>
      <summary>{question}</summary>
      <div className={styles.answer} id={answerId}>{children}</div>
    </details>
  );
}

/* Renders plain question/answer pairs; pair it with faqPageSchema() on the
   same list so the structured data never drifts from the page. */
export function FaqEntries({ faqs }: { faqs: readonly FaqEntry[] }) {
  return (
    <FaqList>
      {faqs.map((faq) => <FaqItem key={faq.question} question={faq.question}><p>{faq.answer}</p></FaqItem>)}
    </FaqList>
  );
}

type FaqSectionProps = {
  faqs: readonly FaqEntry[];
  title: ReactNode;
  titleId: string;
  id?: string;
  meta?: ReactNode;
  description?: ReactNode;
  size?: "default" | "compact";
  className?: string;
};

export function FaqSection({ faqs, title, titleId, id = "preguntes", meta = "Preguntes freqüents", description, size, className }: FaqSectionProps) {
  if (faqs.length === 0) return null;
  return (
    <section id={id} className={className ? `${styles.section} ${className}` : styles.section} aria-labelledby={titleId}>
      <SectionHeader meta={meta} title={title} titleId={titleId} description={description} size={size} />
      <FaqEntries faqs={faqs} />
    </section>
  );
}
