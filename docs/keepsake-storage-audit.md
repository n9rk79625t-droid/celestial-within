# Keepsake storage audit

The two books read existing saved records. No migration, deletion or copy into a second archive is needed.

| Source | Storage | Book |
|---|---|---|
| Daily entries (including saved sky/natal prompts) | `cw-calendar` | My Celestial Journal |
| Saved Moon entries | `cw-moon-entries` | My Celestial Journal |
| Saved Tarot entries | `cw-tarot-entries` (new history) | My Celestial Journal |
| Celebrations | `cw-observances` | My Book of Shadows |
| Spells and rituals | `cw-recipes` | My Book of Shadows |
| Existing Moon traditions | `cw-archive-moon` | My Book of Shadows |
| Older seasonal traditions | `cw-archive-wheel` | My Book of Shadows |

Moon and Tarot draft keys stay unchanged. Drafts are excluded from printed books until explicitly saved. Tarot previously had only a single autosaved draft; Save Tarot Entry now creates dated history, and editing replaces that record. Start New Entry saves the current draft first. Opening another record preserves the current draft first. The existing Moon workflow is retained.

The Daily archive gathers all three journal sources and routes edits to their source pages. Books rebuild on opening, refresh and printing. The journal sorts by local entry date; the grimoire groups celebrations, spells, rituals and traditions. A malformed source blocks assembly and printing rather than silently leaving entries out. Personalized covers retain the saved profile name. Print styles use US Letter, light covers and content-only output.

Current limitations: data is device/browser-local; no account sync or backup is added. Historical celebration dates retain their original locale-formatted strings. Moon practice notes remain part of their Moon reflection; reusable practices can be saved separately as a ritual or tradition. Date-range printing and a contents page remain future work.

Book of Shadows now offers a direct whole-book PDF generated on the device, with a light cover, four chapter pages and paginated saved entries. Every PDF page is US Letter (612 by 792 points). Pages are rasterized at 144 dpi to preserve on-device fonts and Unicode; text is not selectable. No browser headers, footers or website addresses are added. Only saved records are included. Export reads but never changes stored entries. Automated pagination tests and rendered synthetic PDF review pass; an actual iPhone Save to Files/AirPrint check is still recommended.

Validation: `node --test tests/keepsake-books.test.cjs tests/moon-temple.test.cjs tests/natal-layout.test.cjs tests/sky-layout.test.cjs`.
