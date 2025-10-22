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

const mimeToExtension: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "text/plain": "txt",
  "application/zip": "zip",
  "application/json": "json",
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

export const requestData = async ({
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
      const data = await response.json();
      return { data, status: response.status };
    }
    const text = await response.text();
    return { data: text, status: response.status };
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${(err as Error).message}`);
  }
};

export const requestFileDownload = async ({
  connection,
  route,
  headers: extraHeaders = {},
  signal
}: {
  connection: string;
  route: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<{ blob: Blob; status: number; contentType: string }> => {
  try {
    const client = getFetchClient(connection);
    if (!client?.baseURL) {
      throw new Error(`FetchClient "${connection}" not initialized or has no baseURL`);
    }

    const url = `${client.baseURL}/${route}`;
    const options: RequestInit = {
      method: "GET",
      headers: {
        ...client.defaultHeaders,
        ...extraHeaders,
      },
      signal
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Download failed (${response.status}): ${text}`);
    }

    const contentType = response.headers.get("Content-Type") || "application/octet-stream";
    const blob = await response.blob();

    return { blob, status: response.status, contentType };
  } catch (err) {
    if ((err as any).name === "AbortError") {
      console.warn("Download aborted by user");
      throw new Error("Download aborted by user");
    }
    throw new Error(`File download failed: ${(err as Error).message}`);
  }
};

export const saveBlobAsFile = async ({
  blob,
  filename,
  contentType,
}: {
  blob: Blob;
  filename: string;
  contentType: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const ext = mimeToExtension[contentType.toLowerCase()] || "bin";

    // Remove existing extension from filename if present
    const baseName = filename.replace(/\.[^/.]+$/, "");
    const finalFilename = `${baseName}.${ext}`;

    // Create temporary link to trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalFilename;
    a.style.display = "none";
    document.body.appendChild(a);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          a.remove();
          resolve();
        }, 2000);
      }, 100);
    });

    return { success: true, message: "File downloaded successfully" };
  } catch (err) {
    const message = (err as Error).message || "Unknown error";
    console.error("Failed to save file:", message);
    return { success: false, message };
  }
};

const getFetchClient = (connection = "client"): FetchClient => {
  if (!state[connection]) throw new Error(`FetchClient "${connection}" not initialized.`);
  return state[connection] as FetchClient;
};