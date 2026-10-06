/** What the men in the margins say lives in the lens copy
 * (`content.lenses["back-page"].soldiers`): most of it is Dotfight's own
 * (the soldier-life notes, PR #10: schoolboy war, Dawood invented the game
 * and they know it), the rest is about the book they live in. Blue is the
 * visitor's side, Red is Dawood's. This is the shape of it, and the few
 * helpers that turn a line into speech. */
import type { Copy } from "./chapters";

export type Mood = "tiny" | "whisper" | "say" | "shout";
/** A line, or a line with a mood (shouted, tiny), or an exchange: a line
 * and a comrade's `reply`. */
export type Line = string | { t: string; mood?: Mood; reply?: string };

/** Every kind of thing they say, named: the keys under `soldiers.say`. */
export interface Talk {
  /** Stray thoughts, any page. */
  idle: Line[];
  /** Exchanges: a line, and a comrade's answer. */
  chats: Line[];
  /** Lines about the page they're on, by its kind. */
  page: Record<string, Line[]>;
  /** Lines about the paper itself, by theme (Dotfight's PAPER_LINES, and a
   * few about the section the book is for). */
  paper: Record<string, Line[]>;
  say: {
    poke: Line[];
    pokeAgain: Line[];
    pokeRed: Line[];
    pokeDead: Line[];
    hint: Line[];
    aim: Line[];
    phew: Line[];
    dread: Line[];
    kill: Line[];
    miss: Line[];
    mourn: Line[];
    lunge: Line[];
    snipe: Line[];
    deny: Line[];
    more: Line[];
    last: Line[];
    botGo: Line[];
    ended: Line[];
    /** Banter at the other side, by its pen's name (Dotfight's `banter`). */
    banter: Line[];
  };
  lastStand: string;
  /** What a man says from beyond his camp, alone. */
  wander: string[];
}

/** The copy as typed lines: JSON can't say which strings are moods. */
export const talk = (copy: Copy): Talk => copy.soldiers as unknown as Talk;

/** Name the sides by the paper's pens: `{me}` the speaker's, `{them}` the other's. */
export function fill(text: string, me: string, them: string) {
  return text.replaceAll("{me}", me).replaceAll("{them}", them);
}

export function pick<T>(list: readonly T[], r = Math.random()): T {
  return list[Math.floor(r * list.length) % list.length];
}

export function read(line: Line, fallback: Mood = "say") {
  return typeof line === "string"
    ? { text: line, mood: fallback, reply: undefined as string | undefined }
    : { text: line.t, mood: line.mood ?? fallback, reply: line.reply };
}
