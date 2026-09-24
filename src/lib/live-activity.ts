import { selectPresenceSignals } from "./activity-presence.mjs";
import { selectFeedEvents } from "./activity-feed.mjs";

export interface PresenceSignal {
  id: string;
  title: string;
  summary: string;
  href: string;
  linkLabel: string;
  source: string;
  kind: string;
  observedAt: string;
  expiresAt: string;
  relatedProject?: string;
  actor?: { id: string; name: string; role: string };
}
export interface LiveActivityState {
  status: "connected" | "unavailable";
  signals: PresenceSignal[];
  events?: ReturnType<typeof selectFeedEvents>;
  houseExcludedIds?: string[];
}

const INSTALL_KEY = "__buroojLiveActivity__";
const POLL_MS = 30_000;
const TIMEOUT_MS = 8_000;
const sourceLabels: Record<string, string> = {
  site: "This site",
  github: "GitHub",
  substack: "Substack",
  bjslab: "bjslab",
  "agent-session": "Agent sessions",
  manual: "A note",
  generic: "Around the web",
};

/** One controller serves the homepage and house, with no background polling. */
export function installLiveActivity() {
  const host = window as typeof window &
    Record<string, (() => void) | undefined>;
  if (host[INSTALL_KEY]) return host[INSTALL_KEY];
  const lifetime = new AbortController();
  let request: AbortController | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let lastDocument: unknown;
  let state: LiveActivityState = { status: "unavailable", signals: [] };
  let active = false;
  let epoch = 0;
  let lastRendered = "";

  function render(force = false) {
    const next = JSON.stringify(state);
    if (!force && next === lastRendered) return;
    lastRendered = next;
    for (const root of document.querySelectorAll<HTMLElement>(
      "[data-live-activity]",
    )) {
      const list = root.querySelector<HTMLUListElement>("[data-live-signals]");
      const note = root.querySelector<HTMLElement>("[data-live-note]");
      if (!list || !note) continue;
      list.replaceChildren();
      for (const signal of state.signals.slice(0, 3)) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = signal.href;
        link.textContent = signal.title;
        const copy = document.createElement("p");
        copy.textContent = signal.summary;
        item.append(link, copy);
        list.append(item);
      }
      list.hidden = state.signals.length === 0;
      note.hidden = state.signals.length > 0;
      note.textContent =
        state.status === "connected"
          ? "No fresh postcards just now."
          : "Waiting for a fresh postcard.";
    }
    if (state.events) {
      const events = state.events.slice(0, 8);
      for (const list of document.querySelectorAll<HTMLOListElement>(
        "[data-runtime-events]",
      )) {
        const fingerprint = JSON.stringify(events);
        if (list.dataset.events === fingerprint) continue;
        const focused = list.contains(document.activeElement)
          ? (document.activeElement as HTMLAnchorElement).getAttribute("href")
          : null;
        const entries = events
          .map((event, index) => {
            const template = document.querySelector<HTMLTemplateElement>(
              `template[data-event-template="${event.kind}"]`,
            );
            const row = template?.content.firstElementChild?.cloneNode(true) as
              HTMLElement | undefined;
            if (!row) return null;
            const link = row.querySelector<HTMLAnchorElement>(
              "[data-event-title] a",
            );
            const source = row.querySelector("[data-event-source]");
            const time = row.querySelector("time");
            if (link) {
              link.href = event.href;
              link.textContent = event.title;
            }
            if (source)
              source.textContent =
                sourceLabels[event.source] ?? "Around the web";
            if (time) {
              time.dateTime = event.occurredAt;
              time.textContent = event.dateLabel;
            }
            row
              .querySelector(".update-entry")
              ?.classList.toggle(
                "update-entry--connected",
                index < events.length - 1,
              );
            return row;
          })
          .filter((row): row is HTMLElement => Boolean(row));
        list.replaceChildren(...entries);
        list.hidden = entries.length === 0;
        const empty = list.parentElement?.querySelector<HTMLElement>(
          "[data-stream-empty]",
        );
        if (empty) empty.hidden = entries.length > 0;
        list.dataset.events = fingerprint;
        if (focused)
          [...list.querySelectorAll<HTMLAnchorElement>("a")]
            .find((link) => link.getAttribute("href") === focused)
            ?.focus({ preventScroll: true });
      }
    }
    window.dispatchEvent(
      new CustomEvent<LiveActivityState>("activity:presence", {
        detail: {
          status: state.status,
          signals: [...state.signals],
          events: state.events,
          houseExcludedIds: state.houseExcludedIds,
        },
      }),
    );
  }

  function refreshFreshness() {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
    state.signals = lastDocument
      ? selectPresenceSignals(lastDocument, Date.now())
      : [];
    render();
    if (active && !document.hidden && state.signals.length) {
      const nextExpiry = Math.min(
        ...state.signals.map((signal) => Date.parse(signal.expiresAt)),
      );
      expiryTimer = setTimeout(
        refreshFreshness,
        Math.max(0, nextExpiry - Date.now()) + 1,
      );
    }
  }

  async function poll() {
    if (!active || document.hidden) return;
    clearTimeout(pollTimer);
    const thisEpoch = epoch;
    const current = new AbortController();
    request = current;
    const timeout = setTimeout(() => current.abort(), TIMEOUT_MS);
    try {
      const response = await fetch("/api/now", {
        cache: "no-store",
        signal: current.signal,
      });
      if (!response.ok) throw new Error("Presence unavailable");
      const text = await response.text();
      if (text.length > 65_536) throw new Error("Presence snapshot too large");
      const data = JSON.parse(text);
      // Validate before retaining anything or handing it to another surface.
      const signals = selectPresenceSignals(data, Date.now());
      const events =
        data.events === undefined
          ? state.events
          : selectFeedEvents(data.events, Date.now());
      if (current.signal.aborted || thisEpoch !== epoch) return;
      const connected = data.status === "connected";
      lastDocument = connected ? data : undefined;
      state = {
        status: connected ? "connected" : "unavailable",
        signals: connected ? signals : [],
        events,
        houseExcludedIds: Array.isArray(data.houseExcludedIds)
          ? data.houseExcludedIds.filter((id: unknown): id is string => typeof id === "string")
          : [],
      };
      refreshFreshness();
    } catch {
      if (thisEpoch !== epoch) return;
      // Losing contact must not imply that a previously seen worker is still active.
      lastDocument = undefined;
      state = { status: "unavailable", signals: [], events: [], houseExcludedIds: [] };
      clearTimeout(expiryTimer);
      expiryTimer = undefined;
      render();
    } finally {
      clearTimeout(timeout);
      if (request === current) request = undefined;
      if (active && !document.hidden && thisEpoch === epoch)
        pollTimer = setTimeout(poll, POLL_MS);
    }
  }

  function stop() {
    epoch += 1;
    request?.abort();
    request = undefined;
    clearTimeout(pollTimer);
    clearTimeout(expiryTimer);
    pollTimer = expiryTimer = undefined;
  }
  function mount() {
    stop();
    active = Boolean(
      document.querySelector("[data-live-activity], [data-activity-house]"),
    );
    // A later Astro mount may have missed the last event. Re-emit current freshness.
    refreshFreshness();
    render(true);
    if (active && !document.hidden) void poll();
  }
  function visibilityChanged() {
    stop();
    refreshFreshness();
    if (active && !document.hidden) void poll();
  }
  document.addEventListener("astro:page-load", mount, {
    signal: lifetime.signal,
  });
  document.addEventListener(
    "astro:before-swap",
    () => {
      active = false;
      stop();
    },
    { signal: lifetime.signal },
  );
  document.addEventListener("visibilitychange", visibilityChanged, {
    signal: lifetime.signal,
  });
  window.addEventListener("pagehide", stop, { signal: lifetime.signal });
  window.addEventListener("pageshow", mount, { signal: lifetime.signal });
  window.addEventListener("activity:request", () => { refreshFreshness(); render(true); }, { signal: lifetime.signal });
  const cleanup = () => {
    active = false;
    stop();
    lifetime.abort();
    delete host[INSTALL_KEY];
  };
  host[INSTALL_KEY] = cleanup;
  mount();
  return cleanup;
}
