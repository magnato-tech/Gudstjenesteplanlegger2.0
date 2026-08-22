const store = new Map<string, string>();

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
}

const meta = import.meta as ImportMeta & { env?: Record<string, unknown> };
if (!meta.env) {
  (meta as { env: Record<string, unknown> }).env = {
    PROD: false,
    DEV: true,
    MODE: "test",
    SSR: false,
    BASE_URL: "/",
    VITE_USE_REMOTE_DATA: "false",
  };
}
