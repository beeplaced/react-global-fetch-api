export interface RequestResult {
    data: any[] | object | null;
    status: number;
    message?: string;
    error?: any;
}
export declare const HttpStatusCodes: Record<number, string>;
export declare const HttpErrorCodes: Record<number, string>;
export interface FetchClientConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    redirect?: boolean;
    connection?: string;
}
export declare class FetchClient {
    baseURL: string;
    defaultHeaders: Record<string, string>;
    redirect: boolean;
    constructor({ baseURL, headers, redirect }?: FetchClientConfig);
}
interface State {
    [key: string]: FetchClient | number | undefined;
    client?: FetchClient;
    updatedAt?: number;
}
export declare const getState: () => State;
export declare const setStateStore: (entry: any, key?: string) => void;
export declare const removeStateStore: (...keys: string[]) => void;
export declare const subscribeKey: (key: string, listener: () => void) => (() => void);
export declare const useStateStore: (key: string) => readonly [number | FetchClient | undefined, (v: any) => void, (...keys: string[]) => void];
export declare const setFetchClient: (config: FetchClientConfig) => void;
export declare const requestData: ({ connection, route, method, body, headers: extraHeaders, credentials }: {
    connection: string;
    route: string;
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
}) => Promise<any>;
export declare const requestFileDownload: ({ connection, route, headers: extraHeaders, signal }: {
    connection: string;
    route: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}) => Promise<{
    blob: Blob;
    status: number;
    contentType: string;
} | void>;
export declare const saveBlobAsFile: ({ blob, filename, contentType, }: {
    blob: Blob;
    filename: string;
    contentType: string;
}) => Promise<{
    success: boolean;
    message: string;
}>;
export {};
