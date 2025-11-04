# react-global-fetch-api

**react-global-fetch-api** is a lightweight React library for managing global fetch clients and state. It allows you to define multiple connections and share data across components without prop drilling. In short: connect once, and all components can reactively use the API.

---

## Features

- **Multiple connection support** — manage several fetch clients simultaneously. Identify connections by names.  
- **Global state management** — any component can subscribe to updates from a connection.  
- **Ephemeral state support** — state can be removed automatically on component mount or manually.  
- **React hook integration** — `useStateStore` hook lets components reactively track state.  
- **TypeScript ready** — full TypeScript support for safer usage in modern React apps.  
- **Minimal and lightweight** — no Redux or Context boilerplate required.
- **Download Reports or images** — The Download Reports or Images module provides a robust two-step workflow to download files from a server in the browser

---

## Table of Contents
- [Download Data](#download-data)
- [Download Reports or Images](#download-reports-or-images)
- [Changelog](#changelog)


## Installation

```bash
npm install react-global-fetch-api
# or
yarn add react-global-fetch-api
```
# Download Data

## Data Handling

```jsx
//App.tsx -> connect 
import { setFetchClient } from "react-global-fetch-api";

const App: React.FC = () => {

  setFetchClient({ baseURL: "https://jsonplaceholder.typicode.com", connection: "jsonplaceholder" });

  return (
    <Router>
      <Routes>
        <Route path="*" element={<Example />} />
      </Routes>
    </Router>
  );
};
```

```jsx
//example Route
import { useEffect } from "react";
import { requestData } from "react-global-fetch-api";

const Example = () => { 

  useEffect(() => {
    createPost();
    getPosts();
    failPost();
  }, []);

  const failPost = async () => {
    const result = await requestData({
      connection: "jsonplaceholder",
      route: "invalid-endpoint", // this route does not exist → will fail
      method: "POST",
      body: { title: "Hello", body: "World", userId: 1 },
    });

    console.log("Result:", result);

    if (result.error) {
      console.error("Error caught:", result.error);
    }
  };

  const createPost = async () => {
    const result = await requestData({
      connection: "jsonplaceholder",
      route: "posts",
      method: "POST",
      body: {
        title: "My Test Post",
        body: "This is a test post body",
        userId: 123,
      },
    });

    console.log("POST Result:", result);
  };

  const getPosts = async () => {
    const result = await requestData({
      connection: "jsonplaceholder",
      route: "posts",
      method: "GET",
      headers: { Authorization: "Bearer fake-token" },
    });
    console.log("GET Result:", result);
  };

  return null;
};

export default Example;

```
# requestData Function
## Function Signature

```ts
const requestData = async ({
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
}): Promise<{ data: any; status: number }>;

```

## Parameters

| Name         | Type                     | Required | Description                                                                                            |
| ------------ | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `connection` | `string`                 | ✅        | The name or key of the `FetchClient` configuration. Used to retrieve the base URL and default headers. |
| `route`      | `string`                 | ✅        | The API route or endpoint to call (appended to the client’s base URL).                                 |
| `method`     | `string`                 | ❌        | HTTP method to use (default: `"POST"`).                                                                |
| `body`       | `any`                    | ❌        | The request payload (automatically JSON-stringified if provided).                                      |
| `headers`    | `Record<string, string>` | ❌        | Additional headers to merge with default client headers.                                               |

## returns

```ts
{
  data: any;
  status: number;
}
```
# Download Reports or Images

## Overview

Features

- Two-step download: fetch → save
- Progress reporting for large files
- External cancellation of downloads
- Automatic file extension detection from MIME type
- Works with images and PDF reports
- Async/await friendly API

It supports PDFs, PNGs, JPEGs, GIFs, and other binary files, and is compatible with modern browsers

## Step 1: Download Blob

```ts
import { requestFileDownload } from './download';

const { blob, contentType } = await requestFileDownload({
  connection: 'default',
  route: 'files/sample-report',
});
```

## returns

```ts
{ 
  blob: Blob; 
  status: number; 
  contentType: string 
}
```

## Step 2: Save File

```ts
import { saveBlobAsFile } from './download';

await saveBlobAsFile({
  blob,
  filename: 'report',
  contentType,
});
```
- The function automatically determines the correct file extension from the MIME type.
- Returns an async status object: { success: boolean; message: string }.

----
# Changelog

All notable changes to this project will be documented in this file.

---
## [1.1.2] - 2025-11-04
- rebuild
## [1.1.1] - 2025-11-04
- redirect added via instructor globally (def: false)
## [1.1.0] - 2025-11-04
- rebuild error handling, added 
- redirect?: boolean; - redirect window.location.origin if true, (def: false)
  - redirect on 302, 405 or "doctype..." response
- credentials?: RequestCredentials (def: undefined)
## [1.0.1] - 2025-10-30
- added Unauthorized (401) — redirecting to origin... to requestData and requestFileDownload
## [1.0.0] - 2025-10-22
- added Download Reports or images and docu
## [0.1.2] - 2025-10-22
- Fixed json return