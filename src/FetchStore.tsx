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

export const requestData = async <T = any>({
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
    headers?: object;
}): Promise<RequestResult> => {
    const client = getFetchClient(connection);
    if (!client?.baseURL) {
        return {
            data: null,
            status: 0,
            error: new Error(`FetchClient for connection "${connection}" is not initialized or has no baseURL`),
        };
    }
    const url = `${client.baseURL}/${route}`;
    try {
        const options: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                ...client.defaultHeaders,
                ...extraHeaders,
            }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);

        // Validate response before parsing JSON
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            return {
                data: null,
                status: response.status,
                message: HttpErrorCodes[response.status],
                error: errorData || new Error(`HTTP error! Status: ${response.status}`),
            };
        }

        // Only parse JSON if the response is OK and has content
        const data = await response.json().catch(() => null);
        return {
            data,
            status: response.status,
            message: HttpStatusCodes[response.status],
        };
    } catch (error: any) {
        console.warn(`Request failed for ${method} ${url}`, error);
        const status = error.name === "AbortError" ? 0 : 500;
        return {
            data: null,
            status,
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
};

const getFetchClient = (connection = "client"): FetchClient => {
    if (!state[connection]) throw new Error(`FetchClient "${connection}" not initialized.`);
    return state[connection] as FetchClient;
};