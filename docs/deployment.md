# PHOS Deployment

## Docker Deployment (Recommended)

### Standard Usage (Folder Mount)

The best way to run PHOS is by mounting a data directory. This allows you to view and "edit" (via export) your local datasets.

```bash
docker run -p 8080:80 \
  -v /path/to/your/data:/usr/share/nginx/html/data \
  ghcr.io/jordanauge/phos:latest
```

This makes all files in your data directory accessible to the application. PHOS will automatically:
1. Detect `json` or `csv` files in the mounted directory.
2. Load the first one found (or use `DATA_FILE` env var to specify).
3. Look for a corresponding `.spec.json` (e.g., `data.spec.json` for `data.json`) and load it.

### Environment Variables

- `DATA_FILE`: Specify which file within the mounted `/usr/share/nginx/html/data` folder to load (e.g., `metrics.json`). Usage: `-e DATA_FILE=metrics.json`.
- `DATA_URL`: (Legacy/Remote) Full URL to load data from (e.g., `https://example.com/data.json` or `data/file.json` relative to web root).
- `READ_ONLY`: Set to `false` to disable the "Read-only" badge (default: `true` in Docker).

### Saving Changes

Since the container runs in a browser and cannot write directly to your disk:
1. Click the **☰ Menu** in the toolbar.
2. Select **💾 Save Project (Data + Spec)**.
3. This will download two files: `<dataset>.json` and `<dataset>.spec.json`.
4. Overwrite your local files with these downloads to persist your changes.

## Static Hosting

PHOS is a static Single Page Application (SPA). To host it:
1. Run `npm run build`.
2. Copy the `dist/` folder to your web server (Nginx, Apache, S3).
3. Place your data files in a specific folder (e.g. `dist/data/`).
4. Create or generate a `settings.json` in the root pointing to your data.
