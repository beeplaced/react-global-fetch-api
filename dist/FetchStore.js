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
export const HttpStatusCodes = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
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
export class FetchClient {
    constructor({ baseURL = "", headers = {} } = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = headers;
    }
}
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
export const requestData = (_a) => __awaiter(void 0, [_a], void 0, function* ({ connection, route, method = "POST", body, headers: extraHeaders = {}, }) {
    const client = getFetchClient(connection);
    if (!(client === null || client === void 0 ? void 0 : client.baseURL)) {
        return {
            data: null,
            status: 0,
            error: new Error(`FetchClient for connection "${connection}" is not initialized or has no baseURL`),
        };
    }
    const url = `${client.baseURL}/${route}`;
    try {
        const options = {
            method,
            headers: Object.assign(Object.assign({ "Content-Type": "application/json" }, client.defaultHeaders), extraHeaders)
        };
        if (body)
            options.body = JSON.stringify(body);
        const response = yield fetch(url, options);
        // Validate response before parsing JSON
        if (!response.ok) {
            const errorData = yield response.json().catch(() => null);
            return {
                data: null,
                status: response.status,
                message: HttpErrorCodes[response.status],
                error: errorData || new Error(`HTTP error! Status: ${response.status}`),
            };
        }
        // Only parse JSON if the response is OK and has content
        const data = yield response.json().catch(() => null);
        return {
            data,
            status: response.status,
            message: HttpStatusCodes[response.status],
        };
    }
    catch (error) {
        console.warn(`Request failed for ${method} ${url}`, error);
        const status = error.name === "AbortError" ? 0 : 500;
        return {
            data: null,
            status,
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
});
const getFetchClient = (connection = "client") => {
    if (!state[connection])
        throw new Error(`FetchClient "${connection}" not initialized.`);
    return state[connection];
};
