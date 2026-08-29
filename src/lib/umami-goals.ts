export const UMAMI_EVENTS = {
  signupStarted: "signup-started",
  userSignup: "user-signup",
  findingDraftSaved: "finding-draft-saved",
  findingAdded: "finding-added",
  infographicDownloaded: "infographic-downloaded",
  infographicShared: "infographic-shared",
} as const;

export const UMAMI_EVENT_NAMES = Object.values(UMAMI_EVENTS);
export const UMAMI_SIGNUP_COOKIE = "bolets_signup_goal";

type UmamiEventName = (typeof UMAMI_EVENTS)[keyof typeof UMAMI_EVENTS];
type AuthUserTimestamps = {
  created_at?: string;
  last_sign_in_at?: string;
} | null | undefined;

const pendingEventsKey = "bolets:umami-events";
let flushPromise: Promise<void> | null = null;

function pendingEvents(): UmamiEventName[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(pendingEventsKey) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is UmamiEventName =>
        UMAMI_EVENT_NAMES.includes(item as UmamiEventName)).slice(-50)
      : [];
  } catch {
    return [];
  }
}

function writePendingEvents(events: UmamiEventName[]) {
  try {
    if (events.length) window.localStorage.setItem(pendingEventsKey, JSON.stringify(events));
    else window.localStorage.removeItem(pendingEventsKey);
  } catch {
    // Analytics must never interrupt the product flow.
  }
}

export function isNewAuthUser(user: AuthUserTimestamps) {
  const createdAt = Date.parse(user?.created_at ?? "");
  const lastSignInAt = Date.parse(user?.last_sign_in_at ?? "");
  return Number.isFinite(createdAt) &&
    Number.isFinite(lastSignInAt) &&
    Math.abs(lastSignInAt - createdAt) <= 60_000;
}

export function queueUmamiEvent(event: UmamiEventName) {
  if (typeof window === "undefined") return;
  writePendingEvents([...pendingEvents(), event]);
  window.dispatchEvent(new Event("bolets:umami-event"));
  void flushUmamiEvents();
}

export function flushUmamiEvents() {
  if (typeof window === "undefined") return Promise.resolve();
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    if (!window.navigator.onLine) return;
    const tracker = (window as typeof window & {
      umami?: { track: (name: string) => Promise<void> };
    }).umami;
    if (!tracker) return;

    let events = pendingEvents();
    while (events.length) {
      const event = events[0];
      try {
        await tracker.track(event);
      } catch {
        return;
      }
      const currentEvents = pendingEvents();
      const sentEventIndex = currentEvents.indexOf(event);
      if (sentEventIndex >= 0) currentEvents.splice(sentEventIndex, 1);
      writePendingEvents(currentEvents);
      events = pendingEvents();
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}
