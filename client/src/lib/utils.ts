import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAllTeams } from "./apiUtils";
import { IUser } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseAsUTC(input: string | number | Date) {
  if (input instanceof Date) return input;
  if (typeof input === "number")
    return new Date(input > 1e12 ? input : input * 1000);
  // normalize: ensure 'T', trim to 3 ms digits, and treat as UTC
  const s = input.replace(" ", "T");
  const trimmed = s.replace(/(\.\d{3})\d+$/, "$1");
  const withZone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(trimmed)
    ? trimmed
    : trimmed + "Z";
  return new Date(withZone);
}

export const formatDateTime = (date: string, timeZone: string) => {
  const d = parseAsUTC(date); // e.g., "2025-10-25T13:57:56.591000"
  const formattedDate =
    d.toLocaleDateString("en-IN", {
      timeZone: timeZone,
    }) +
    " " +
    d.toLocaleTimeString("en-IN", {
      timeZone: timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  return formattedDate;
};

export const fetchLeaderboard = async (setTeams: (teams: IUser[]) => void) => {
  try {
    const { success, data: teams } = await getAllTeams();

    if (!success) {
      throw new Error("Failed to fetch teams");
    }

    setTeams(teams);
    console.log(teams);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
  }
};
