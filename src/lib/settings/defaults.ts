import type { Topic } from "@/lib/maths/types";
import type { PlayerForm } from "./types";

export const TOPIC_OPTIONS: { value: Topic; label: string }[] = [
  { value: "addition", label: "Addition" },
  { value: "subtraction", label: "Subtraction" },
  { value: "multiplication", label: "Multiplication" },
  { value: "division", label: "Division" },
  { value: "squares", label: "Square numbers" },
  { value: "square-roots", label: "Square roots" },
  { value: "percentages", label: "Percentages" },
  { value: "mixed", label: "Mixed operations" },
];

export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

export const defaultName = (index: 0 | 1) => `Player ${index + 1}`;

export const defaultPlayerForm = (): PlayerForm => ({ name: "", difficulty: "medium", topics: ["addition"] });
