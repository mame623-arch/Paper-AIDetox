"use client";

import { useEffect, useState } from "react";

const KEY = "aidetox.currentMemberId";

export function getCurrentMemberId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setCurrentMemberId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(KEY, id);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("aidetox:user-change"));
}

/** Reactive hook for the currently selected member id. */
export function useCurrentMemberId(): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(getCurrentMemberId());
    const sync = () => setId(getCurrentMemberId());
    window.addEventListener("aidetox:user-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("aidetox:user-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [id, setCurrentMemberId];
}
