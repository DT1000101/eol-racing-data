import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "eol-rider-favourites";

function readFavourites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeFavourites(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<Set<string>>(() => readFavourites());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavourites(readFavourites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isFavourite = useCallback(
    (riderId: string) => favourites.has(riderId),
    [favourites],
  );

  const toggleFavourite = useCallback((riderId: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(riderId)) next.delete(riderId);
      else next.add(riderId);
      writeFavourites(next);
      return next;
    });
  }, []);

  return { favourites, isFavourite, toggleFavourite };
}
