import { buildHouseModel } from "../../lib/activity-house-model.mjs";

type Signal = {
  actor?: { name: string; role: string };
  [key: string]: unknown;
};
type PresenceDetail = {
  status: "connected" | "unavailable";
  signals?: Signal[];
  events?: unknown[];
  houseExcludedIds?: string[];
};
type Input = { catalog: unknown; projects: unknown[]; events: unknown[] };

const dateFor = (item: any) => item.observedAt ?? item.occurredAt ?? item.date;
const readableDate = (item: any) => {
  const date = new Date(dateFor(item));
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    : "Reviewed update";
};
const element = <K extends keyof HTMLElementTagNameMap>(
  name: K,
  className?: string,
) => {
  const node = document.createElement(name);
  if (className) node.className = className;
  return node;
};

export function installActivityHouse() {
  let cleanup: (() => void) | undefined;

  const mount = () => {
    cleanup?.();
    const root = document.querySelector<HTMLElement>("[data-activity-house]");
    const inputNode =
      root?.querySelector<HTMLScriptElement>("[data-house-input]");
    if (!root || !inputNode?.textContent) return;
    let input: Input;
    try {
      input = JSON.parse(inputNode.textContent) as Input;
    } catch {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const controls = root.querySelector<HTMLElement>("[data-house-controls]");
    const search = root.querySelector<HTMLInputElement>("[data-house-search]");
    const filters = [
      ...root.querySelectorAll<HTMLButtonElement>("[data-house-filter]"),
    ];
    const plan = root.querySelector<HTMLElement>("[data-house-plan]");
    const list = root.querySelector<HTMLElement>("[data-house-list]");
    const inspector = root.querySelector<HTMLElement>("[data-house-inspector]");
    const status = root.querySelector<HTMLElement>("[data-house-status]");
    let selectedId = root.querySelector<HTMLElement>(
      "[data-house-room][aria-pressed='true']",
    )?.dataset.houseRoom;
    let filter = "all";
    let query = "";
    let signals: Signal[] = [];
    let events = input.events;

    const roomArt = (furnishing: string) => {
      const art = element("span", "house-room__art");
      art.dataset.furnishing = furnishing;
      art.setAttribute("aria-hidden", "true");
      for (let index = 0; index < 3; index += 1) art.append(element("i"));
      return art;
    };
    const person = (value: any, className: string) => {
      const row = element("span", className);
      const portrait = element("span");
      portrait.setAttribute("aria-hidden", "true");
      portrait.textContent = value.name.trim().slice(0, 1);
      row.append(
        portrait,
        document.createTextNode(`${value.name} · ${value.role}`),
      );
      return row;
    };
    const model = () =>
      buildHouseModel({ ...input, events, signals, now: Date.now() });
    const isVisible = (room: any) => {
      const searchable =
        `${room.title} ${room.summary} ${room.kind}`.toLowerCase();
      return (
        (filter === "all" ||
          (filter === "active" ? room.active : room.kind === filter)) &&
        (!query || searchable.includes(query))
      );
    };

    const renderInspector = (room: any) => {
      if (!inspector) return;
      const content = element("div");
      const eyebrow = element("p", "activity-house__detail-eyebrow");
      eyebrow.textContent = room.kind === "place" ? "Place" : "Project";
      const title = element("h2");
      title.textContent = room.title;
      const summary = element("p");
      summary.textContent = room.summary;
      content.append(eyebrow, title, summary);
      if (room.href) {
        const link = element("a");
        link.href = room.href;
        link.textContent = "Visit this room";
        content.append(link);
      }
      const section = (heading: string) => {
        const area = element("section", "activity-house__inspector-section");
        const label = element("h3");
        label.textContent = heading;
        area.append(label);
        return area;
      };
      const postcards = section("Fresh postcards");
      if (room.occupants.length) {
        const entries = element("ul");
        for (const item of room.occupants) {
          const row = element("li");
          if (item.actor) {
            const name = element("strong");
            name.textContent = `${item.actor.name} · ${item.actor.role}: `;
            row.append(name);
          }
          const link = element("a");
          link.href = item.href;
          link.textContent = item.title;
          const copy = element("span");
          copy.textContent = item.summary;
          row.append(link, copy);
          entries.append(row);
        }
        postcards.append(entries);
      } else {
        const empty = element("p");
        empty.textContent = "No fresh postcard for this room.";
        postcards.append(empty);
      }
      const milestones = section("Reviewed milestones");
      if (room.events.length) {
        const entries = element("ol");
        for (const item of room.events) {
          const row = element("li");
          const time = element("time");
          time.dateTime = dateFor(item);
          time.textContent = readableDate(item);
          const link = element("a");
          link.href = item.href;
          link.textContent = item.title;
          const copy = element("span");
          copy.textContent = item.summary;
          row.append(time, link, copy);
          entries.append(row);
        }
        milestones.append(entries);
      } else {
        const empty = element("p");
        empty.textContent =
          "No reviewed milestones are displayed for this room yet.";
        milestones.append(empty);
      }
      content.append(postcards, milestones);
      inspector.replaceChildren(content);
    };
    const select = (id: string, focus = false) => {
      selectedId = id;
      const room = model().rooms.find((item: any) => item.id === id);
      if (!room) return;
      renderInspector(room);
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-house-room]",
      ))
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.houseRoom === id),
        );
      if (focus) inspector?.querySelector<HTMLElement>("h2")?.focus();
    };
    const renderList = (rooms: any[]) => {
      if (!list) return;
      list.replaceChildren();
      for (const room of rooms) {
        const details = element("details");
        const summary = element("summary");
        summary.textContent = room.title;
        const copy = element("p");
        copy.textContent = room.summary;
        const state = element("p");
        state.textContent = room.active
          ? "Fresh postcard in this room."
          : "No fresh postcard for this room.";
        details.append(summary, copy, state);
        if (room.href) {
          const link = element("a");
          link.href = room.href;
          link.textContent = "Visit this room";
          details.append(link);
        }
        if (room.events.length) {
          const latest = element("p");
          latest.textContent = `Latest reviewed milestone: ${room.events[0].title}`;
          details.append(latest);
        }
        list.append(details);
      }
    };
    const render = () => {
      const next = model();
      if (!next.rooms.some((room: any) => room.id === selectedId))
        selectedId = next.rooms[0]?.id;
      if (plan) {
        plan.replaceChildren();
        for (const room of next.rooms) {
          const button = element("button", "house-room");
          button.type = "button";
          button.dataset.houseRoom = room.id;
          button.dataset.kind = room.kind;
          button.dataset.active = String(room.active);
          button.hidden = !isVisible(room);
          button.setAttribute("aria-pressed", String(room.id === selectedId));
          const door = element("span", "house-room__door");
          door.setAttribute("aria-hidden", "true");
          const kind = element("span", "house-room__kind");
          kind.textContent = room.kind === "place" ? "Place" : "Project";
          const title = element("strong");
          title.textContent = room.title;
          const copy = element("span", "house-room__latest");
          copy.textContent = room.events[0]
            ? `Reviewed: ${room.events[0].title}`
            : room.summary;
          const postcard = element("span", "house-room__postcard");
          postcard.textContent = room.active
            ? "Fresh postcard"
            : "No fresh postcard";
          button.append(
            door,
            roomArt(room.furnishing),
            kind,
            title,
            copy,
            postcard,
          );
          for (const resident of next.residents.filter(
            (person: any) => person.roomId === room.id,
          ))
            button.append(person(resident, "house-resident"));
          for (const occupant of room.occupants)
            if (occupant.actor)
              button.append(person(occupant.actor, "house-occupant"));
          button.addEventListener("click", () => select(room.id, true), {
            signal,
          });
          plan.append(button);
        }
      }
      renderList(next.rooms.filter(isVisible));
      status &&
        (status.textContent = next.rooms.some((room: any) => room.active)
          ? "Fresh postcards are in the house."
          : "No fresh postcards just now.");
      if (selectedId) select(selectedId);
      root.dataset.ready = "true";
    };

    controls?.removeAttribute("hidden");
    if (search) {
      search.disabled = false;
      search.addEventListener(
        "input",
        () => {
          query = search.value.trim().toLowerCase();
          render();
        },
        { signal },
      );
    }
    for (const button of filters) {
      button.disabled = false;
      button.addEventListener(
        "click",
        () => {
          filter = button.dataset.houseFilter || "all";
          for (const item of filters)
            item.setAttribute("aria-pressed", String(item === button));
          render();
        },
        { signal },
      );
    }
    window.addEventListener(
      "activity:presence",
      (event) => {
        const detail = (event as CustomEvent<PresenceDetail>).detail;
        const excluded = new Set(detail?.houseExcludedIds || []);
        signals =
          detail?.status === "connected"
            ? (detail.signals || []).filter(
                (item: any) => !excluded.has(item.id),
              )
            : [];
        events = (detail?.events ?? input.events).filter(
          (item: any) => !excluded.has(item.id),
        );
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
