/** Throwaway BJS-427 comparison data. Keep content identical between layouts. */
export interface PrototypeData {
  projects: {
    title: string;
    summary: string;
    href: string;
    cover: string;
    role: string;
    dateLabel: string;
    tools: string[];
  }[];
  updates: {
    title: string;
    date: string;
    dateLabel: string;
    summary: string;
    href: string;
    linkLabel: string;
  }[];
  site: {
    name: string;
    email: string;
    writingUrl: string;
    social: { label: string; href: string }[];
  };
}
