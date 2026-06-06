import { create } from "zustand";
import type { Branch } from "../types/branch";

type BranchStore = {
  activeBranchId: string | null;
  activeBranch: Branch | null;
  branches: Branch[];

  setBranches: (branches: Branch[]) => void;
  replaceBranches: (branches: Branch[]) => void;
  setActiveBranch: (branch: Branch | null) => void;
  resetBranches: () => void;
};

function normalizeBranchList(branches: Branch[]) {
  const seen = new Set<string>();

  return (Array.isArray(branches) ? branches : []).filter((branch) => {
    const id = String(branch?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function pickDefaultBranch(branches: Branch[]) {
  return branches.find((branch) => branch.isMain) ?? branches[0] ?? null;
}

export const useBranchStore = create<BranchStore>((set, get) => ({
  activeBranchId: null,
  activeBranch: null,
  branches: [],

  setBranches: (branches) => {
    const nextBranches = normalizeBranchList(branches);
    const currentActiveBranchId = get().activeBranchId;
    const currentStillExists = nextBranches.find(
      (branch) => branch.id === currentActiveBranchId,
    );

    const nextActive = currentStillExists ?? pickDefaultBranch(nextBranches);

    set({
      branches: nextBranches,
      activeBranch: nextActive,
      activeBranchId: nextActive?.id ?? null,
    });
  },

  replaceBranches: (branches) => {
    const nextBranches = normalizeBranchList(branches);
    const nextActive = pickDefaultBranch(nextBranches);

    set({
      branches: nextBranches,
      activeBranch: nextActive,
      activeBranchId: nextActive?.id ?? null,
    });
  },

  setActiveBranch: (branch) => {
    set({
      activeBranch: branch,
      activeBranchId: branch?.id ?? null,
    });
  },

  resetBranches: () => {
    set({
      activeBranchId: null,
      activeBranch: null,
      branches: [],
    });
  },
}));
