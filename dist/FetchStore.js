var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { useState, useEffect } from "react";
;
export const HttpStatusCodes = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content", //Delete, PATCH, PUT
    // 205: "Reset Content"
};
export const HttpErrorCodes = {
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
const mimeToExtension = {
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
;
export class FetchClient {
    constructor({ baseURL = "", headers = {}, redirect = false } = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = headers;
        this.redirect = redirect;
    }
}
;
;
// Global state management
let state = {};
const listeners = new Map();
export const getState = () => state;
export const setStateStore = (entry, key = "client") => {
    var _a;
    state = Object.assign(Object.assign({}, state), { [key]: Object.assign(Object.assign({}, entry), { updatedAt: Date.now() }) });
    // Notify only listeners subscribed to this key
    (_a = listeners.get(key)) === null || _a === void 0 ? void 0 : _a.forEach((listener) => listener());
};
export const removeStateStore = (...keys) => {
    const newState = Object.assign({}, state);
    keys.forEach((key) => {
        var _a;
        delete newState[key];
        // Notify listeners only for the removed key
        (_a = listeners.get(key)) === null || _a === void 0 ? void 0 : _a.forEach((listener) => listener());
    });
    state = Object.assign({}, newState);
};
// Subscribe a listener for a specific key
export const subscribeKey = (key, listener) => {
    if (!listeners.has(key))
        listeners.set(key, new Set());
    listeners.get(key).add(listener);
    // Return an unsubscribe function
    return () => {
        listeners.get(key).delete(listener);
        // Optional: remove the set if empty
        if (listeners.get(key).size === 0)
            listeners.delete(key);
    };
};
export const useStateStore = (key) => {
    const [value, setValue] = useState(state[key]);
    useEffect(() => {
        const update = () => setValue(state[key]);
        const unsubscribe = subscribeKey(key, update);
        return () => {
            unsubscribe();
        };
    }, [key]);
    return [value, (v) => setStateStore(v, key), removeStateStore];
};
export const setFetchClient = (config) => {
    const { connection = "client" } = config, rest = __rest(config, ["connection"]);
    const client = new FetchClient(rest);
    setStateStore(client, connection);
};
export const requestData = (_a) => __awaiter(void 0, [_a], void 0, function* ({ connection, route, method = "POST", body, headers: extraHeaders = {}, credentials = undefined }) {
    const client = getFetchClient(connection);
    if (!(client === null || client === void 0 ? void 0 : client.baseURL)) {
        throw new Error(`FetchClient "${connection}" not initialized or has no baseURL`);
    }
    const url = `${client.baseURL}/${route}`;
    const options = Object.assign(Object.assign({ method, headers: Object.assign({ "Content-Type": "application/json" }, extraHeaders) }, (body !== undefined && { body: JSON.stringify(body) })), (credentials !== undefined && { credentials }));
    try {
        const response = yield fetch(url, options);
        if (!response.ok) {
            const text = yield response.text().catch(() => "");
            throw new Error(`${HttpErrorCodes[response.status] || "HTTP Error"} (${response.status}): ${text}`);
        }
        const contentType = response.headers.get("content-type") || "";
        switch (true) {
            case [200, 201, 202, 203].indexOf(response.status) !== -1 && contentType.includes("application/json"): {
                const data = yield response.json();
                return { data, status: response.status };
            }
            case response.status === 204: //Delete, PATCH, PUT
                return { data: { msg: `success on ${method}` }, status: response.status };
            case response.status === 302 || response.type === "opaqueredirect": {
                console.warn("Redirect (302) detected");
                if (client.redirect)
                    window.location.href = window.location.origin;
                return { status: 302, error: "Redirected to login" };
            }
            case response.status === 401: {
                console.warn("Unauthorized (401)");
                if (client.redirect)
                    window.location.href = window.location.origin;
                return { status: 401, error: "Unauthorized" };
            }
            default: {
                if (!contentType.includes("application/json")) {
                    let text = "";
                    try {
                        text = yield response.text();
                    }
                    catch (err) {
                        console.warn("Could not read response text:", err);
                        return { status: response.status, error: "Failed to read response body" };
                    }
                    if (text.toLowerCase().includes("<!doctype html") || text.toLowerCase().includes("<html")) {
                        console.warn("Got HTML instead of JSON — likely login redirect.");
                        if (client.redirect)
                            window.location.href = window.location.origin;
                        return { status: response.status, error: "HTML redirect" };
                    }
                    return { status: response.status, error: "Unexpected content type" };
                }
                throw new Error(`${HttpErrorCodes[response.status] || "HTTP Error"} (${response.statusText})`);
            }
        }
    }
    catch (error) {
        throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
});
export const requestFileDownload = (_a) => __awaiter(void 0, [_a], void 0, function* ({ connection, route, headers: extraHeaders = {}, signal }) {
    try {
        const client = getFetchClient(connection);
        if (!(client === null || client === void 0 ? void 0 : client.baseURL)) {
            throw new Error(`FetchClient "${connection}" not initialized or has no baseURL`);
        }
        const url = `${client.baseURL}/${route}`;
        const options = {
            method: "GET",
            headers: Object.assign(Object.assign({}, client.defaultHeaders), extraHeaders),
            signal
        };
        const response = yield fetch(url, options);
        // --- 1️⃣ Handle Unauthorized (401) ---
        if (response.status === 401) {
            console.warn("Unauthorized (401) — redirecting to origin...");
            window.location.href = window.location.origin;
            return; // Stop execution here
        }
        if (!response.ok) {
            const text = yield response.text().catch(() => "");
            throw new Error(`Download failed (${response.status}): ${text}`);
        }
        const contentType = response.headers.get("Content-Type") || "application/octet-stream";
        const blob = yield response.blob();
        return { blob, status: response.status, contentType };
    }
    catch (err) {
        if (err.name === "AbortError") {
            console.warn("Download aborted by user");
            throw new Error("Download aborted by user");
        }
        throw new Error(`File download failed: ${err.message}`);
    }
});
export const saveBlobAsFile = (_a) => __awaiter(void 0, [_a], void 0, function* ({ blob, filename, contentType, }) {
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
        yield new Promise((resolve) => {
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
    }
    catch (err) {
        const message = err.message || "Unknown error";
        console.error("Failed to save file:", message);
        return { success: false, message };
    }
});
const getFetchClient = (connection = "client") => {
    if (!state[connection])
        throw new Error(`FetchClient "${connection}" not initialized.`);
    return state[connection];
};
