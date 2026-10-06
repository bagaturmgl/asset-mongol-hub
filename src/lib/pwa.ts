import { useSyncExternalStore } from "react";

/**
 * Lovable-ийн editor preview (iframe эсвэл preview домэйн) дотор service worker
 * ажиллавал хуучин кэш харагдаж засвар "гарахгүй" мэт санагдана. Тиймээс зөвхөн
 * нийтэлсэн (production) хаяг болон шууд нээсэн цонхонд бүртгэнэ.
 */
function isPreviewContext(): boolean {
  if (window.self !== window.top) return true;
  const host = location.hostname;
  if (/^(id-preview|preview)--/i.test(host)) return true;
  return ["lovableproject.com", "lovableproject-dev.com", "gpt-eng.com", "gptengineer.run"].some(
    (zone) => host === zone || host.endsWith("." + zone),
  );
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (!import.meta.env.PROD || isPreviewContext()) {
    // Dev болон preview орчинд өмнө бүртгэгдсэн SW үлдсэн бол цэвэрлэнэ.
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => undefined);
    return;
  }

  const register = async () => {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const ready = await navigator.serviceWorker.ready;
      // Энэ хуудас SW идэвхжихээс өмнө ачаалсан JS/CSS-ийг кэшлүүлнэ (анхны зочлолт).
      const urls = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => {
          try {
            const url = new URL(name);
            return url.origin === location.origin && url.pathname.startsWith("/assets/");
          } catch {
            return false;
          }
        });
      ready.active?.postMessage({ type: "CACHE_URLS", urls });
    } catch (err) {
      console.warn("[pwa] Service worker бүртгэж чадсангүй:", err);
    }
  };

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
}

/* ---------- "Апп суулгах" (beforeinstallprompt) ---------- */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

// Энэ үйл явдал React hydrate хийхээс өмнө гарч болох тул модуль ачаалагдмагц сонсоно.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useInstallPrompt(): { canInstall: boolean; install: () => Promise<void> } {
  const canInstall = useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false,
  );
  async function install() {
    const prompt = deferredPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    deferredPrompt = null;
    notify();
  }
  return { canInstall, install };
}

/* ---------- Сүлжээний төлөв ---------- */

function subscribeOnline(fn: () => void) {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
}

/** SSR үед `true` гэж үзнэ; client дээр navigator.onLine-ийг дагана. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
