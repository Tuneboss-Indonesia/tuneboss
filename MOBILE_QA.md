# TuneBoss Mobile QA Checklist

Use this checklist on a physical Android device first. Repeat on iOS if an iOS build is planned.

## Setup
- Confirm backend is reachable from the phone using the LAN API URL, not `localhost`.
- Set `EXPO_PUBLIC_API_URL` to the backend URL before starting Expo.
- Login with an admin account and keep the app open for at least one token refresh interval when practical.

## Secure Auth Storage
- Login successfully and close the app completely.
- Reopen the app and confirm it lands inside the dashboard without showing the login form.
- Tap `Keluar`, close the app, reopen it, and confirm the login form is shown.
- Disable network after login, reopen the app, and confirm stored auth does not crash the app.

## Camera Barcode Scan
- Open `Scan Barcode` and choose `Kamera HP`.
- Grant camera permission when prompted.
- Scan an existing product barcode and confirm product details appear.
- Scan an unknown barcode and confirm the `Tambah Barang Baru` flow is offered.
- Deny camera permission and confirm the app shows the permission prompt without crashing.

## Native Report Export
- Open each report detail page: stock, sales, inbound, outbound.
- Apply at least one date/filter option.
- Tap `Export PDF` and confirm the native share sheet opens with a `.pdf` file.
- Tap `Export CSV` and confirm the native share sheet opens with a `.csv` file.
- Tap export repeatedly and confirm only one export runs at a time.

## Product Image Upload
- Open `Data Barang`.
- Tap `Upload Gambar` for an existing product.
- Grant gallery permission when prompted.
- Pick an image, upload it, and confirm the product refreshes with image status `Ada`.
- Deny gallery permission and confirm a clear permission message is shown.

## Regression Checks
- Dashboard loads after login.
- Product list search/filter still works.
- Stock inbound/outbound modal still preselects product when launched from scanner.
- Report web export still downloads named files like `laporan-stok.pdf`.
