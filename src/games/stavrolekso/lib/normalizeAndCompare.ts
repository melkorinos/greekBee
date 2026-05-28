import { normalizeLetters } from "@/lib/normalize";

export function normalizeAndCompare(input: string, answer: string): boolean {
  if (!input || !answer) return false;
  return normalizeLetters(input) === normalizeLetters(answer);
}
