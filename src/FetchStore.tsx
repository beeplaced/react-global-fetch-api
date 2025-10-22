import { useState, useEffect } from "react";

export interface RequestResult {
    data: any[] | object | null;
    status: number;
    message?: string;
    error?: any; // can be a fetch error or thrown error
}

export const HttpStatusCodes: Record<number, string> = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
};

export const HttpErrorCodes: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
};

// FetchClient class
export interface FetchClientConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    connection?: string; // optional key for multiple connections
}

export class FetchClient {
    baseURL: string;
    defaultHeaders: Record<string, string>;

    constructor({ baseURL = "", headers = {} }: FetchClientConfig = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = headers;
    }
}

interface State {
  [key: string]: FetchClient | number | undefined;
  client?: FetchClient;
  updatedAt?: number;
}

// Global state management
let state: State = {};

const listeners: Map<string, Set<() => void>> = new Map();

export const getState = () => state;

export const setStateStore = (entry: any, key: string = "client") => {
    state = {
        ...state,
        [key]: { ...entry, updatedAt: Date.now() },
    };

    // Notify only listeners subscribed to this key
    listeners.get(key)?.forEach((listener) => listener());
};

export const removeStateStore = (...keys: string[]) => {
    const newState = { ...state };
    keys.forEach((key) => {
        delete newState[key];

        // Notify listeners only for the removed key
        listeners.get(key)?.forEach((listener) => listener());
    });
    state = { ...newState };
};

// Subscribe a listener for a specific key
export const subscribeKey = (key: string, listener: () => void): (() => void) => {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);

  // Return an unsubscribe function
  return () => {
    listeners.get(key)!.delete(listener);
    // Optional: remove the set if empty
    if (listeners.get(key)!.size === 0) listeners.delete(key);
  };
};

export const useStateStore = (key: string) => {
    const [value, setValue] = useState(state[key]);

    useEffect(() => {
        const update = () => setValue(state[key]);
        const unsubscribe = subscribeKey(key, update);
        return () => {
            unsubscribe();
        };
    }, [key]);

    return [value, (v: any) => setStateStore(v, key), removeStateStore] as const;
}

export const setFetchClient = (config: FetchClientConfig) => {
    const { connection = "client", ...rest } = config;
    const client = new FetchClient(rest);
    setStateStore(client, connection);
};

export const requestData = async({
  connection,
  route,
  method = "POST",
  body,
  headers: extraHeaders = {},
}: {
  connection: string;
  route: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}): Promise<any> => {
  const client = getFetchClient(connection);

  if (!client?.baseURL) {
    throw new Error(`FetchClient "${connection}" not initialized or has no baseURL`);
  }

  const url = `${client.baseURL}/${route}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...client.defaultHeaders,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${HttpErrorCodes[response.status] || "HTTP Error"} (${response.status}): ${text}`);
  }

  // Parse JSON if content exists, otherwise return null
  try {
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json());
    }
    return null;
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${(err as Error).message}`);
  }
};
const getFetchClient = (connection = "client"): FetchClient => {
    if (!state[connection]) throw new Error(`FetchClient "${connection}" not initialized.`);
    return state[connection] as FetchClient;
};