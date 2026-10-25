# The Hollow

A single-page invitation and RSVP. One `index.html` with inline CSS and vanilla JavaScript, a looping film in `assets/`, and `og.jpg` for link previews. Hosted on GitHub Pages. RSVPs go to a Google Sheet through a Google Apps Script web app.

## Files

| File | What |
| --- | --- |
| `index.html` | The page. The `CONFIG` block at the top holds every date, name, string, threshold and endpoint. |
| `assets/hollow.mp4` | The opening film, 10 seconds, loops silently. Sound is on by default: the soundtrack plays once with the film straight away where the browser allows it, otherwise on the guest's first tap (most phones refuse sound before a tap) while the speaker icon pulses, fades out over the last 1.4 seconds and hands over to the background loop. |
| `assets/ambient.m4a` | A quiet, slowed and darkened loop made from the soundtrack's opening. Plays after the soundtrack until the guest mutes. |
| `assets/hollow-still.jpg` | A still from the film, shown when a phone refuses to autoplay (for example iPhone Low Power Mode) or the viewer prefers reduced motion. |
| `og.jpg` | 1200 × 630 link preview image. |
| `store/Code.gs` | The Apps Script for the Sheet. Paste-in, not deployed from here. |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. |

## One-time set-up

### 1. Publish the page (about three minutes)

1. On github.com, create a new **public** repository with this folder's name. No README, no licence.
2. On the empty repository page choose **uploading an existing file**, drag in everything in this folder (including the `assets` and `store` folders and the hidden `.nojekyll`), and commit to `main`.
3. **Settings → Pages → Build and deployment**: Source "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
4. After a minute the page is live at `https://<your-github-user>.github.io/<repository-name>/`.

Alternatively, create the empty repository and ask the assistant to push and open a pull request; step 3 stays manual.

### 2. Connect the Sheet (about five minutes)

1. Open the Sheet named **Shelley Hollow RSVP ledger 2026** in Google Drive (it was created for you with the header row in place). If you cannot find it, create any blank Google Sheet instead.
2. **Extensions → Apps Script**. Delete the sample code, paste the whole of `store/Code.gs`, save.
3. In the function dropdown choose `setup` and press **Run**. Google asks you to authorise the script for this Sheet; accept. This names the sheet `Ledger`, writes the headers and adds a `Totals` sheet.
4. **Deploy → New deployment**. Type: Web app. Description: anything. Execute as: **Me**. Who has access: **Anyone**. Deploy. Copy the web app URL (it ends in `/exec`).
5. Open the URL in a browser. You should see `{"households":0, ...}`.
6. In `index.html`, set `endpoint: ""` in the `CONFIG` block to that URL. Commit. The page picks it up on the next load.
7. Share the Sheet with your wife as editor (the Share button in the Sheet). Nobody else.

Until step 6 is done the page runs in preview mode: it says so under the counter, and answers stay in that browser only.

### 3. Test before sending

- Open the page on your phone. Send a test RSVP. Check the admission slip appears and the row lands in the Sheet.
- Send the link to yourself on WhatsApp and iMessage. The preview should show the image and the title. WhatsApp caches previews, so add `?v=2` to the link while testing.
- Delete the test rows from the Sheet (select the rows, right-click, delete rows). Reload the page.

Suggested message: "You are expected. Lord and Lady Wenzel, of Shelley Hollow, require your particulars by Thursday: [link]"

## Updating the Sheet script

The page sends an optional note with each RSVP. It lands in the `guest_notes` column; `host_notes` is free for you. After any change to `store/Code.gs`:

1. Open the Sheet, then Extensions → Apps Script. Select all of `Code.gs`, paste the new version, save.
2. Deploy → Manage deployments → the pencil icon → Version: **New version** → Deploy.

The web app address stays the same, so the page needs no change. Until step 2 is done, the live script ignores notes; everything else keeps working.

## Reset for next year

1. Edit the `CONFIG` block in `index.html`: dates, RSVP close date, the film line, anything that changed. The `<title>` and `og:` meta tags near the top are static copies; change them too.
2. In the Sheet, delete every row under the header on `Ledger`. The `Totals` sheet updates itself.
3. Commit. Done. The Apps Script deployment and its URL do not change.

## The three things most likely to break

1. **WhatsApp shows an old preview.** It caches by URL. Append a changing query string (`?v=3`) when testing. Guests who receive the final link see the current preview.
2. **The Apps Script deployment.** If the Sheet stops receiving rows after you edit the script, you need **Deploy → Manage deployments → Edit → Version: New version**. A plain save does not update the live web app. If "Who has access" is not "Anyone", guests get a Google sign-in page and the page shows "The Steward dropped the pen".
3. **The POST redirect.** Apps Script answers a POST with a redirect. The page sends plain text (no preflight) and follows it; if a browser refuses, it falls back to an opaque request and treats completion as success, then re-reads the totals a few seconds later. If a guest's confirmation shows but the row is missing, check the deployment access setting first.

## Privacy

The repository is public; the page shows the date and address, nothing else. The Sheet holds household names and counts, visible only to the two hosts. The page sets `noindex, nofollow`, loads nothing from third parties, and keeps no analytics. The aggregate endpoint returns counts only, never names.
