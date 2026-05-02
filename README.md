# Polywatch Website

React/Vite web app for Polywatch. The homepage is a read-only live whale feed and the legal pages are used for Play Console review.

## Local development

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` to the production API by default. To point it at another API:

```bash
$env:VITE_DEV_API_TARGET="http://127.0.0.1:3000"; npm run dev
```

## Production build

```bash
npm run build
npm start
```

Railway can deploy this repository with the included `railway.json`.
The production server also proxies `/api/*` to `https://whaleserver-production.up.railway.app` unless `API_BASE_URL` is set.

## Before publishing

- Replace launch/update links when the Google Play listing is live.
- Update `support@whaletracker.com` if the public support email changes.
- Review `Privacy Policy`, `Terms`, and `Delete Data` pages before submitting them in Play Console.
- Use the live `/privacy` URL as the app privacy policy URL in Play Console.
- Use the live `/delete-data` URL if Play asks for a data deletion URL.
