// The featured campaign banner on the home page. Leave as null to hide it.
// Fill it in only once the wording is confirmed; this repo is public, so
// anything here is published.
export interface Campaign {
  eyebrow: string;
  title: string;
  body: string;
  when?: string;
  where?: string;
  cta: string;
  href: string;
}

export const campaign: Campaign | null = null;
