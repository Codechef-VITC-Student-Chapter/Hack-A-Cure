import { IUser } from "@/lib/types";
import { create } from "zustand";

interface TeamStore {
  teamDetails: IUser | null;
  loading: boolean;
  error: string | null;
  setTeamDetails: (details: IUser) => void;
  updateTeamDetails: (updates: Partial<IUser>) => void;
  clearTeamDetails: () => void;
  fetchTeamDetails: (userId: string) => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set) => ({
  teamDetails: null,
  loading: false,
  error: null,

  setTeamDetails: (details) => set({ teamDetails: details }),
  updateTeamDetails: (updates) =>
    set((state) => ({
      teamDetails: state.teamDetails
        ? ({ ...state.teamDetails, ...updates } as IUser)
        : null,
    })),
  clearTeamDetails: () => set({ teamDetails: null }),

  fetchTeamDetails: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/user/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch team data");

      const { data } = await res.json();
      set({ teamDetails: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
