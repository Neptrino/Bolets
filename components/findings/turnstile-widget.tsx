"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
};

function api() {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

export function TurnstileWidget({
  action,
  onToken,
}: {
  action: string;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const render = useCallback(() => {
    if (!siteKey || !containerRef.current || widgetRef.current || !api()) return;
    widgetRef.current = api()!.render(containerRef.current, {
      sitekey: siteKey,
      action,
      language: "auto",
      theme: "light",
      appearance: "interaction-only",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  }, [action, onToken, siteKey]);

  useEffect(() => {
    render();
    return () => {
      if (widgetRef.current && api()) api()!.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [render]);

  if (!siteKey) return <p className="finding-notice" data-tone="danger">La verificació anti-brossa no està configurada.</p>;
  return <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} />
    <div ref={containerRef} className="finding-turnstile" aria-label="Verificació anti-brossa" />
  </>;
}
