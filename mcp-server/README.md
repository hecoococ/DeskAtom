# DeskAtom MCP Server

Local stdio MCP server for managing DeskAtom tasks, groups, batch operations, statistics, and AI task splitting.

## Quick Start

Use it directly from npm with `npx`:

```json
{
  "mcpServers": {
    "deskatom": {
      "command": "npx",
      "args": ["-y", "deskatom-mcp-server@latest"]
    }
  }
}
```

On Windows, if your MCP client cannot find `npx`, use the `cmd` wrapper:

```json
{
  "mcpServers": {
    "deskatom": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "deskatom-mcp-server@latest"]
    }
  }
}
```

## GitHub Release Zip

If you install from the GitHub release zip instead:

```bash
npm install --omit=dev
node mcpServer.js
```

Then configure your MCP client to run the absolute path to `mcpServer.js`.

## Publish

From the DeskAtom repository root:

```bash
pnpm mcp:check
pnpm mcp:publish:dry-run
npm login
pnpm mcp:publish
pnpm mcp:zip
```

## Data Location

By default, DeskAtom data is stored locally:

```text
Windows: %APPDATA%\DeskAtom
macOS/Linux: ~/.deskatom
```

Files used by the server:

- `tasks.json`
- `ai-settings.json`

Set `DESKATOM_DATA_DIR` in the MCP client environment to use a custom data folder.

## Tools

- `deskatom_list_tasks`
- `deskatom_add_task`
- `deskatom_add_tasks`
- `deskatom_update_task`
- `deskatom_update_tasks`
- `deskatom_set_tasks_completed`
- `deskatom_set_tasks_groups`
- `deskatom_add_tasks_to_groups`
- `deskatom_remove_tasks_from_groups`
- `deskatom_toggle_task`
- `deskatom_toggle_tasks`
- `deskatom_delete_task`
- `deskatom_delete_tasks`
- `deskatom_clear_tasks`
- `deskatom_reorder_task`
- `deskatom_list_groups`
- `deskatom_create_group`
- `deskatom_create_groups`
- `deskatom_update_group`
- `deskatom_update_groups`
- `deskatom_delete_group`
- `deskatom_delete_groups`
- `deskatom_reorder_group`
- `deskatom_get_task_stats`
- `deskatom_ai_split_text`
- `deskatom_apply_split_tasks`
