import { validateHouseCatalog } from "../../lib/activity-house-model.mjs";

const DRAFT_KEY = "burooj-house-roster-draft-v1";
export type HouseCatalog = ReturnType<typeof validateHouseCatalog>;
export type HouseRoom = HouseCatalog["rooms"][number];
export type HouseResident = HouseCatalog["residents"][number];

type CatalogResponse = {
  catalog: HouseCatalog;
  revision: string;
  suggestedRooms?: HouseRoom[];
};
type EditorRoot = HTMLElement & { dataset: DOMStringMap };

export function normalizeCatalog(value: unknown): HouseCatalog {
  const catalog = validateHouseCatalog(value);
  return {
    version: 1,
    rooms: catalog.rooms.map((room) => ({
      ...room,
      aliases: [...room.aliases],
    })),
    residents: catalog.residents.map((resident) => ({
      ...resident,
    })),
  };
}

export function validateCatalog(value: unknown): string[] {
  try {
    validateHouseCatalog(value);
    return [];
  } catch (error) {
    return [
      error instanceof Error
        ? error.message.replace(/^House catalog:\s*/, "")
        : "The roster is invalid.",
    ];
  }
}

function cloneCatalog(catalog: HouseCatalog) {
  return JSON.parse(JSON.stringify(catalog)) as HouseCatalog;
}

function draftFromStorage() {
  try {
    const draft = window.localStorage.getItem(DRAFT_KEY);
    if (!draft) return undefined;
    const catalog = JSON.parse(draft) as HouseCatalog;
    return validateCatalog(catalog).length === 0
      ? normalizeCatalog(catalog)
      : undefined;
  } catch {
    return undefined;
  }
}

function saveDraft(catalog: HouseCatalog) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(catalog));
  } catch {
    // Saving remotely remains available if browser storage is unavailable.
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // The saved server response remains the source of truth.
  }
}

function field<
  T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
>(form: HTMLFormElement, name: string) {
  return form.elements.namedItem(name) as T;
}

function errorMessage(value: unknown) {
  if (!value || typeof value !== "object")
    return "The roster could not be saved.";
  const error = (value as { error?: unknown }).error;
  return typeof error === "string" && error
    ? error
    : "The roster could not be saved.";
}

function createId(prefix: string, existing: Set<string>) {
  let suffix = existing.size + 1;
  while (existing.has(`${prefix}-${suffix}`)) suffix += 1;
  return `${prefix}-${suffix}`;
}

export function installHouseEditor() {
  const root = document.querySelector<EditorRoot>("[data-house-editor]");
  if (!root) return;
  const form = root.querySelector<HTMLFormElement>("[data-house-editor-form]");
  const status = root.querySelector<HTMLElement>("[data-house-editor-status]");
  const errorBox = root.querySelector<HTMLElement>(
    "[data-house-editor-errors]",
  );
  const errorList = errorBox?.querySelector<HTMLUListElement>("ul");
  const roomSelect = root.querySelector<HTMLSelectElement>(
    "[data-house-editor-room-select]",
  );
  const residents = root.querySelector<HTMLUListElement>(
    "[data-house-editor-resident-list]",
  );
  const reload = root.querySelector<HTMLButtonElement>(
    "[data-house-editor-reload]",
  );
  if (!form || !status || !roomSelect || !residents) return;

  let catalog: HouseCatalog | undefined;
  let revision = "";
  let selectedRoomId = "";
  let dirty = false;
  let suggestedRooms: HouseRoom[] = [];

  const selectedRoom = () =>
    catalog?.rooms.find((room) => room.id === selectedRoomId);
  const setStatus = (message: string) => {
    status.textContent = message;
  };
  const showErrors = (errors: string[]) => {
    if (!errorBox || !errorList) return;
    errorBox.hidden = errors.length === 0;
    errorList.replaceChildren(
      ...errors.map((message) => {
        const row = document.createElement("li");
        row.textContent = message;
        return row;
      }),
    );
  };
  const markDirty = () => {
    if (!catalog) return;
    dirty = true;
    saveDraft(catalog);
    showErrors([]);
    setStatus("Unsaved changes are stored in this browser. Save when ready.");
  };
  const renderRoomPicker = () => {
    if (!catalog) return;
    roomSelect.replaceChildren(
      ...catalog.rooms.map((room, index) => {
        const option = document.createElement("option");
        option.value = room.id;
        option.textContent = `${index + 1}. ${room.title || room.id || "Untitled room"}`;
        return option;
      }),
    );
    roomSelect.value = selectedRoomId;
  };
  const renderRoom = () => {
    const room = selectedRoom();
    if (!room) return;
    field<HTMLInputElement>(form, "id").value = room.id;
    field<HTMLInputElement>(form, "title").value = room.title;
    field<HTMLTextAreaElement>(form, "summary").value = room.summary;
    field<HTMLSelectElement>(form, "kind").value = room.kind;
    field<HTMLSelectElement>(form, "furnishing").value = room.furnishing;
    field<HTMLInputElement>(form, "href").value = room.href || "";
    field<HTMLInputElement>(form, "aliases").value = room.aliases.join(", ");
    field<HTMLInputElement>(form, "order").value = String(room.order);
    field<HTMLInputElement>(form, "pinned").checked = room.pinned;
    field<HTMLInputElement>(form, "hidden").checked = room.hidden;
  };
  const renderSuggestions = () => {
    const suggestion = root.querySelector<HTMLElement>(
      "[data-house-editor-suggestion]",
    );
    const select = root.querySelector<HTMLSelectElement>(
      "[data-house-editor-suggested-room]",
    );
    const button = root.querySelector<HTMLButtonElement>(
      "[data-house-editor-customize-room]",
    );
    if (!suggestion || !select || !button || !catalog) return;
    const available = suggestedRooms.filter(
      (room) => !catalog?.rooms.some((current) => current.id === room.id),
    );
    suggestion.hidden = available.length === 0;
    button.hidden = available.length === 0;
    select.replaceChildren(
      ...available.map((room) => {
        const option = document.createElement("option");
        option.value = room.id;
        option.textContent = `${room.title} (${room.id})`;
        return option;
      }),
    );
  };
  const roomOptions = (currentRoomId: string) => {
    const fragment = document.createDocumentFragment();
    for (const room of catalog?.rooms || []) {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = room.title || room.id;
      option.selected = room.id === currentRoomId;
      fragment.append(option);
    }
    return fragment;
  };
  const residentField = (
    resident: HouseResident,
    labelText: string,
    key: "id" | "name" | "role",
  ) => {
    const label = document.createElement("label");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.value = resident[key];
    input.addEventListener("input", () => {
      resident[key] = input.value;
      markDirty();
    });
    label.append(input);
    return label;
  };
  const renderResidents = () => {
    if (!catalog) return;
    residents.replaceChildren(
      ...catalog.residents.map((resident) => {
        const item = document.createElement("li");
        item.className = "house-editor__resident";
        item.append(
          residentField(resident, "Resident id", "id"),
          residentField(resident, "Name", "name"),
          residentField(resident, "Role", "role"),
        );
        const roomLabel = document.createElement("label");
        roomLabel.textContent = "Room";
        const room = document.createElement("select");
        room.append(roomOptions(resident.roomId));
        room.addEventListener("change", () => {
          resident.roomId = room.value;
          markDirty();
        });
        roomLabel.append(room);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "house-editor__resident-actions";
        remove.textContent = "Remove resident";
        remove.addEventListener("click", () => {
          if (!catalog) return;
          catalog.residents = catalog.residents.filter(
            (item) => item !== resident,
          );
          renderResidents();
          markDirty();
        });
        item.append(roomLabel, remove);
        return item;
      }),
    );
  };
  const render = () => {
    if (!catalog) return;
    selectedRoomId ||= catalog.rooms[0]?.id || "";
    renderRoomPicker();
    renderRoom();
    renderSuggestions();
    renderResidents();
    form.hidden = false;
  };
  const request = async (init?: RequestInit) => {
    const response = await fetch("/api/house-catalog", {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
    });
    const body = (await response.json().catch(() => undefined)) as unknown;
    if (!response.ok) {
      throw { status: response.status, message: errorMessage(body) };
    }
    return body as CatalogResponse;
  };
  const load = async (discardDraft = false) => {
    setStatus("Loading the current roster…");
    try {
      const response = await request();
      const errors = validateCatalog(response.catalog);
      if (errors.length)
        throw { status: 0, message: "The saved roster is invalid." };
      revision = response.revision;
      suggestedRooms = Array.isArray(response.suggestedRooms)
        ? response.suggestedRooms.filter(
            (room) =>
              validateCatalog({ version: 1, rooms: [room], residents: [] })
                .length === 0,
          )
        : [];
      const draft = discardDraft ? undefined : draftFromStorage();
      catalog = draft || normalizeCatalog(response.catalog);
      dirty = Boolean(draft);
      if (discardDraft) clearDraft();
      selectedRoomId = catalog.rooms[0]?.id || "";
      reload && (reload.hidden = true);
      render();
      setStatus(
        draft
          ? "Restored an unsaved local draft. Save when it is ready."
          : "Current roster loaded. Changes will stay local until you save.",
      );
    } catch (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "The roster could not be loaded.";
      setStatus(message);
    }
  };
  const save = async () => {
    if (!catalog || !revision) return;
    const errors = validateCatalog(catalog);
    if (errors.length) {
      showErrors(errors);
      setStatus("The roster has local validation errors.");
      return;
    }
    const nextCatalog = normalizeCatalog(cloneCatalog(catalog));
    form.setAttribute("aria-busy", "true");
    setStatus("Saving the roster…");
    try {
      const response = await request({
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ catalog: nextCatalog, revision }),
      });
      catalog = normalizeCatalog(response.catalog);
      revision = response.revision;
      dirty = false;
      clearDraft();
      reload && (reload.hidden = true);
      render();
      setStatus("Roster saved. Open the house to view the refreshed plan.");
    } catch (error) {
      const statusCode =
        typeof error === "object" && error && "status" in error
          ? Number(error.status)
          : 0;
      if (statusCode === 409) {
        reload && (reload.hidden = false);
        setStatus(
          "The roster changed on disk. Your unsaved draft is still local; reload the latest roster when you are ready to replace it.",
        );
      } else {
        const message =
          typeof error === "object" && error && "message" in error
            ? String(error.message)
            : "The roster could not be saved.";
        setStatus(message);
      }
    } finally {
      form.removeAttribute("aria-busy");
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void save();
  });
  roomSelect.addEventListener("change", () => {
    selectedRoomId = roomSelect.value;
    renderRoom();
  });
  for (const control of Array.from(
    root.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("[data-house-editor-room-field]"),
  )) {
    control.addEventListener("input", () => {
      const room = selectedRoom();
      if (!room) return;
      const key = control.name as keyof HouseRoom;
      if (key === "aliases") {
        room.aliases = control.value.split(",").map(String).filter(Boolean);
      } else if (key === "pinned" || key === "hidden") {
        room[key] = (control as HTMLInputElement).checked;
      } else if (
        key === "id" ||
        key === "title" ||
        key === "summary" ||
        key === "href"
      ) {
        room[key] = control.value;
      } else if (key === "kind") {
        room.kind = control.value as HouseRoom["kind"];
      } else if (key === "furnishing") {
        room.furnishing = control.value as HouseRoom["furnishing"];
      }
      markDirty();
    });
    control.addEventListener("change", () => {
      if (control.name === "id") {
        selectedRoomId = control.value;
        renderRoomPicker();
        renderResidents();
      }
    });
  }
  root
    .querySelector<HTMLButtonElement>("[data-house-editor-add-room]")
    ?.addEventListener("click", () => {
      if (!catalog) return;
      const id = createId(
        "room",
        new Set(catalog.rooms.map((room) => room.id)),
      );
      catalog.rooms.push({
        id,
        title: "New room",
        summary: "Describe what this public room holds.",
        kind: "place",
        furnishing: "desk",
        aliases: [],
        pinned: false,
        hidden: false,
        order: Math.max(...catalog.rooms.map((room) => room.order), 0) + 10,
      });
      selectedRoomId = id;
      render();
      markDirty();
    });
  root
    .querySelector<HTMLButtonElement>("[data-house-editor-customize-room]")
    ?.addEventListener("click", () => {
      if (!catalog) return;
      const select = root.querySelector<HTMLSelectElement>(
        "[data-house-editor-suggested-room]",
      );
      const suggested = suggestedRooms.find(
        (room) => room.id === select?.value,
      );
      if (!suggested) return;
      catalog.rooms.push({
        ...cloneCatalog({ version: 1, rooms: [suggested], residents: [] })
          .rooms[0],
        order: Math.max(...catalog.rooms.map((room) => room.order), 0) + 10,
      });
      selectedRoomId = suggested.id;
      render();
      markDirty();
    });
  const moveRoom = (direction: -1 | 1) => {
    if (!catalog) return;
    const index = catalog.rooms.findIndex((room) => room.id === selectedRoomId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= catalog.rooms.length) return;
    const orderSlots = catalog.rooms
      .map((room) => room.order)
      .sort((a, b) => a - b);
    [catalog.rooms[index], catalog.rooms[target]] = [
      catalog.rooms[target],
      catalog.rooms[index],
    ];
    catalog.rooms = catalog.rooms.map((room, roomIndex) => ({
      ...room,
      order: orderSlots[roomIndex],
    }));
    catalog = normalizeCatalog(catalog);
    render();
    markDirty();
  };
  root
    .querySelector<HTMLButtonElement>("[data-house-editor-move-up]")
    ?.addEventListener("click", () => moveRoom(-1));
  root
    .querySelector<HTMLButtonElement>("[data-house-editor-move-down]")
    ?.addEventListener("click", () => moveRoom(1));
  root
    .querySelector<HTMLButtonElement>("[data-house-editor-remove-room]")
    ?.addEventListener("click", () => {
      if (!catalog || catalog.rooms.length === 1) {
        setStatus("Keep at least one room in the public roster.");
        return;
      }
      const room = selectedRoom();
      if (!room) return;
      catalog.rooms = catalog.rooms.filter((item) => item !== room);
      const fallbackRoomId = catalog.rooms[0].id;
      for (const resident of catalog.residents) {
        if (resident.roomId === room.id) resident.roomId = fallbackRoomId;
      }
      catalog = normalizeCatalog(catalog);
      selectedRoomId = catalog.rooms[0].id;
      render();
      markDirty();
    });
  root
    .querySelector<HTMLButtonElement>("[data-house-editor-add-resident]")
    ?.addEventListener("click", () => {
      if (!catalog) return;
      catalog.residents.push({
        id: createId(
          "resident",
          new Set(catalog.residents.map((resident) => resident.id)),
        ),
        name: "New resident",
        role: "Role",
        roomId: catalog.rooms[0].id,
      });
      renderResidents();
      markDirty();
    });
  reload?.addEventListener("click", () => {
    if (
      window.confirm(
        "Reload the latest roster? This replaces the local draft currently in this browser.",
      )
    ) {
      void load(true);
    }
  });

  void load();
  window.addEventListener("beforeunload", (event) => {
    if (!dirty) return;
    event.preventDefault();
  });
}
