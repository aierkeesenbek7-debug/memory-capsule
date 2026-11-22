<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Capsule sealing is enforced by database row-level security using the database clock (`open_at <= now()`): story/music (`capsule_contents`), media rows and media files are unreadable before opening. Never rely on client-side date checks for the lock — the UI countdown is display only.
- Capsule access = owner, or (shared capsules) an invited email in `capsule_participants` matching the signed-in user's email, via security-definer helpers (`is_capsule_member`, `can_upload_to_capsule`). Reuse these helpers in new policies instead of duplicating the logic.
- Storage paths are `{capsule_id}/cover/...` (visible to members anytime) and `{capsule_id}/media/...` (visible only after opening); storage policies parse these folders, so keep the layout.
- `open_at` is immutable after insert (trigger); app reads/writes go through the browser client with RLS and TanStack Query — no server functions are needed for capsule CRUD.
- Visual tokens (orb hues, glass surfaces, animations) live in `src/styles.css`; orbs pick their color through the `data-hue` attribute on `.orb`.
