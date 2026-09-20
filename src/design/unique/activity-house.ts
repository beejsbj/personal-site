type PresenceSignal = {
  id: string;
  title: string;
  summary: string;
  href?: string;
  linkLabel?: string;
  relatedProject?: string;
  expiresAt?: string;
};

type PresenceDetail = {
  status: "connected" | "unavailable";
  signals: PresenceSignal[];
};

const quietMessage = "The house is waiting for a signal.";
const demoMessage =
  "Demo: an imagined busy house. These visiting figures are fictional.";

const activeSignals = (signals: PresenceSignal[]) =>
  signals.filter((signal) => {
    if (!signal.title || !signal.summary) return false;
    if (!signal.expiresAt) return false;
    const expiry = new Date(signal.expiresAt).getTime();
    return Number.isFinite(expiry) && expiry > Date.now();
  });

export function installActivityHouse() {
  let cleanup: (() => void) | undefined;

  const mount = () => {
    cleanup?.();
    const root = document.querySelector<HTMLElement>("[data-activity-house]");
    if (!root) return;

    const controller = new AbortController();
    const { signal } = controller;
    const status = root.querySelector<HTMLElement>("[data-house-status]");
    const connectionNote = root.querySelector<HTMLElement>(
      "[data-house-connection]",
    );
    const signalList = root.querySelector<HTMLElement>("[data-house-signals]");
    const detail = root.querySelector<HTMLElement>("[data-house-detail]");
    const demo = root.querySelector<HTMLButtonElement>("[data-house-demo]");
    const motion = root.querySelector<HTMLButtonElement>("[data-house-motion]");
    const rooms = [
      ...root.querySelectorAll<HTMLButtonElement>("[data-room-button]"),
    ];
    let latestSignals: PresenceSignal[] = [];
    let demoActive = false;

    root
      .querySelector<HTMLElement>(".activity-house__controls")
      ?.removeAttribute("hidden");
    for (const room of rooms) room.disabled = false;
    root.dataset.ready = "true";

    const selectRoom = (id: string) => {
      for (const room of rooms) {
        const selected = room.dataset.roomButton === id;
        room.setAttribute("aria-pressed", String(selected));
      }
      const source = root.querySelector<HTMLElement>(
        `[data-room-copy="${id}"]`,
      );
      if (!source || !detail) return;
      detail.replaceChildren(
        ...[...source.children].map((child) => child.cloneNode(true)),
      );
      detail.dataset.selectedRoom = id;
    };

    const showSignals = (signals: PresenceSignal[]) => {
      if (!signalList) return;
      signalList.replaceChildren();
      for (const item of signals) {
        const row = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = item.title;
        const summary = document.createElement("span");
        summary.textContent = ` — ${item.summary}`;
        row.append(title, summary);
        if (item.href && item.linkLabel) {
          const link = document.createElement("a");
          link.href = item.href;
          link.textContent = item.linkLabel;
          row.append(document.createTextNode(" "), link);
        }
        signalList.append(row);
      }
    };

    const renderPresence = () => {
      const signals = activeSignals(latestSignals);
      const hasSignals = signals.length > 0;
      root.dataset.scene = hasSignals ? "presence" : "quiet";
      status &&
        (status.textContent = hasSignals ? signals[0].title : quietMessage);
      showSignals(signals);
      for (const room of rooms) {
        room.dataset.hasSignal = String(
          signals.some(
            (item) => item.relatedProject === room.dataset.roomButton,
          ),
        );
      }
    };

    const renderDemo = () => {
      root.dataset.scene = "demo";
      status && (status.textContent = demoMessage);
      showSignals([]);
      for (const room of rooms) room.dataset.hasSignal = "false";
    };

    for (const room of rooms) {
      room.addEventListener(
        "click",
        () => selectRoom(room.dataset.roomButton || ""),
        { signal },
      );
    }

    demo?.addEventListener(
      "click",
      () => {
        demoActive = !demoActive;
        demo.setAttribute("aria-pressed", String(demoActive));
        demo.textContent = demoActive
          ? "Leave busy-house demo"
          : "Imagine a busy house";
        demoActive ? renderDemo() : renderPresence();
      },
      { signal },
    );

    motion?.addEventListener(
      "click",
      () => {
        const paused = root.dataset.motion !== "paused";
        root.dataset.motion = paused ? "paused" : "playing";
        motion.setAttribute("aria-pressed", String(paused));
        motion.textContent = paused ? "Resume motion" : "Pause motion";
      },
      { signal },
    );

    const refreshVisibility = () => {
      root.dataset.pageVisible = String(!document.hidden);
    };
    document.addEventListener("visibilitychange", refreshVisibility, {
      signal,
    });

    window.addEventListener(
      "activity:presence",
      (event) => {
        const detail = (event as CustomEvent<PresenceDetail>).detail;
        latestSignals =
          detail?.status === "connected" ? detail.signals || [] : [];
        if (connectionNote) {
          connectionNote.textContent =
            detail?.status === "connected"
              ? "Fresh postcards from around the house."
              : "Imagined scene — live postcards are not connected yet.";
        }
        if (!demoActive) renderPresence();
      },
      { signal },
    );

    selectRoom(rooms[0]?.dataset.roomButton || "");
    refreshVisibility();
    renderPresence();
    cleanup = () => controller.abort();
  };

  mount();
  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", mount);
}
