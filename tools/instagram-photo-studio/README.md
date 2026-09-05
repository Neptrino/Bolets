# Bolets Photo Studio

Available online at **`/admin/publicacio/fotos`**, linked from the publishing page. The page and its asset routes require the existing server-verified administrator session. The online version uses the same HTML, scripts, fonts and renderer as the local tool; the frame only reports its height to the admin shell. Photos remain in the browser and downloads remain manual. No photo upload, database write or social publishing endpoint is added. Online responses are private/no-store and excluded from indexing. The explicit file allowlist is in `src/lib/instagram-photo-studio-assets.ts`; its statically scoped loaders include the required runtime files in standalone builds.

Double-click `Bolets Photo Studio.command` in the project folder on macOS, or run:

```sh
node scripts/instagram-photo-studio.mjs
```

Requires Node.js 24 or newer. No dependency installation, production server, account or credentials are needed. The app listens only on `http://127.0.0.1:3127`. Keep its Terminal window open; Ctrl+C stops it. Use `--port=3128` if that port is occupied, or `--no-open` to avoid opening a browser automatically.

1. Edit the photo in Lightroom Classic and export an **sRGB JPEG** with enough resolution for the target frame. RAW/TIFF editing stays in Lightroom.
2. Drop the photo into the editor. Choose Post (1080 × 1350) or Story (1080 × 1920).
3. Drag to reposition; use zoom and position sliders for precise or keyboard adjustments.
4. Start with **Fotografia**: no text panel and a discreet wordmark. Choose **Sense marca** for an unbranded image, **Discreta** for the wordmark alone, **Logo + text** for the small mushroom icon and wordmark without a panel, or **Segell** for the original badge. **Titular** adds only a short headline; **Peu de camp** adds the label, headline and observation. Both text layouts support top/bottom placement and cream/forest panels. Text is retained when switching presets but only visible fields are exported. Photo credits stay visible in every preset; photo mode uses a compact credit label. Choose a light or dark signature to contrast with the photograph.
5. Save the finished JPEG, or export a **transparent PNG containing only the enabled overlays**. For Lightroom Classic, use the same aspect ratio, Graphic watermark, Fit, centred anchor and zero insets. Review placement in its export preview.

Photos remain in browser memory and never reach the local HTTP server. Caption/design preferences are stored only in this browser; photos and crop positions are not persisted. Exporting through Canvas creates a fresh image without copying the input's EXIF/GPS metadata. Files are downloaded through the browser, and publishing is manual. An uploaded photo is never labelled as a current sighting automatically. This is a personal-photo editor, separate from generic catalogue draft templates and signed condition-map publishing.

The renderer consumes the shared palette, type sizes and format margins from `src/lib/instagram-design.ts`, bundled Nunito Sans fonts and the existing Bolets icon. It uses the site's existing UI type-scale tokens. Long text is wrapped; export is blocked if it cannot fit without truncation.

The v2 editor preserves text from v1 preferences but starts with the new photo composition instead of restoring the old full footer. New composition preferences persist locally. With no branding, visible text or credit, transparent-layer export is disabled.
