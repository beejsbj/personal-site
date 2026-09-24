import { buildHouseModel } from "../../lib/activity-house-model.mjs";
import {
  buildHouseScene,
  renderHouseMarkup,
  renderRoomDetail,
} from "../../lib/house-scene.mjs";

type Signal = { id?: string; [key: string]: unknown };
type PresenceDetail = {
  status: "connected" | "unavailable";
  signals?: Signal[];
  events?: unknown[];
  houseExcludedIds?: string[];
};
type Input = { catalog: unknown; projects: unknown[]; events: unknown[] };

/**
 * Pretend visitors for looking at the house in development. They are only
 * offered when the page is built in dev mode and never reach a public build.
 */
function rehearsalSignals(now: number): Signal[] {
  const visit = (
    n: number,
    name: string,
    role: string,
    title: string,
    relatedProject?: string,
  ) => ({
    id: `activity_${n.toString(16).padStart(16, "0")}`,
    title,
    summary: "A pretend visitor for rehearsing the house.",
    href: "https://burooj.dev/house",
    linkLabel: "Look around",
    source: "manual",
    kind: "agents",
    observedAt: new Date(now - 30_000).toISOString(),
    expiresAt: new Date(now + 240_000).toISOString(),
    ...(relatedProject ? { relatedProject } : {}),
    actor: { id: name.toLowerCase(), name, role },
  });
  return [
    visit(1, "Astra", "Tinkerer", "Astra is tinkering on Undertext", "Undertext"),
    visit(2, "Codex", "Builder", "Codex is framing a new wall", "personal-site"),
    visit(3, "Claude", "Consultant", "Claude is reviewing the specimens", "design-lab"),
    visit(4, "Scout", "Scout", "Scout is checking the fuse box", "bjslab"),
    visit(5, "Opal", "Courier", "Opal is waiting with a parcel"),
  ];
}

export function installActivityHouse() {
  let cleanup: (() => void) | undefined;

  const mount = () => {
    cleanup?.();
    const root = document.querySelector<HTMLElement>("[data-activity-house]");
    const inputNode =
      root?.querySelector<HTMLScriptElement>("[data-house-input]");
    const building = root?.querySelector<HTMLElement>("[data-house-building]");
    const detail = root?.querySelector<HTMLElement>("[data-house-detail]");
    const status = root?.querySelector<HTMLElement>("[data-house-status]");
    if (!root || !inputNode?.textContent || !building || !detail) return;
    let input: Input;
    try {
      input = JSON.parse(inputNode.textContent) as Input;
    } catch {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const rehearsing =
      root.dataset.rehearsal === "available" &&
      new URLSearchParams(location.search).get("visitors") === "pretend";
    let selectedId = building.querySelector<HTMLElement>(
      "[data-house-room][aria-pressed='true']",
    )?.dataset.houseRoom;
    let signals: Signal[] = [];
    let events = input.events;
    let present = new Set(
      [...building.querySelectorAll<HTMLElement>("[data-figure-key]")].map(
        (node) => node.dataset.figureKey!,
      ),
    );
    let scene: ReturnType<typeof buildHouseScene>;
    let drawn = building.innerHTML;

    const showDetail = (focus = false) => {
      const room = scene.rooms.find((item: any) => item.id === selectedId);
      detail.innerHTML = renderRoomDetail(room);
      if (focus) detail.querySelector<HTMLElement>("h2")?.focus();
    };
    const render = () => {
      const now = Date.now();
      scene = buildHouseScene(
        buildHouseModel({
          ...input,
          events,
          signals: rehearsing ? [...signals, ...rehearsalSignals(now)] : signals,
          now,
        }),
      );
      if (!scene.rooms.some((room: any) => room.id === selectedId))
        selectedId = scene.rooms[0]?.id;
      const everyone = [
        ...scene.rooms.flatMap((room: any) => room.figures),
        ...scene.waiting,
      ].map((figure: any) => figure.key as string);
      // Only people who were not already standing somewhere walk in.
      const arriving = new Set(everyone.filter((key) => !present.has(key)));
      present = new Set(everyone);
      // Redrawing identical markup would restart everyone's idle animation.
      const markup = renderHouseMarkup(scene, { selectedId, arriving });
      if (markup !== drawn) building.innerHTML = drawn = markup;
      if (status) status.textContent = rehearsing
        ? `Rehearsal: ${scene.status}`
        : scene.status;
      root.dataset.busy = String(scene.busy);
      showDetail();
    };

    building.addEventListener(
      "click",
      (event) => {
        const button = (event.target as Element).closest<HTMLElement>(
          "[data-house-room]",
        );
        if (!button?.dataset.houseRoom) return;
        selectedId = button.dataset.houseRoom;
        for (const room of building.querySelectorAll("[data-house-room]"))
          room.setAttribute("aria-pressed", String(room === button));
        showDetail(true);
      },
      { signal },
    );
    window.addEventListener(
      "activity:presence",
      (event) => {
        const detail = (event as CustomEvent<PresenceDetail>).detail;
        const excluded = new Set(detail?.houseExcludedIds || []);
        const kept = (item: any) => !item?.id || !excluded.has(item.id);
        signals =
          detail?.status === "connected"
            ? (detail.signals || []).filter(kept)
            : [];
        events = (detail?.events ?? input.events).filter(kept);
        render();
      },
      { signal },
    );
    render();
    window.dispatchEvent(new Event("activity:request"));
    cleanup = () => controller.abort();
  };

  mount();
  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", mount);
}
