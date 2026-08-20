# Raw audio drop zone (TICKET-05)

Freesound requires a logged-in account to download, so an agent cannot fetch these —
**the operator downloads the WAVs and drops them here.** Everything in this folder is
gitignored staging material, exactly like `public/logopaignio/_raw/`. Only the converted
MP3s one level up in `public/sounds/` ship.

Drop the files under any name; the conversions the operator asked for on 2026-08-17 are:

| Source | Becomes | Cut |
|---|---|---|
| [BenjaminNelan 435506](https://freesound.org/people/BenjaminNelan/sounds/435506/) — CC0 | `pangram.mp3` | from **00:00.445**, capped at 1.5 s |
| [Sadiquecat 777708](https://freesound.org/people/Sadiquecat/sounds/777708/) — CC0 | `missing-center.mp3` | around the **3 s** mark, capped at 1.5 s |

Conversion (ffmpeg is installed on the dev machine):

```
ffmpeg -i in.wav -ac 1 -b:a 64k -ss 0.445 -t 1.5 pangram.mp3
```

Both must land mono, MP3, ≤ 30 KB. `wordFound` has no file — it is synthesized.
