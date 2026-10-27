# Handoff notes

Isaac works on this site from two Claude Code sessions: one on his Windows
desktop ("local") and one in the cloud. They can't message each other, so
they pass work through these two files, committed to `main`:

- **`to-cloud.md`**: written by the local session for the cloud session.
- **`to-local.md`**: written by the cloud session for the local session.

## The routine

1. **Starting work:** pull `main`, then read the other side's file.
2. **Finishing work:** rewrite your own file. Say what changed, which commits,
   what is tested, what is waiting on Isaac, and what the other side should
   do next. Replace the old note; git history keeps the old ones.
3. **Commit the note with the work.** It goes live only when Isaac says
   "push", like everything else.

## Ground rules for both sessions

- **Push only when Isaac says "push" or "go".** A push to `main` publishes
  `public/` to https://leetennisco.com within about a minute.
- **The repository is public.** Never put keys, passwords or private details
  in these notes or anywhere else in the repo.
- **Don't invent facts** about Isaac, his lessons or his prices. Every fact
  must already be on the page or come from Isaac.
- **Never complete a real booking or enter payment details** on Cal.com.
- **Isaac types secrets himself** (`wrangler secret put ...`).
- `handoff/` sits outside `public/`, so these notes never appear on the site.
