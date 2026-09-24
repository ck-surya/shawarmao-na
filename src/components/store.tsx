"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { MenuItem } from "@/lib/domain";
type Catalog = {
  items: MenuItem[];
  orderingEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number | null;
  taxRateBps: number;
};
type CartLine = { id: string; quantity: number };
type Store = {
  catalog: Catalog;
  cart: CartLine[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  bagOpen: boolean;
  setBagOpen: (v: boolean) => void;
};
const Context = createContext<Store | null>(null);
export async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  const data = await response.json().catch(() => {
    throw new Error(
      response.status === 413
        ? "This photo is too large to upload. Choose a smaller image."
        : "Unable to connect. Try again.",
    );
  });
  if (!response.ok)
    throw new Error(data.error || "Unable to connect. Try again.");
  return data;
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>({
    items: [],
    orderingEnabled: false,
    deliveryEnabled: false,
    deliveryFee: null,
    taxRateBps: 0,
  });
  const [cart, setCart] = useState<CartLine[]>([]),
    [ready, setReady] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [bagOpen, setBagOpen] = useState(false);
  const refresh = useCallback(async () => {
    setError("");
    try {
      setCatalog(await request<Catalog>("/api/menu"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    try {
      const saved = JSON.parse(localStorage.getItem("shawarma-bag") || "[]");
      if (Array.isArray(saved))
        setCart(
          saved
            .filter(
              (v) =>
                typeof v.id === "string" &&
                Number.isInteger(v.quantity) &&
                v.quantity > 0 &&
                v.quantity <= 20,
            )
            .slice(0, 50),
        );
    } catch {}
    setReady(true);
  }, [refresh]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("shawarma-bag", JSON.stringify(cart));
      } catch {}
  }, [cart, ready]);
  function setQuantity(id: string, quantity: number) {
    setCart((old) => {
      const remaining = old.filter((i) => i.id !== id);
      return quantity > 0
        ? [...remaining, { id, quantity: Math.min(20, quantity) }]
        : remaining;
    });
  }
  return (
    <Context.Provider
      value={{
        catalog,
        cart,
        loading,
        error,
        refresh,
        setQuantity,
        clear: () => setCart([]),
        bagOpen,
        setBagOpen,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error("StoreProvider required");
  return context;
}
