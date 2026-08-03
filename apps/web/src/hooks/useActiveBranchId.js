import {
  useEffect,
  useState,
} from "react";

import {
  getActiveBranchId,
} from "../services/apiClient";

export function useActiveBranchId() {
  const [activeBranchId, setActiveBranchId] =
    useState(
      () => getActiveBranchId() || "default",
    );

  useEffect(() => {
    function handleBranchChanged() {
      setActiveBranchId(
        getActiveBranchId() || "default",
      );
    }

    window.addEventListener(
      "storvex:branch-changed",
      handleBranchChanged,
    );
    window.addEventListener(
      "storvex:workspace-refreshed",
      handleBranchChanged,
    );

    return () => {
      window.removeEventListener(
        "storvex:branch-changed",
        handleBranchChanged,
      );
      window.removeEventListener(
        "storvex:workspace-refreshed",
        handleBranchChanged,
      );
    };
  }, []);

  return activeBranchId;
}

export default useActiveBranchId;
