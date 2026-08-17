"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Share, SquarePlus } from "lucide-react";

/**
 * The event Chromium fires when the app meets the install criteria. It is not
 * in the DOM lib because no other engine implements it.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isAppleMobile() {
  const { userAgent, maxTouchPoints, platform } = window.navigator;
  // iPadOS 13+ reports itself as a Mac, so a Mac reporting touch points is an
  // iPad rather than a desktop.
  return /iPad|iPhone|iPod/.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches
    // Safari's own flag, which predates display-mode and is still what iOS sets.
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Reads a browser fact that React does not own, without a render-time guess. */
const neverChanges = () => () => undefined;

function useIsInstalled() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(display-mode: standalone)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    isInstalled,
    // On the server, assume installed so the offer never flashes into a page
    // that is about to decide it should not be there.
    () => true,
  );
}

/**
 * Offers to install the app, and says why it matters rather than just naming
 * the action: iOS clears an uninstalled site's storage after about a week, so
 * a downloaded zone only reliably survives in an installed app.
 *
 * Renders nothing at all for anyone who cannot act on it — already installed,
 * or an engine with neither the install event nor the iOS home-screen flow.
 */
export function InstallApp() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [appleInstructions, setAppleInstructions] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const apple = useSyncExternalStore(neverChanges, isAppleMobile, () => false);
  const installed = useIsInstalled();

  useEffect(() => {
    const capture = (event: Event) => {
      // Keep the browser's own banner from appearing so the offer stays in one
      // place, and hold the event for the button.
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installedNow = () => {
      setJustInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installedNow);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installedNow);
    };
  }, []);

  if (installed || justInstalled) return null;
  if (!installPrompt && !apple) return null;

  return (
    <div className="install-app">
      <p className="install-app-reason">
        <strong>Instal·la l’aplicació</strong>
        <span>
          Les zones que descarreguis només es conserven amb seguretat si tens
          l’aplicació instal·lada.
        </span>
      </p>

      {installPrompt ? (
        <button
          type="button"
          className="install-app-button"
          onClick={async () => {
            await installPrompt.prompt();
            await installPrompt.userChoice;
            // The event can only be used once, whatever the answer.
            setInstallPrompt(null);
          }}
        >
          <SquarePlus size={15} aria-hidden="true" /> Instal·la
        </button>
      ) : (
        <button
          type="button"
          className="install-app-button"
          aria-expanded={appleInstructions}
          onClick={() => setAppleInstructions((open) => !open)}
        >
          <SquarePlus size={15} aria-hidden="true" /> Com instal·lar-la
        </button>
      )}

      {appleInstructions ? (
        <p className="install-app-steps">
          Obre el menú de compartir <Share size={14} aria-hidden="true" /> del
          navegador i tria <strong>Afegeix a la pantalla d’inici</strong>.
        </p>
      ) : null}
    </div>
  );
}
