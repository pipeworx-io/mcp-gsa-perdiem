# mcp-gsa-perdiem

Unofficial GSA Per Diem MCP — wraps the GSA Per Diem API v2 (api.gsa.gov)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 2006+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Tools

| Tool | Description |
|------|-------------|
| `rates_by_city` | Get US federal per diem rates (government travel lodging and meal allowances) for a city by name and state. Returns the monthly lodging ceiling (per-diem lodging varies by month/season), the flat M&IE (meals & incidental expenses) daily total, and its breakdown into breakfast, lunch, dinner, incidental expenses and the first/last travel day amount (meals_breakdown). Answers "GSA FY2026 M&IE breakdown for Nashville, TN", "federal per diem for Denver, CO", "government hotel rate cap in San Francisco". Example: rates_by_city({ city: "Denver", state: "CO" }). |
| `rates_by_zip` | Get US federal per diem rates (government travel lodging and meal allowances) for a location by zip code. Returns the monthly lodging ceiling (per-diem lodging varies by month/season), the flat M&IE (meals & incidental expenses) daily total, and its breakdown into breakfast, lunch, dinner, incidental expenses and the first/last travel day amount (meals_breakdown). Answers "GSA M&IE breakdown for zip 37203", "federal per diem for 80202". Example: rates_by_zip({ zip: "80202" }). |
| `mie_breakdown` | US federal per diem MEALS AND INCIDENTAL EXPENSES (M&IE) nationwide tier table: the GSA tiers (68, 74, 80, 86, 92 in FY2026) that split a daily M&IE total into breakfast, lunch, dinner and incidental expenses, plus the reduced first/last travel day amount. The table is organised by dollar tier. Use for "how much is the per diem lunch allowance", "what are the GSA M&IE tiers for FY2026", "what is the incidental expense rate". Pass `total` (a daily M&IE total, e.g. 86) to get that tier; omit it to list all tiers. A question that names a city or a zip code is answered by rates_by_city or rates_by_zip, which return that place's M&IE total together with its breakdown. Example: mie_breakdown({ year: 2026, total: 86 }). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "gsa-perdiem": {
      "url": "https://gateway.pipeworx.io/gsa-perdiem/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/gsa-perdiem/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 2006+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/rates_by_city \
  -H 'Content-Type: application/json' \
  -d '{}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/rates_by_city`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-gsa-perdiem` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/gsa-perdiem/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "gsa-perdiem": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-gsa-perdiem"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Gsa Perdiem data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
