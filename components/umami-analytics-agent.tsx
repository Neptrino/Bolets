"use client";

import { useEffect } from "react";
import {
  flushUmamiEvents,
  queueUmamiEvent,
  UMAMI_EVENTS,
  UMAMI_SIGNUP_COOKIE,
} from "@/src/lib/umami-goals";

export function UmamiAnalyticsAgent() {
  useEffect(() => {
    const signupCookie = document.cookie
      .split(";")
      .some((item) => item.trim() === `${UMAMI_SIGNUP_COOKIE}=1`);
    if (signupCookie) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${UMAMI_SIGNUP_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
      queueUmamiEvent(UMAMI_EVENTS.userSignup);
    }

    const flush = () => void flushUmamiEvents();
    window.addEventListener("bolets:umami-event", flush);
    window.addEventListener("online", flush);
    let attempts = 0;
    const timer = window.setInterval(() => {
      flush();
      attempts += 1;
      if (attempts >= 20) window.clearInterval(timer);
    }, 250);
    flush();

    return () => {
      window.removeEventListener("bolets:umami-event", flush);
      window.removeEventListener("online", flush);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
