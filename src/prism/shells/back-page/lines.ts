/** What the men in the margins say. Most of it is Dotfight's own (the
 * soldier-life notes, PR #10: schoolboy war, Dawood invented the game and they
 * know it), and the rest is about the book they live in, since it's Burooj's
 * portfolio and they've noticed. Blue is the visitor's side, Red is Dawood's. */

export type Mood = "tiny" | "whisper" | "say" | "shout";
export type Line = string | { t: string; mood?: Mood; reply?: string };

const chat = (t: string, reply: string): Line => ({ t, reply });
const shout = (t: string): Line => ({ t, mood: "shout" });
const tiny = (t: string): Line => ({ t, mood: "tiny" });

/** Stray thoughts, any page. */
export const IDLE: Line[] = [
  "for Dawood!", "mum?", "hold the line", "…", "hm", "is it lunch?", "I spy…",
  "whose go is it?", "is Dawood watching?", "my feet hurt", "anyone got a rubber?",
  "what's the plan", "dot dot dot", "I need a wee", "who drew me", "is this a test",
  "I'm bored", "is that a smudge", "ooh, a fly", "why are we dots", "who holds the pen",
  "do dots dream", "is the lamp god", tiny("is any of this real"), "I'm knackered",
  "five more minutes", "not it", "at least I'm round", "I'd rather be a square",
  "mind the margin", "somebody's drawn on this", "don't turn it yet", "*yawn*", "*cough*",
  "cosy in here", "the ring holds", "who's on watch",
  // the book
  "shh, he's reading", "mind the words", "I'm in the margin", "who's reading us?",
  "Burooj drew me small", "this is a nice book", "we're on squared paper", "it smells of biro",
];

/** Exchanges: a line, and a comrade's answer. */
export const CHATS: Line[] = [
  chat("what's the plan", "no idea"), chat("you alright?", "no"), chat("is it lunch?", "it's always lunch"),
  chat("who's Dawood?", "the boss"), chat("did you see that", "I saw nothing"), chat("I'm going to lunge", "don't"),
  chat("cover me", "with what"), chat("are we winning", "define winning"), chat("I spy…", "a dot"),
  chat("nice weather", "it's a lamp"), chat("psst", "what"), chat("hold the line", "which line"),
  chat("left or right", "yes"), chat("scared?", "obviously"), chat("I've got a plan", "oh no"),
  chat("any sweets?", "one. mine."), chat("what if we lose", "new page"), chat("we're outnumbered", "count again"),
  chat("my feet hurt", "you're a dot"), chat("is this the front?", "it's all front"),
  chat("where's Dawood?", "holding the pen"), chat("we're winning!", "don't jinx it"),
  chat("you blinked", "I don't have eyes"), chat("shall we sing?", "please don't"),
  chat("I think I'm smudged", "suits you"), chat("tell my mum", "tell her what"),
  chat("did he miss?", "he always misses"), chat("why are we round", "ask the pen"),
  chat("I'm knackered", "you've not moved"), chat("do erasers hurt?", "shh"), chat("I'll go first", "after you"),
  // the book
  chat("someone's reading", "act natural"), chat("is this homework?", "it's a portfolio"),
  chat("who's Burooj?", "the one with the pen"), chat("who invented this game?", "Dawood. in maths."),
  chat("are we in maths?", "always"), chat("Dawood or Burooj?", "don't make me choose"),
  chat("why the margin?", "the words get the middle"), chat("can you read?", "only the big words"),
  chat("what page is this", "a good one"), chat("he's turning the page", "hold on to something"),
];

/** Lines about the page they're on, by its kind. */
export const PAGE_LINES: Record<string, Line[]> = {
  home: [
    "hello reader!", "that's him in the photo", chat("is that Burooj?", "nice glasses"),
    chat("what's a home page", "this. we live here."), "welcome in", "first page. best page",
  ],
  about: [
    "dear reader…", chat("is this a letter?", "to everyone"), "it's a love letter to the web",
    chat("API3?", "it's an acronym"), "he likes gaming. so do we", chat("people, stories…", "and dots"),
  ],
  resume: [
    "we're in his CV", "hire us too", chat("are we on the resume?", "under hobbies"),
    "it's typed. posh.", chat("is that a staple?", "don't touch it"), "references: Dawood",
  ],
  lab: [
    "are we the experiment?", chat("what's a lab?", "where doodles go"), "nice lotus",
    chat("is this science?", "it's doodling"), "I helped with the spiral",
  ],
  "lab-entry": ["are we the experiment?", "I'd try that", chat("does it work?", "mostly")],
  project: [
    "I helped build this", chat("is it shipped?", "it's shipped"), "nice screenshot",
    chat("who made this?", "Burooj. and us."), "we were there", chat("is it on the map?", "back page"),
  ],
  spare: ["a quick war!", "maths is boring", chat("is it maths?", "it's war"), "don't tell sir"],
};

export const LINES = {
  poke: ["oi!", "that tickles", "hey!", "me?", "I'm ready", "I was napping", "pick me!", "careful", "boop", "ready!", "right then", "at last", "yes?"],
  pokeAgain: ["stop it", "I bruise easily", "I'm telling Dawood", "rude", "oi! again?", "still here", "that's my dot"],
  pokeRed: ["wrong side", "you're not my pen", "Dawood's my pen", "off!", "are you Dawood?", "I'm {me}, thanks"],
  pokeDead: ["let him rest", "he's resting", "too late, mate", "leave him"],
  hint: ["pull me back!", "pull me & let go", "aim me!", "flick me at {them}"],
  aim: ["steady…", "hold still", "don't miss", "a bit left", "deep breath", tiny("I'm scared"), "don't sneeze", "aim for the big one"],
  phew: ["phew", "close one", "my hat!", "oi!", "missed me", "rude", "hey!", shout("HEY!"), "I felt that", "watch it"],
  dread: ["!", "!!", "eep", "not me not me", "mum?", "oh no", "gulp", "why me", "I'm too round to die"],
  kill: ["got him!", "yes!", "down!", "ha!", "for Dawood!", "another one", "sorry mate", "one for the book", shout("YES!"), "nothing personal"],
  miss: ["missed", "the wind", "I meant that", "warning shot", "I wasn't ready", "the pen slipped", tiny("oops")],
  mourn: ["no…", "he owed me lunch", "we'll remember him", "…", "he was so young", "Dawood, why", "avenge him", "that was my bunk mate", "he had a sandwich", tiny("not him")],
  lunge: [shout("Luuunge!"), shout("Chaaarge!"), shout("fooor Dawooood!"), shout("Geronimooo!"), shout("wheeee!"), shout("banzaaai!"), "hold my hat!"],
  snipe: [shout("Baaang!"), "eat this!", shout("Fiiire!"), "take that!", "pew pew!", "incoming!"],
  deny: ["not in our camp!", "gotcha!", "who's next?", "nice try", "denied!", "wrong camp mate", shout("GET OUT!"), "no entry", "we saw you coming"],
  more: ["One more!"],
  last: ["it's just us", "hold the line!", "we few", "to the last!", "not like this", "they shall not pass", tiny("it's been an honour")],
  botGo: ["my go", "Dawood's go", "your turn's over", "now us", "watch this", "nice miss, {them}"],
  // banter at the other side, by its pen's name (Dotfight's `banter`)
  banter: ["oi {them}!", "{them} can't aim", "{them}'s scared", "your camp's wonky", "nice miss {them}", "come and get us", "who drew you", "run home {them}", "{them}'s pen leaks", "is {them} even a colour", "{me} is the best colour", chat("{them} look scared", "so do you")],
  ended: ["is it over?", "we survived", "count us", "never again", "I need a lie down"],
} satisfies Record<string, Line[]>;

/** Lines about the paper itself, by theme (Dotfight's PAPER_LINES, and a few
 * about the section the book is for). */
export const PAPER_LINES: Record<string, Line[]> = {
  lamplight: ["squared paper. classy", "who did the sums here", "it's a maths copy", "the lamp's in my eyes", "2 mm squares, lovely"],
  notebook: ["a quiet notebook", "very posh paper", "don't crease it", "it's a nice notebook this", chat("is this a diary?", "it's a letter")],
  legal: ["yellow paper?", "is this legal", "very yellow", "it's a legal pad", "objection!", chat("is this a contract?", "it's a CV"), "sign here"],
  graph: ["graph paper. respect", "we're on a graph", "plot me", "x marks the dead", "it's all squares", "pencil? we're pencil?"],
  blueprint: ["we're on a blueprint", "it's very blue", "are we a plan", "chalk. fancy", "I feel architectural", chat("are we built yet?", "phase two")],
};

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
