# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Setup
- Install dependencies:
  - `npm install`
- Ensure MongoDB is running locally (the app connects to `mongodb://127.0.0.1:27017/agriDirect`).
- Create a `.env` file in the project root with a valid Gemini API key:
  - `GEMINI_API_KEY=your_key_here`

### Run backend API (Express + MongoDB)
- Start backend once (Express server on port 5000):
  - `npm start`
  - or equivalently: `node server.js`
- Run backend with auto-reload during development:
  - `npm run dev`

### Run frontend server (static HTML/JS)
- Start the frontend/static server (Express on port 3000):
  - `node app.js`
- Typical local dev flow is to run **both** servers in separate terminals:
  - Terminal 1 (API + DB): `npm run dev`
  - Terminal 2 (frontend): `node app.js`

### Tests and linting
- There are currently **no test or lint scripts** defined in `package.json`.
- To add tests or linting, you will need to introduce the appropriate dev dependencies and `scripts` entries before using commands like `npm test` or `npm run lint`.

## Architecture overview

### Runtime topology
- This project uses **two Express servers**:
  - `server.js` – backend REST API and business logic (port 5000).
  - `app.js` – serves static HTML/CSS/JS for the role-specific UIs (port 3000) from the `public/` directory.
- The frontend pages talk to the backend via HTTP calls to `http://localhost:5000/...` endpoints.

### Backend (`server.js`)
`server.js` is a monolithic Express app that contains database models, middleware, and route handlers in a single file.

Key responsibilities:
- **Configuration & middleware**
  - Loads environment variables via `dotenv` (expects `GEMINI_API_KEY`).
  - Sets up JSON and URL-encoded parsers with `express.json()` / `express.urlencoded()`.
  - Enables CORS via `cors()`.
  - Serves static files from upload directories:
    - `/uploads` → files in `uploads/` (certificates, images, etc.).
    - `/uploads/qrs` → generated QR code images in `uploads/qrs/`.

- **Database connection**
  - Connects to MongoDB via Mongoose using the fixed URI `mongodb://127.0.0.1:27017/agriDirect`.

- **Mongoose models**
  - `Farmer` – farmer profile with certificate and QR code references.
  - `Consumer` – end-consumer accounts.
  - `Product` – core farm product entity, linked to a `Farmer`, with:
    - quality metrics (moisture, protein, pesticideResidue, soilPh),
    - pricing, quantity, location, category,
    - lab report and image paths,
    - `preferences` array for filtering,
    - `qrPath` for the generated QR code.
  - `Distributor` – intermediary buyer/reseller accounts.
  - `DistributorStock` – stocks held by distributors.
  - `DistributorRequest` – requests from farmers to distributors around specific products.
  - `Retailer` – downstream retailer accounts.
  - `DistributorOrder` – orders between distributors and retailers.
  - `Order` – farmer-facing orders placed via distributors.
  - `MarketplaceProduct` – detailed marketplace listing for products offered by distributors (supports grains, fruits, vegetables with many attribute fields).
  - `RetailerOrder` – orders placed by retailers for marketplace products.

- **File uploads & QR codes**
  - Uses `multer` with `diskStorage` to save uploads under `uploads/`.
  - Uses `QRCode` to generate product-specific QR codes into `uploads/qrs/`.
  - Exposes routes to fetch QR metadata and an HTML certificate view for a product.

- **Major route groups**
  (These are all defined directly on the `app` instance in `server.js`; when adding new endpoints, follow the existing grouping by actor.)

  - **Farmer routes**
    - Registration and login (`/farmer/register`, `/farmer/login`).
    - Product creation with lab reports and QR generation (`/farmer/addProduct/:farmerId`).
    - Product management: list, update, delete (`/farmer/getProducts/:farmerId`, `/farmer/updateProduct/:id`, `/farmer/deleteProduct/:id`).
    - QR- and product-centric views:
      - Get farmer QR image path (`/farmer/:id/qr`).
      - Get product QR info (`/product/:id/qr`).
      - HTML certificate view with farmer and lab info (`/product/:id/view`).
    - Category lookup for a farmer’s products (`/farmer/getProductType`).

  - **Consumer routes**
    - Registration and login (`/consumer/register`, `/consumer/login`).
    - Email existence check used by the frontend (`/consumer/check-email`).

  - **Distributor routes**
    - Registration and login (`/distributor/register`, `/distributor/login`).
    - Stock CRUD and listing (`/distributor/addStock/:id`, `/distributor/stock/:id`, `/distributor/updateStock/:stockId`).
    - Orders placed to distributors by retailers (`/distributor/placeOrder`).
    - Viewing orders from distributors to farmers (`/distributor/ordersToFarmer/:distributorId`).
    - Marketplace product management:
      - Add new marketplace product with rich metadata and image upload (`/distributor/addMarketplaceProduct`).
      - Check if marketplace entry already exists for a distributor/product pair (`/distributor/checkMarketplace`).
      - Fetch all marketplace products (`/marketplace/all`).
    - Distributor discovery (`/distributors`).
    - Relationship flow with farmers via `DistributorRequest`:
      - Farmers send requests (`/distributor/newRequest`).
      - Distributors list pending requests (`/distributor/getRequests/:id`).
      - Accept/reject requests (`/distributor/acceptRequest/:id`, `/distributor/rejectRequest/:id`).

  - **Retailer routes**
    - Registration and login (`/retailer/register`, `/retailer/login`).
    - Retailer orders via `RetailerOrder` (see schema and associated routes handling QR/COD and address information).

  - **Orders between distributors and farmers**
    - Full checkout from distributor to farmer (`/orders`) validating distributor, product, and farmer; calculates totals and stores an `Order` document.
    - Order deletion endpoint for `Order` records (`/distributor/deleteStock/:orderId`).

  - **AI assistant route**
    - `/api/ai/chat` – integrates with Google’s Gemini via `@google/generative-ai`:
      - Accepts text `query` and optional image upload.
      - Builds a prompt (image-only or text+image) and calls a Gemini model.
      - Optionally translates the reply to Hindi when `translate=hindi`.
      - Saves temporary uploaded images under `uploads/chat_images/`.

### Frontend server and static assets

- **`app.js`**
  - Lightweight Express server whose sole purpose is to serve static HTML pages from `public/` and provide role-specific entry points.
  - Uses ES modules and fixes `__dirname` via `fileURLToPath` / `dirname`.
  - Mounts `public/` as a static directory.
  - Key routes:
    - `/` → `public/shared_homepage.html` (shared landing page).
    - `/farmer/signup` → `public/farmer_signup18.html`.
    - `/farmer/login` → `public/farmer_login19.html`.
    - `/consumer/signup` → `public/consumer_signup18.html`.
    - `/consumer/login` → `public/consumer_login18.html`.

- **`public/` directory**
  - Contains HTML/CSS/JS used by `app.js`.
  - Example script:
    - `public/script.js` – simple category-based product list UI for fruits/vegetables/crops; manipulates the DOM within the static pages.
  - Additional HTML templates live here for different user roles and flows; they rely on the backend API for data and authentication.

## Environment & configuration notes

- **ES modules**
  - The project uses ES modules (`"type": "module"` in `package.json`). Use `import`/`export` syntax and be careful when introducing CommonJS code.

- **Configuration surface**
  - MongoDB URI is currently hard-coded; to support other environments, consider externalizing this to an environment variable in future changes.
  - `GEMINI_API_KEY` must be present for `/api/ai/chat` to work; the backend logs whether it is loaded on startup.

- **Uploads and static paths**
  - Uploaded files are stored under `uploads/`, `uploads/qrs/`, and `uploads/chat_images/`.
  - When returning paths in API responses, the code generally uses `/uploads/...` style URLs; ensure new code follows the same convention so the existing static mounts continue to work.

## Notes for future Warp agents

- When adding or refactoring endpoints, keep the current grouping by actor (farmer, consumer, distributor, retailer, marketplace, AI) inside `server.js` to maintain readability.
- Preserve existing response shapes (`{ status: "success" | "error", ... }` vs `{ success: true|false, ... }`) where they are already used by the frontend; several routes rely on specific conventions.
- For new features, consider factoring out schemas and route groups into separate modules once the file grows further; but any such refactor should maintain the current API surface so as not to break the existing frontend HTML/JS.