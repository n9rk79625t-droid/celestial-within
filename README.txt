CELESTIAL WITHIN — PWA v4

FILES
- index.html: the app
- manifest.webmanifest: install metadata
- sw.js: offline cache/service worker
- icon-192.svg / icon-512.svg: app icons

TO TEST AS AN INSTALLABLE APP
PWA features (installation, service worker, location permission) need HTTPS or localhost.
Upload this entire folder to a static HTTPS host, keeping all files together.

ASTROLOGY
The app uses Astronomy Engine in the browser for planetary positions.
With location permission it calculates local ASC/MC and supports Whole Sign and Equal House cusps.
For production-grade Placidus/Koch/Regiomontanus/etc., use a validated dedicated house engine.

PDF BOOKS
Open Journal Book or Traditions Book and choose Print / Save as PDF.


V5 PERSONALIZATION
- Birth profile saved locally
- Natal snapshot using birth date/time/coordinates and manual historical UTC offset
- Personalized Moon/Sun transit-to-natal-house dashboard notes
- Dated journal calendar and month filtering
- Personalized exported journal covers

HOSTING
Upload the entire folder to an HTTPS static host. GitHub Pages and Netlify both work.
