# react-global-fetch-api

**react-global-fetch-api** is a lightweight React library for managing global fetch clients and state. It allows you to define multiple connections and share data across components without prop drilling.  
In short: connect once, and all components can reactively use the API.

---

## Features

- **Multiple connection support** — manage several fetch clients simultaneously. Identify connections by names.  
- **Global state management** — any component can subscribe to updates from a connection.  
- **Ephemeral state support** — state can be removed automatically on component mount or manually.  
- **React hook integration** — `useStateStore` hook lets components reactively track state.  
- **TypeScript ready** — full TypeScript support for safer usage in modern React apps.  
- **Minimal and lightweight** — no Redux or Context boilerplate required.  

---

## Installation

```bash
npm install react-global-fetch-api
# or
yarn add react-global-fetch-api
```

## Usage Example

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

import { useEffect } from "react";
import { requestData } from "react-global-fetch-api";

const Example = () => { //example Route

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


----
# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.2] - 2025-10-22
### Fixed json return