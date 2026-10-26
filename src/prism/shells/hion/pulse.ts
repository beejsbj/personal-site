/** The pulse: one frame loop for everything that moves on a Hion screen.
 *
 * The loom (the hions' drawing), the skein (every live thread) and life
 * (what answers the visitor) each register a task. One animation frame
 * runs every awake task, in the order they were added, so a hion's head
 * reads the reach the loom set in the same frame. A task returns true
 * while it wants the next frame too; once none does, the loop sleeps.
 * A task can also ask to be woken later (a birth, a fade), on one timer.
 *
 * Nothing runs while the prism holds the page idle or the tab is hidden:
 * the loop wakes again when either ends. */

export interface Task {
  /** Run this task from the next frame. */
  wake(): void;
  /** Run it again in about this long (ms), unless woken before. */
  wakeIn(ms: number): void;
}

export interface Pulse {
  add(run: (now: number, dt: number) => boolean): Task;
}

interface Entry {
  run: (now: number, dt: number) => boolean;
  awake: boolean;
  last: number;
  at: number;
}

export function createPulse(options: {
  signal: AbortSignal;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): () => void;
}): Pulse {
  const { signal } = options;
  const entries: Entry[] = [];
  let frame = 0;
  let timer = 0;
  let timerAt = Infinity;

  const asleep = () => signal.aborted || options.isIdle() || document.hidden;

  function request() {
    if (frame || asleep()) return;
    frame = requestAnimationFrame(tick);
  }

  function schedule() {
    let at = Infinity;
    for (const e of entries) if (!e.awake && e.at < at) at = e.at;
    if (at === timerAt) return;
    clearTimeout(timer);
    timer = 0;
    timerAt = at;
    if (at === Infinity) return;
    timer = window.setTimeout(() => {
      timer = 0;
      timerAt = Infinity;
      const now = performance.now();
      for (const e of entries) {
        if (e.at <= now + 4) {
          e.at = Infinity;
          e.awake = true;
        }
      }
      request();
      schedule();
    }, Math.max(16, at - performance.now()));
  }

  function tick(now: number) {
    frame = 0;
    if (asleep()) return;
    let more = false;
    for (const e of entries) {
      if (!e.awake) continue;
      const dt = e.last ? Math.min(64, now - e.last) : 16;
      e.last = now;
      e.awake = e.run(now, dt);
      if (!e.awake) e.last = 0;
      more ||= e.awake;
    }
    if (more) request();
    schedule();
  }

  const unlisten = options.onIdleChange((idle) => {
    if (!idle) request();
  });
  document.addEventListener("visibilitychange", () => request(), { signal });
  signal.addEventListener("abort", () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    frame = timer = 0;
    unlisten();
  });

  return {
    add(run) {
      const entry: Entry = { run, awake: false, last: 0, at: Infinity };
      entries.push(entry);
      return {
        wake() {
          entry.awake = true;
          entry.at = Infinity;
          request();
        },
        wakeIn(ms) {
          if (entry.awake) return;
          entry.at = Math.min(entry.at, performance.now() + ms);
          schedule();
        },
      };
    },
  };
}
