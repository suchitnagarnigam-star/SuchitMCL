# 🏛️ Suchit Nagar Nigam (ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ)

Media Intelligence and Dispatch System built for the **Municipal Corporation Ludhiana (MCL), Punjab**. 

This system ingests scanned PDF packets uploaded daily by the Public Relations Officer (PRO), extracts news items page-by-page via OCR, parses/segments articles using AI, groups them by department, recommends officer assignments, and enables the Corporation Commissioner to review and dispatch items with auto-generated WhatsApp notifications.

Identical styling and design language has been kept to match **"Suchit Prashasan AI"** (DC Office Ludhiana).

---

## 📂 Project Structure

```
Suchit- Nagar Nigam/
├── README.md
├── .env.example
├── supabase/
│   ├── migrations/
│   │   └── 20260630000000_init.sql      # Supabase Schema Migration (all 5 tables)
│   └── seed.sql                         # Supabase Seeding Script (officers + domain mappings)
├── backend/
│   ├── requirements.txt                 # Backend Python package requirements
│   ├── config.py                        # Pydantic Settings & Gemini Key rotation
│   ├── database.py                      # Supabase DB operations and mock fallback database
│   ├── pipeline.py                      # PDF processing workflow (Mistral OCR + Gemini segmentation)
│   └── main.py                          # FastAPI application and endpoints
└── frontend/
    ├── package.json                     # Frontend Node package configurations
    ├── tailwind.config.js               # Tailwind custom color configuration (Saffron & Slate)
    ├── postcss.config.js                # PostCSS parser configuration
    ├── next.config.js                   # Next.js settings
    └── src/
        ├── app/
        │   ├── layout.tsx               # Next.js Root Layout (SEO metadata included)
        │   ├── page.tsx                 # Main dashboard view coordinator
        │   └── globals.css              # Saffron scrollbars and base CSS
        └── components/
            ├── sidebar.tsx              # Sidebar navigation (bottom-bar on mobile)
            ├── desk-tab.tsx             # Commissioner's Desk (collapsible depts & cards)
            ├── dispatched-tab.tsx       # Dispatched Items registry (CSV exporter + previews)
            ├── upload-tab.tsx           # Drag-and-drop zone with progress terminal
            ├── directory-tab.tsx        # CRUD directory & default mappings table
            └── dispatch-modal.tsx       # 4-Step dispatch wizard with WhatsApp generator
```

---

## ⚡ Supabase Setup (Database & Storage)

1. **Create Database Tables**:
   - Open your project on the [Supabase Console](https://supabase.com).
   - Navigate to the **SQL Editor**.
   - Copy the contents of [`supabase/migrations/20260630000000_init.sql`](file:///supabase/migrations/20260630000000_init.sql) and execute the query to build all 5 tables (`mcl_pdf_uploads`, `mcl_news_items`, `mcl_officers`, `mcl_domain_mapping`, and `mcl_dispatches`).

2. **Seed Baseline Data**:
   - In the **SQL Editor**, execute the contents of [`supabase/seed.sql`](file:///supabase/seed.sql) to populate the 10 core officers and standard suggested mappings.

3. **Storage Bucket**:
   - Navigate to the **Storage** tab on Supabase.
   - Click **New Bucket**.
   - Create a bucket named `mcl-pdfs` and make sure it is public (or configure read permissions if private access is preferred).

---

## ⚙️ Backend Setup (FastAPI)

1. **Move into Backend & Create Environment Configuration**:
   - Copy `.env.example` to `backend/.env` (or project root depending on environment setup).
   - Configure credentials:
     ```env
     MISTRAL_API_KEY=your_mistral_key_here
     GEMINI_API_KEY_1=your_first_gemini_key
     GEMINI_API_KEY_2=your_second_gemini_key_optional
     GEMINI_API_KEY_3=your_third_gemini_key_optional
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_SERVICE_KEY=your-supabase-service-role-key
     ```
     *(Note: If Supabase url/key is left blank, the backend will auto-initialize in **Development Mock Mode** using in-memory databases).*

2. **Install requirements**:
   - Recommended: Pyenv or Virtual Environment:
     ```bash
     python -m venv venv
     # Windows:
     .\venv\Scripts\activate
     # Mac/Linux:
     source venv/bin/activate
     
     pip install -r backend/requirements.txt
     ```

3. **Run Backend Server**:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   Access the interactive documentation API playground at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 💻 Frontend Setup (Next.js)

1. **Configure Environment Variables**:
   - Create a file `frontend/.env.local` containing:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:8000
     ```

2. **Install Node Packages**:
   ```bash
   cd frontend
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) on your browser to view the application dashboard.

---

## 🚀 Cloud Deployment Instructions

### 1. Supabase (Database)
- Production Postgres database runs on Supabase. Apply migrations and seed data directly on your project instance.

### 2. Backend Hosting (Render)
- Deploy your FastAPI repository to **Render** as a **Web Service**.
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**: Add all parameters from `.env.example` into Render's dashboard environment block.

### 3. Frontend Hosting (Vercel)
- Deploy the Next.js app to **Vercel**.
- Set **Framework Preset** to `Next.js`.
- Set **Root Directory** to `frontend`.
- Set **Environment Variables**:
  - `NEXT_PUBLIC_API_URL` → Address of your Render backend URL (e.g. `https://suchit-nigam-backend.onrender.com`).
