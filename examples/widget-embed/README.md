# Widget Embed — Tokamak Pilot Chat Widget

Embed a floating "Ask about Tokamak" chat widget on any website with a single `<script>` tag. No build tools, no framework — works on any HTML page.

## Quick Start

Add this to any HTML page, right before `</body>`:

```html
<script
  src="https://api.tokamakforest.com/widget.js"
  data-api-key="YOUR_API_KEY"
></script>
```

That's it. A floating chat button appears at the bottom-right corner. Click it to ask questions about the Tokamak Network ecosystem.

## Configuration

All configuration is done via `data-*` attributes on the script tag:

| Attribute | Default | Options | Description |
|-----------|---------|---------|-------------|
| `data-api-key` | *(required)* | — | Your Tokamak Pilot API key |
| `data-api-url` | Auto-detected | Any URL | Override the API base URL |
| `data-theme` | `dark` | `dark`, `light` | Widget color theme |
| `data-position` | `bottom-right` | `bottom-right`, `bottom-left` | Button and panel position |

### Examples

**Dark theme (default):**

```html
<script
  src="https://api.tokamakforest.com/widget.js"
  data-api-key="YOUR_API_KEY"
></script>
```

**Light theme, bottom-left:**

```html
<script
  src="https://api.tokamakforest.com/widget.js"
  data-api-key="YOUR_API_KEY"
  data-theme="light"
  data-position="bottom-left"
></script>
```

**Project-scoped (only answers about a specific project):**

```html
<script
  src="https://api.tokamakforest.com/widget.js"
  data-api-key="YOUR_API_KEY"
  data-api-url="https://api.tokamakforest.com/api/v1/projects/tokamak-bridge/public"
></script>
```

**Local development:**

```html
<script
  src="http://localhost:4000/widget.js"
  data-api-key="YOUR_API_KEY"
  data-api-url="http://localhost:4000/api/v1/public"
></script>
```

## Demo Pages

Open the HTML files in this directory to see the widget in action:

| File | Description |
|------|-------------|
| `index.html` | Interactive configurator — switch themes, positions, and copy the embed code |
| `demo-dark.html` | Dark theme, bottom-right (default) |
| `demo-light.html` | Light theme, bottom-right |
| `demo-left.html` | Dark theme, bottom-left |
| `demo-project.html` | Project-scoped widget |

### Running the demos

1. Set your API key in the HTML files (replace `YOUR_API_KEY`)
2. Open any HTML file in a browser — no server needed:

```bash
open examples/widget-embed/index.html
```

Or serve them locally:

```bash
npx serve examples/widget-embed
```

## How It Works

The `widget.js` script is served by the Tokamak Pilot API. When loaded, it:

1. Reads configuration from `data-*` attributes on the script tag
2. Injects a floating button and chat panel into the page
3. When the user sends a message, calls `POST /api/v1/public/ask` with the question
4. Displays the answer with cited sources
5. Maintains conversation history for follow-up questions (up to 10 messages)

No cookies, no localStorage, no tracking. The widget is fully self-contained.

## API Key Scopes

The widget only needs the `ask` scope. Create an API key at [Settings → API Keys](https://pilot.tokamak.network) with the `ask` scope enabled.
