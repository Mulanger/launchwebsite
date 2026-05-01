# Polywatch Website

Static React/Vite landing site for Polywatch, with production pages needed for Play Console review.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm start
```

Railway can deploy this repository with the included `railway.json`.

## Before publishing

- Replace launch/update links when the Google Play listing is live.
- Update `support@whaletracker.com` if the public support email changes.
- Review `Privacy Policy`, `Terms`, and `Delete Data` pages before submitting them in Play Console.
- Use the live `/privacy` URL as the app privacy policy URL in Play Console.
- Use the live `/delete-data` URL if Play asks for a data deletion URL.
