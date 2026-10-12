# Deploying Atlas

Atlas runs in two places from the same code:

1. **The website** on GitHub Pages. Opens on any laptop or phone. Your data stays in that browser.
2. **A Claude artifact** on claude.ai. Claude is built in, and your data syncs between your devices.

You can use either one, or both. They don't share data with each other: to move your progress
from one to the other, export a backup in one (Settings → Data → Export backup) and import it in
the other (Settings → Data → Import backup).

Each new version arrives as a pull request on GitHub. Merge it first, then follow the steps below.

---

## 1. The website (GitHub Pages)

### Once: turn Pages on

Your repository is public and Pages is already turned on, so you can skip this part. For
reference, these are the steps if you ever need them again:

1. Open your repository on GitHub.
2. Click **Settings**, then **Pages** in the left column.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

On a free GitHub account Pages only works for **public** repositories. If you ever make the
repository private, you can get GitHub Pro (free with the GitHub Student Developer Pack) or use
only the artifact.

### Every update

1. Merge the pull request on GitHub (**Merge pull request**, then **Confirm merge**).
2. Wait two or three minutes. GitHub builds the site by itself: the **Actions** tab shows a run
   called "Deploy to GitHub Pages". A green tick means it's live.
3. Open **https://sarthakmathpati.github.io/atlas/**. If you see the old version, reload the page.

The address also appears in **Settings → Pages** and at the end of each Actions run.

### Good to know

- Your progress lives in the browser you use (laptop and phone each keep their own). Export a
  backup now and then: Atlas reminds you in a gentle note.
- Clearing your browser's site data deletes your progress in that browser. A backup brings it
  back.
- To use Claude on the website, either copy prompts into a claude.ai chat (works with no setup)
  or add your own API key (section 3).

---

## 2. The Claude artifact (Claude built in, synced data)

### Get the file

1. Merge the pull request on GitHub.
2. In your repository, open the **release** folder and click **atlas-artifact.zip**.
3. Click the **download** button (the arrow at the top right of the file view).

### The first time: publish it

1. Open [claude.ai](https://claude.ai) and start a new chat.
2. Upload `atlas-artifact.zip` and send this message:

   > Unzip this file and publish the index.html inside it as an artifact named Atlas, with the
   > capabilities sample, db, user and downloads. Use the favicon 🧭.

3. Open the artifact Claude publishes. Keep its link (bookmark it): you need it for updates.
4. The first time Atlas asks Claude something, claude.ai asks you to allow it. Answers come from
   your own Claude plan.

### Every update (important: keep your data)

Your synced data belongs to that one artifact. **Update the same artifact; don't publish a new
one**, or you start with an empty Atlas.

1. In your current Atlas, go to **Settings → Data → Export backup** and keep the file. (Updating
   keeps your data, but a backup costs nothing.)
2. Download the new `atlas-artifact.zip` as above.
3. In claude.ai, start a chat, upload the zip and send:

   > Unzip this file and update my existing Atlas artifact at `<your artifact link>` with the
   > index.html inside it, keeping the same capabilities and favicon.

4. Open your artifact link again. Everything you did before is still there.

If something ever looks wrong after an update, import the backup from step 1 in
**Settings → Data**.

---

## 3. Optional: your own API key (website only)

The website can call Claude directly with your own API key instead of copying prompts.

1. Create a key at [console.anthropic.com](https://console.anthropic.com) (API usage is billed
   separately from your Claude subscription).
2. In Atlas on the website, open **Settings → Claude**, choose **Your API key**, paste the key and
   click **Test connection**.

The key is saved only in that browser. It is never exported in backups, never synced and never
sent anywhere except to Anthropic. The artifact doesn't need a key: it uses Claude from your plan.

---

## 4. Running it on your own computer

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually `http://localhost:5173`). Every command is listed in
[README.md](README.md).

To build the artifact zip yourself: `npm run release:artifact` writes `release/atlas-artifact.zip`.
