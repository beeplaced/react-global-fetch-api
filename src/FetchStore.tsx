import { useState, useEffect } from "react";

export interface RequestResult {
  data: any[] | object | null;
  status: number;
  message?: string;
  error?: any; // can be a fetch error or thrown error
};

export const HttpStatusCodes: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content", //Delete, PATCH, PUT
  // 205: "Reset Content"
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
  redirect?: boolean;
  connection?: string; // optional key for multiple connections
};

export class FetchClient {
  baseURL: string;
  defaultHeaders: Record<string, string>;
  redirect: boolean;

  constructor({ baseURL = "", headers = {}, redirect = false }: FetchClientConfig = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = headers;
    this.redirect = redirect
  }
};

interface State {
  [key: string]: FetchClient | number | undefined;
  client?: FetchClient;
  updatedAt?: number;
};

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
};

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
  credentials = undefined
}: {
  connection: string;
  route: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
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
      ...extraHeaders,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    ...(credentials !== undefined && { credentials }),
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${HttpErrorCodes[response.status] || "HTTP Error"} (${response.status}): ${text}`);
    }

    const contentType = response.headers.get("content-type") || "";
    switch (true) {
      case [200, 201, 202, 203].indexOf(response.status) !== -1 && contentType.includes("application/json"): {
        const data = await response.json();
        return { data, status: response.status };
      }

      case response.status === 204: //Delete, PATCH, PUT
        return { data: { msg: `success on ${method}` }, status: response.status };

      case response.status === 302 || response.type === "opaqueredirect": {
        console.warn("Redirect (302) detected");
        if (client.redirect) window.location.href = window.location.origin;
        return { status: 302, error: "Redirected to login" };
      }

      case response.status === 401: {
        console.warn("Unauthorized (401)");
        if (client.redirect) window.location.href = window.location.origin;
        return { status: 401, error: "Unauthorized" };
      }

      default: {
        if (!contentType.includes("application/json")) {
          let text = "";
          try {
            text = await response.text();
          } catch (err) {
            console.warn("Could not read response text:", err);
            return { status: response.status, error: "Failed to read response body" };
          }

          if (text.toLowerCase().includes("<!doctype html") || text.toLowerCase().includes("<html")) {
            console.warn("Got HTML instead of JSON — likely login redirect.");
            if (client.redirect) window.location.href = window.location.origin;
            return { status: response.status, error: "HTML redirect" };
          }

          return { status: response.status, error: "Unexpected content type" };
        }
        throw new Error(`${HttpErrorCodes[response.status] || "HTTP Error"} (${response.statusText})`);
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to parse JSON response: ${(error as Error).message}`);
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
}): Promise<{ blob: Blob; status: number; contentType: string } | void> => {
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

    // --- 1️⃣ Handle Unauthorized (401) ---
    if (response.status === 401) {
      console.warn("Unauthorized (401) — redirecting to origin...");
      window.location.href = window.location.origin;
      return; // Stop execution here
    }

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