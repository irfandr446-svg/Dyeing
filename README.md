# Style Textile — Process & Machine R&D
### Textile Dyeing Process Profile Manager

A focused engineering tool for creating, editing, organizing and visualizing
textile dyeing **Treatments** (process profiles) and **Programs** (ordered
sequences of Treatments), scoped to one or more **Plants**.

This is intentionally *not* an ERP, recipe/costing system, or multi-user
platform — it's a single-engineer tool for building and printing process
profiles.

## Stack
- React 19 + TypeScript + Vite
- Firebase Firestore (data storage only — no Auth)
- Custom hand-built SVG renderer for the process profile (no charting library)
- jsPDF for A4-landscape PDF export

## Local setup

```bash
npm install
cp .env.example .env   # then fill in your Firebase project's web config
npm run dev
```

The app works without Firebase configured too — it will run entirely on the
built-in default Plants/Categories/Features, but Treatments/Programs won't
persist between reloads until a Firebase project is connected.

### Firebase project
1. Create a Firebase project → add a Web App → copy the config values into `.env`.
2. Enable **Firestore** (Native mode).
3. **Check your database ID.** Projects auto-provisioned by AI Studio / Gemini
   often get a Firestore database with a *custom* ID rather than `(default)`.
   Open Firebase Console → Firestore Database and look at the database picker
   / breadcrumb — if it shows something like
   `ai-studio-yourproject-xxxxxxxx-xxxx-...` instead of the word "default",
   copy that into `VITE_FIREBASE_FIRESTORE_DATABASE_ID` in your `.env`.
   **This is the #1 cause of "nothing saves to Firestore"** — the app looks
   like it works (it falls back to local defaults) but every read/write
   silently fails against a database that doesn't exist. The in-app Settings
   page and the header will show a Firestore error banner if this happens.
4. Deploy `firestore.rules` (single-engineer app, no auth gate by default):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase init firestore   # point at this project, keep firestore.rules
   firebase deploy --only firestore:rules
   ```
   A brand-new Firestore database denies all access until rules are deployed
   — this is the #2 cause of silent save failures.

## Build & deploy

```bash
npm run build      # outputs static site to dist/
npm run preview    # sanity-check the production build locally
```

`dist/` is a static site — deploy it to Firebase Hosting, Vercel, Netlify,
GitHub Pages, or any static host. Example with Firebase Hosting:

```bash
firebase init hosting   # public directory: dist
firebase deploy --only hosting
```

## Structure

```
src/
  types.ts                  Domain model (Plant, Category, Feature, Treatment, Program)
  data/defaultData.ts        Default Plants / Categories / built-in Feature library
  context/AppContext.tsx     Firestore-backed CRUD + state
  context/UnsavedGuard.tsx   "You have unsaved changes" navigation guard
  utils/timeUtils.ts         Duration / gradient / total-time calculations
  utils/profileGeometry.ts   Pure geometry model shared by the SVG view and PDF export
  utils/pdfExport.ts         A4 landscape PDF generation (Treatment + Program)
  components/
    Header.tsx / Sidebar.tsx
    Profile/ProcessProfileSVG.tsx   The custom SVG process-profile renderer
    Treatments/                     List + Builder (feature library / steps / properties / profile)
    Programs/                       List + Builder (treatment library / sequence / combined preview)
    Features/ Categories/ Plants/ Settings/
```

## Notes on scope

To keep this a clean, maintainable single-engineer tool, a few advanced
interactions were implemented with simple, dependency-free controls rather
than heavyweight libraries:
- Step/treatment reordering uses ↑ / ↓ controls instead of a drag-and-drop library.
- Undo/redo in the Treatment Builder is a lightweight in-memory history stack (per editing session).

Both can be swapped for richer implementations (e.g. `dnd-kit`) without
touching the data model.
