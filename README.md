# @spicetify/bundler

**Spicetify Extension Bundler**  
Supports React, TypeScript, CSS, and SASS for Spicetify extensions.

---

## Features

- **Zero-config**: Out-of-the-box support for React, TypeScript, CSS, and SASS.
- **Hot Reloading**: Live reload your extension in Spicetify during development.
- **Release Bundling**: Minifies and bundles your extension for production.
- **Spicetify Integration**: Automatically applies and toggles your extension in Spicetify.
- **WebSocket Server**: For live updates and communication with the client.

---

## Quickstart

### 1. Project Structure

A typical extension project looks like:

```
  src/
    index.tsx
    app.tsx
    style.scss
  build/
    build.ts
  dist/
```

- `src/`: Your extension source code (React, TS, CSS/SCSS).
- `build/build.ts`: Entry point to run the bundler.
- `dist/`: Output directory for release builds.

### 2. Example Source

**src/index.tsx**
```tsx
import App from "./app.tsx";
import "./style.scss";
import React from "react";
import { createRoot } from 'react-dom/client';

const elem = document.createElement("div");
elem.classList.add("reactMain");
document.body.appendChild(elem);

const root = createRoot(elem);
root.render(<App />);
```

**src/app.tsx**
```tsx
import React, { useState } from 'react';
import { Spicetify } from "@spicetify/bundler";

export default function App() {
    const [titleContent, setTitleContent] = useState("Hello");

    const buttonCallback = () => {
        setTitleContent(titleContent === "Hello" ? "World" : "Hello");
        Spicetify.Player.togglePlay();
    }

    return (
        <>
            <h1>{titleContent}</h1>
            <button onClick={buttonCallback}>Click Me</button>
        </>
    );
}
```

> [!WARNING]
> **Do not forget to import `React` in a file containing JSX code**

**src/style.scss**
```scss
.reactMain {
    position: fixed;
    top: 102px;
    left: 125px;
    background-color: var(--spice-card);
    color: var(--spice-text);
}
```

**build/build.ts**
```ts
import { Bundle } from "@spicetify/bundler/cli";

Bundle({
    Type: "Development",
    Name: "my-extension"
});
```

---

## Usage

### Development Mode

1. **Start the Bundler**  
   Run your build script (e.g., `deno run -A build/build.ts`).

2. **Live Reload**  
   - The extension is automatically bundled and applied to Spicetify.
   - On file changes, the extension reloads in the client.
   - Use `[Enter]` to re-bundle, `[Q]` to quit, `[L]` to store locally and quit.

### Release Mode

To create a minified, production-ready bundle:

```ts
import { Bundle } from "@spicetify/bundler/cli";

Bundle({
    Type: "Release",
    Name: "my-extension",
    Version: "1.0.0"
});
```

- Output is written to the `./dist` folder by default.

---

## API

### `Bundle(options)`

- **Type**: `"Development" | "Release"`
- **Name**: Extension name (required)
- **Version**: Required for `"Release"`
- **EntrypointFile**: Entry file (default: `./src/index.tsx`)
- **OutputDir**: Output directory (default: `./dist`, only for `"Release"`)
- **RequireChangesToRefresh**: Only for `"Development"`

### Example

```ts
Bundle({
    Type: "Development",
    Name: "my-extension"
});
```

---

## Spicetify API Types

The bundler provides a `Spicetify` global with full TypeScript types for the Spicetify API, including:

- `Spicetify.Player`
- `Spicetify.React`, `Spicetify.ReactDOM`
- `Spicetify.Menu`, `Spicetify.ContextMenu`
- And more...

See [`Source/Types/Spicetify.ts`](./Source/Types/Spicetify.ts) for the full API.

---

## Advanced

- **SASS/SCSS**: Import `.scss` files directly in your code.
- **PostCSS/Autoprefixer**: CSS is processed for browser compatibility.
- **Minification**: Release builds are minified with Esbuild's minification system.
- **WebSocket**: Development server runs on port `9235` for live updates.

---

## Requirements

- [Deno](https://deno.com/)
- [Spicetify CLI](https://spicetify.app/docs/)