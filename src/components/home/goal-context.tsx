'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface GoalState {
  /** Slug of the chosen goal, or null for "everything". */
  selected: string | null;
  select: (slug: string | null) => void;
}

const GoalContext = createContext<GoalState>({ selected: null, select: () => {} });

/** Shares the chosen goal between the selector, its 3D backdrop and the product grid. */
export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [selected, select] = useState<string | null>(null);
  const value = useMemo(() => ({ selected, select }), [selected]);
  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoal() {
  return useContext(GoalContext);
}
