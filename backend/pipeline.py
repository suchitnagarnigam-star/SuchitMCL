import io
import json
import time
import traceback
import httpx
import re
import os
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from pypdf import PdfReader
from PIL import Image

# Import configurations and db
from backend.config import settings, get_all_gemini_keys, get_next_gemini_key
from backend.database import update_pdf_upload, create_news_item, get_domain_mappings, get_officers

# Try importing pdf2image for OCR conversion. We will fall back to pypdf if poppler is missing.
try:
    import pdf2image
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False


NO_READABLE_TEXT_PREFIX = "[No readable text extracted from Page"
MIN_EXTRACTED_TEXT_CHARS = 120


def get_poppler_path() -> Optional[str]:
    configured_path = os.getenv("POPPLER_PATH")
    if configured_path and (Path(configured_path) / "pdftoppm.exe").exists():
        return configured_path

    project_root = Path(__file__).resolve().parents[1]
    local_poppler_root = project_root / "tools" / "poppler"
    if local_poppler_root.exists():
        candidates = list(local_poppler_root.glob("**/pdftoppm.exe"))
        if candidates:
            return str(candidates[0].parent)

    return None


POPPLER_PATH = get_poppler_path()


def is_unreadable_page_text(text: str) -> bool:
    clean = text.strip()
    return not clean or clean.startswith(NO_READABLE_TEXT_PREFIX)


def get_real_ocr_text(extracted_texts: List[Tuple[int, str]]) -> str:
    return "\n\n".join(
        text.strip()
        for _, text in extracted_texts
        if not is_unreadable_page_text(text)
    )


def build_local_headline(paragraph: str, index: int) -> str:
    lines = [line.strip() for line in paragraph.splitlines() if line.strip()]
    candidate = lines[0] if lines else paragraph.strip()
    candidate = re.sub(r"\s+", " ", candidate)
    if len(candidate) > 120:
        candidate = candidate[:117].rstrip() + "..."
    return candidate or f"Extracted Article #{index + 1}"


def build_local_summary(paragraph: str, department: str) -> Dict[str, str]:
    clean = re.sub(r"\s+", " ", paragraph).strip()
    if len(clean) > 260:
        clean = clean[:257].rstrip() + "..."
    return {
        "when": "Not specified",
        "where": "Not specified",
        "what": f"Local extraction found text related to {department}. Excerpt: {clean}",
        "next_steps": f"Investigate issue related to {department}."
    }


def split_ocr_text_by_page(ocr_text: str) -> List[Tuple[int, str]]:
    matches = list(re.finditer(r"--- PAGE (\d+) ---\r?\n", ocr_text))
    if not matches:
        return [(1, ocr_text.strip())] if ocr_text.strip() else []

    pages: List[Tuple[int, str]] = []
    for idx, match in enumerate(matches):
        page_num = int(match.group(1))
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(ocr_text)
        page_text = ocr_text[start:end].strip()
        if page_text and not is_unreadable_page_text(page_text):
            pages.append((page_num, page_text))
    return pages


def call_mistral_ocr(img_bytes: bytes, filename: str) -> str:
    """
    Uploads an image to Mistral files API and runs OCR processing.
    Returns the extracted markdown text.
    """
    if not settings.MISTRAL_API_KEY:
        raise ValueError("MISTRAL_API_KEY not configured.")

    headers = {"Authorization": f"Bearer {settings.MISTRAL_API_KEY}"}

    # Step 1: Upload file to Mistral
    files = {
        "file": (filename, img_bytes, "image/jpeg"),
        "purpose": (None, "ocr")
    }

    print(f"Uploading page {filename} to Mistral OCR API...")
    with httpx.Client(timeout=60.0) as client:
        upload_resp = client.post(
            "https://api.mistral.ai/v1/files",
            headers=headers,
            files=files
        )
        if upload_resp.status_code != 200:
            raise Exception(f"Mistral File Upload failed ({upload_resp.status_code}): {upload_resp.text}")
        
        file_id = upload_resp.json().get("id")
        if not file_id:
            raise Exception(f"No file ID returned by Mistral upload: {upload_resp.text}")

        # Step 2: Call OCR processing
        print(f"Triggering OCR processing for file_id {file_id}...")
        ocr_payload = {
            "model": "mistral-ocr-latest",
            "document": {
                "type": "file",
                "file_id": file_id
            }
        }
        ocr_resp = client.post(
            "https://api.mistral.ai/v1/ocr",
            headers=headers,
            json=ocr_payload
        )
        if ocr_resp.status_code != 200:
            raise Exception(f"Mistral OCR processing failed ({ocr_resp.status_code}): {ocr_resp.text}")
        
        # Clean up the file on Mistral to respect privacy / storage limits
        try:
            client.delete(f"https://api.mistral.ai/v1/files/{file_id}", headers=headers)
        except Exception as delete_err:
            print(f"Failed to delete temporary Mistral file {file_id}: {delete_err}")

        # Extract markdown contents from all pages returned (should be 1 page since we upload page by page)
        ocr_data = ocr_resp.json()
        pages = ocr_data.get("pages", [])
        if not pages:
            return ""
        return "\n\n".join(page.get("markdown", "") for page in pages)


def call_gemini_with_rotation(prompt: str) -> str:
    """
    Calls Google Gemini 2.0 Flash REST API using Multi-Key rotation.
    If a key hits a 429 rate limit, it automatically tries the next key in round-robin.
    """
    keys = get_all_gemini_keys()
    if not keys:
        raise ValueError("No GEMINI_API_KEY configured. Please check your environment variables.")

    # Try each key in order of rotation
    last_error = None
    for attempt in range(len(keys) * 2):  # Try keys twice in case of transient glitches
        key = get_next_gemini_key()
        if not key:
            continue

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        try:
            print(f"Sending request to Gemini using rotated key (attempt {attempt + 1})...")
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(url, json=payload)
                
                # Check for rate limit
                if resp.status_code == 429:
                    print(f"Key rate limited (429). Rotating to next key.")
                    last_error = "Rate Limit (429)"
                    continue
                
                if resp.status_code != 200:
                    print(f"Gemini API returned status {resp.status_code}: {resp.text}")
                    last_error = f"HTTP {resp.status_code}: {resp.text}"
                    continue

                # Parse response
                result = resp.json()
                candidates = result.get("candidates", [])
                if candidates:
                    content = candidates[0].get("content", {})
                    parts = content.get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
                
                raise Exception(f"Invalid response structure from Gemini: {result}")
        except Exception as e:
            print(f"Error calling Gemini with key: {e}")
            last_error = str(e)
            # Pause briefly and rotate
            time.sleep(0.5)

    raise Exception(f"All Gemini keys exhausted. Last error: {last_error}")


def call_claude(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Calls Anthropic Claude API (Claude 3.5 Sonnet / 3.7 Sonnet) using settings.ANTHROPIC_API_KEY.
    Optionally accepts a system prompt to leverage Prompt Caching.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not configured.")

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json"
    }
    payload = {
        "model": "claude-sonnet-5",
        "max_tokens": 8000,
        "thinking": {
            "type": "disabled"
        },
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    if system_prompt:
        payload["system"] = [
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"}
            }
        ]

    last_error = None
    for attempt in range(3):
        try:
            print(f"Sending request to Claude (attempt {attempt + 1})...")
            with httpx.Client(timeout=180.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code != 200:
                    print(f"Claude API returned status {resp.status_code}: {resp.text}")
                    raise Exception(f"Claude API HTTP {resp.status_code}: {resp.text}")
                
                result = resp.json()
                content = result.get("content", [])
                text_parts = [part.get("text", "") for part in content if part.get("type") == "text"]
                if text_parts:
                    return "".join(text_parts)
                
                raise Exception(f"No text blocks found in Claude response: {result}")
        except Exception as e:
            print(f"Claude API attempt {attempt + 1} failed: {e}")
            last_error = e
            if attempt < 2:
                import time
                time.sleep(2 ** attempt)
                
    raise last_error



def extract_fallback_news(ocr_text: str) -> List[Dict[str, Any]]:
    """
    Local heuristic fallback that parses OCR text and extracts news if Gemini calls fail,
    without inventing articles when OCR did not return usable text.
    """
    articles = []
    if not ocr_text:
        return articles
    
    page_blocks = [
        (page_num, page_text)
        for page_num, page_text in split_ocr_text_by_page(ocr_text)
        if len(page_text.strip()) >= MIN_EXTRACTED_TEXT_CHARS
    ]
        
    keywords_dept = {
        "Operations & Maintenance (O&M)": ["sewage", "sewer", "drain", "waterlogging", "pipe", "water supply", "leakage"],
        "Bridges & Roads (B&R)": ["road", "pothole", "patchwork", "highway", "footpath", "bridge", "flyover", "carpeting"],
        "Town Planning (Building Branch)": ["demolition", "illegal building", "encroachment", "building branch", "mtp", "unauthorized construction"],
        "Tehbazari / Land & Encroachment": ["rehri", "vendor", "encroachment", "tehbazari", "squatter", "illegal occupation"],
        "Sanitation & Vector Control": ["mosquito", "fogging", "dengue", "malaria", "sanitation worker", "sweeper", "cleanliness"],
        "Solid Waste Management (SWM)": ["garbage", "dump", "waste", "refuse", "garbage collection", "garbage dump"],
        "Horticulture / Parks & Squares": ["park", "garden", "greenery", "tree", "pruning", "lawn"],
        "Health Branch": ["birth certificate", "death certificate", "dog bite", "stray dog", "animal", "slaughterhouse"],
        "Fire Brigade & Emergency Services": ["fire", "blaze", "emergency", "fire extinguisher", "fire safety", "fire tender"],
        "Legal Cell": ["court case", "high court", "legal notice", "contempt", "litigation"],
        "Public Grievance Redressal / IT Cell": ["online complaint", "portal", "website", "grievance", "mcl app"],
        "Establishment & General Branch": ["staff", "hr", "transfer", "promotion", "suspension", "employee"],
        "Accounts & Finance": ["budget", "audit", "funds", "salary", "expense", "tender award"],
        "Property Tax / House Tax Branch": ["property tax", "house tax", "tax collection", "defaulter", "tax seal"],
        "Licensing & Health License Branch": ["license", "shop license", "health license", "commercial permit"]
    }
    
    for idx, (page_num, p) in enumerate(page_blocks):
        # Determine department based on keyword matching
        matched_dept = "Public Grievance Redressal / IT Cell"
        p_lower = p.lower()
        
        for dept, keywords in keywords_dept.items():
            if any(k in p_lower for k in keywords):
                matched_dept = dept
                break
                
        # Severity
        severity = "Medium"
        if any(k in p_lower for k in ["death", "injury", "outbreak", "crash", "high court", "contempt"]):
            severity = "High"
        elif any(k in p_lower for k in ["appreciation", "routine", "survey"]):
            severity = "Low"
            
        headline = build_local_headline(p, idx)
        
        articles.append({
            "headline": headline,
            "body": p,
            "publication": "Extracted PDF Text",
            "department": matched_dept,
            "severity": severity,
            "summary": build_local_summary(p, matched_dept),
            "page_number": page_num
        })
        
    return articles


def is_page_relevant_to_municipal(text: str) -> bool:
    """
    Returns True if the page contains keywords suggesting municipal relevance in Ludhiana,
    supporting English, Punjabi (Gurmukhi), and Hindi scripts.
    """
    text_lower = text.lower()
    
    # Combined location & topic keywords to filter out non-municipal pages (sports, ads, etc.)
    municipal_keywords = [
        # Location / Authority
        "ludhiana", "mcl", "municipal", "nagar nigam", "commissioner", "mayor", "ward",
        "ਲੁਧਿਆਣਾ", "ਨਿਗਮ", "ਕਮਿਸ਼ਨਰ", "ਮੇਅਰ", "ਵਾਰਡ",
        "लुधियाना", "निगम", "कमिश्नर", "मेयर", "वार्ड",
        # O&M / Drainage
        "sewer", "sewage", "waterlogging", "drain", "water supply", "leakage", "buddha nullah", "buddha dariya",
        "ਸੀਵਰ", "ਸੀਵਰੇਜ", "ਪਾਣੀ", "ਨਿਕਾਸੀ", "ਬੁੱਢਾ ਨਾਲਾ",
        "सीवर", "सीवरेज", "पानी", "निकासी", "बुड्ढा नाला",
        # B&R / Roads
        "road", "pothole", "patchwork", "highway", "bridge", "flyover",
        "ਸੜਕ", "ਪੁਲ", "ਫਲਾਈਓਵਰ",
        "सड़क", "पुल", "फ्लाईओवर",
        # Encroachments / Tehbazari
        "encroachment", "tehbazari", "vendor", "rehri", "demolition",
        "ਕਬਜ਼ਾ", "ਰੇਹੜੀ", "ਤੋੜਫੋੜ",
        "कब्जा", "रेहड़ी", "तोड़फोड़",
        # Sanitation / Waste
        "garbage", "dump", "waste", "cleanliness", "mosquito", "dengue", "fogging",
        "ਕੂੜਾ", "ਡੰਪ", "ਸਫਾਈ", "ਮੱਛਰ", "ਡੇਂਗੂ",
        "कूड़ा", "डंप", "सफाई", "मच्छर", "डेंगू"
    ]
    
    return any(k in text_lower for k in municipal_keywords)


def merge_consecutive_articles(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merges articles that span across consecutive pages if they have highly similar headlines.
    """
    if len(articles) <= 1:
        return articles
        
    # Sort articles by page number
    articles.sort(key=lambda x: x.get("page_number", 1))
    
    merged = []
    current = articles[0]
    
    for next_art in articles[1:]:
        # Compare headlines (case insensitive, alphanumeric only)
        h1 = re.sub(r'\W+', '', current.get("headline", "").lower())
        h2 = re.sub(r'\W+', '', next_art.get("headline", "").lower())
        
        page_diff = next_art.get("page_number", 1) - current.get("page_number", 1)
        
        # If headlines are very similar and pages are adjacent/same
        is_similar = (h1 == h2 or (len(h1) > 10 and len(h2) > 10 and (h1 in h2 or h2 in h1)))
        
        if is_similar and page_diff <= 1:
            print(f"Merging article across pages: '{current.get('headline')}' on Page {current.get('page_number')} and Page {next_art.get('page_number')}")
            current["body"] = current.get("body", "") + "\n\n" + next_art.get("body", "")
            continue
        else:
            merged.append(current)
            current = next_art
            
    merged.append(current)
    return merged


def process_pdf_background(upload_id: str, file_bytes: bytes) -> None:
    """
    Background worker that runs the PDF ingestion pipeline:
    1. Page-by-page OCR extraction.
    2. Document text segmentation and classification using Gemini.
    3. Suggested officer mapping and database commits.
    """
    try:
        print(f"Starting background processing for upload_id: {upload_id}")
        update_pdf_upload(upload_id, {
            "processing_status": "ocr_processing",
            "current_step": "ocr_processing",
            "progress_log": "Reading PDF metadata..."
        })

        # Read PDF using PyPDF
        pdf_reader = PdfReader(io.BytesIO(file_bytes))
        total_pages = len(pdf_reader.pages)
        
        update_pdf_upload(upload_id, {
            "total_pages": total_pages,
            "progress_log": f"Found {total_pages} pages in PDF. Commencing page-by-page OCR..."
        })

        extracted_texts = []
        ocr_pages = 0
        fallback_pages = 0
        ocr_errors: List[str] = []

        # Step 1: OCR Page-by-Page
        for p_idx in range(total_pages):
            page_num = p_idx + 1
            print(f"Processing page {page_num}/{total_pages}...")
            
            page_text = ""
            converted_via_image = False
            
            # Try to convert page to JPEG image using pdf2image if available and poppler is installed
            if PDF2IMAGE_AVAILABLE:
                try:
                    # Convert only the current page to conserve memory
                    images = pdf2image.convert_from_bytes(
                        file_bytes,
                        first_page=page_num,
                        last_page=page_num,
                        dpi=150,
                        poppler_path=POPPLER_PATH
                    )
                    if images:
                        img = images[0]
                        # Resize to maximum width 1200px maintaining aspect ratio
                        if img.width > 1200:
                            ratio = 1200.0 / img.width
                            new_size = (1200, int(img.height * ratio))
                            # Handle different PIL versions resizing
                            img = img.resize(new_size, Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.LANCZOS)
                        
                        img_byte_arr = io.BytesIO()
                        img.save(img_byte_arr, format='JPEG', quality=70)
                        img_bytes = img_byte_arr.getvalue()
                        
                        # Call Mistral OCR API
                        if settings.MISTRAL_API_KEY:
                            page_text = call_mistral_ocr(img_bytes, f"page_{page_num}.jpg")
                            converted_via_image = True
                        else:
                            page_text = "" # Trigger pypdf text extraction fallback
                except Exception as img_err:
                    error_text = f"Page {page_num}: {img_err}"
                    ocr_errors.append(error_text)
                    print(f"pdf2image/Mistral OCR failed for page {page_num}: {img_err}")
                    update_pdf_upload(upload_id, {
                        "progress_log": f"OCR image/Mistral step failed on page {page_num}: {str(img_err)[:220]}"
                    })
                    page_text = ""
            
            # Fallback to PyPDF text extraction
            if not page_text:
                print(f"Using fallback text extraction for page {page_num}...")
                try:
                    page_text = pdf_reader.pages[p_idx].extract_text() or ""
                except Exception as pypdf_err:
                    print(f"PyPDF extraction failed: {pypdf_err}")
                    page_text = ""

            # Check if we still have absolutely no text
            if not page_text.strip():
                page_text = f"[No readable text extracted from Page {page_num}]"

            extracted_texts.append((page_num, page_text))
            
            # Update status log in DB
            method_desc = "OCR processed via Mistral" if converted_via_image else "Text extracted via fallback parser"
            if converted_via_image and not is_unreadable_page_text(page_text):
                ocr_pages += 1
            elif not is_unreadable_page_text(page_text):
                fallback_pages += 1
            update_pdf_upload(upload_id, {
                "progress_log": f"Page {page_num} of {total_pages} completed - {method_desc}."
            })

        real_ocr_text = get_real_ocr_text(extracted_texts)
        if len(real_ocr_text) < MIN_EXTRACTED_TEXT_CHARS:
            if not PDF2IMAGE_AVAILABLE:
                poppler_hint = "The pdf2image Python package is not installed."
            elif not POPPLER_PATH:
                poppler_hint = (
                    "Poppler was not found. Install Poppler, set POPPLER_PATH, "
                    "or keep the local tools/poppler folder in place."
                )
            elif not settings.MISTRAL_API_KEY:
                poppler_hint = "MISTRAL_API_KEY is not configured, so scanned PDF OCR cannot run."
            elif ocr_errors:
                poppler_hint = f"OCR conversion/API failed. Last OCR error: {ocr_errors[-1]}"
            else:
                poppler_hint = "Upload a text-searchable PDF or check the scanned PDF quality."
            raise ValueError(
                f"No usable article text was extracted from the PDF. {poppler_hint}"
            )

        # Step 2: Run Segmentation + Classification page-by-page
        llm_name = "Claude Sonnet 5" if settings.ANTHROPIC_API_KEY else "Gemini 2.0 Flash"
        update_pdf_upload(upload_id, {
            "processing_status": "analysing",
            "current_step": "analysing",
            "progress_log": (
                f"Extracted usable text from {ocr_pages + fallback_pages}/{total_pages} pages "
                f"({ocr_pages} OCR, {fallback_pages} text fallback). Running page-by-page analysis on {llm_name}..."
            )
        })

        news_items = []

        for p_num, text in extracted_texts:
            clean_text = text.strip()
            if not clean_text or clean_text.startswith(NO_READABLE_TEXT_PREFIX) or len(clean_text) < MIN_EXTRACTED_TEXT_CHARS:
                continue

            # Run local keyword pre-filtering to save tokens on irrelevant pages
            if not is_page_relevant_to_municipal(clean_text):
                print(f"Skipping Page {p_num}: No municipal keywords matched.")
                update_pdf_upload(upload_id, {
                    "progress_log": f"Page {p_num} skipped (irrelevant content/no keywords matched)."
                })
                continue

            update_pdf_upload(upload_id, {
                "progress_log": f"Analysing page {p_num} of {total_pages} using {llm_name}..."
            })

            system_prompt = f"""You are an expert municipal governance analyst for the Municipal Corporation Ludhiana (MCL) in Punjab, India. 
Your task is to analyze OCR-extracted text from daily newspaper cuttings uploaded by the Public Relations Officer (PRO).

The text contains newspaper clippings printed in English, Punjabi (Gurmukhi script), or Hindi. 
You must identify, segment, translate, and analyze distinct news articles that highlight active public grievances, structural emergencies, municipal failures, or urgent legal actions in Ludhiana.

---
### CRITICAL INSTRUCTIONS & GUIDELINES:

1. **Relevance & Actionability Filtering (CRITICAL)**:
   - **Do NOT extract routine, promotional, or unimportant news**. Skip general state-level policy announcements, generalized administrative updates, promotional articles, photo-ops, holiday greetings, standard tender invitations, or office calendars.
   - **ONLY extract news articles that report a concrete, localized problem or emergency** in Ludhiana (e.g., sewer blockages, road potholes, garbage dumping, illegal building branch violations, disease outbreaks, vector counts, legal contempt cases, etc.) where specific action needs to be taken by an MCL department.
   - If a page contains only routine updates or promotional news, return an empty JSON array: [].

2. **Boundary Detection & Segmentation**:
   - Page text might contain multiple articles. Carefully identify where one article ends and the next begins.
   - Extract only the distinct, actionable news items found on this page. 

3. **Translation**:
   - If an article is written in Punjabi or Hindi, you MUST translate its headline, body, summary, and next steps into clear, professional English.

4. **Classification (Department Mapping)**:
   You must assign each article to EXACTLY ONE of the following 15 municipal departments based on the core issue:
   - "Operations & Maintenance (O&M)": Water supply, sewerage, waterlogging, drainage, pipe leakage.
   - "Bridges & Roads (B&R)": Roads, potholes, patchworks, highways, bridges, flyovers, footpaths.
   - "Horticulture / Parks & Squares": Parks, public gardens, tree pruning, green belts, landscaping.
   - "Solid Waste Management (SWM)": Garbage dumps, secondary points, waste collection, refuse lifting, trash.
   - "Sanitation & Vector Control": Mosquito fogging, dengue/malaria prevention, street sweeping, cleanliness.
   - "Health Branch": Birth/death certificates, stray dogs, dog bites, animal slaughterhouses, dairy shifting.
   - "Town Planning (Building Branch)": Illegal buildings, unauthorized construction, demolition drives, MTP cell.
   - "Tehbazari / Land & Encroachment": Temporary encroachments, roadside vendors (rehris), illegal occupations.
   - "Licensing & Health License Branch": Commercial licenses, shop permits, trade certificates.
   - "Property Tax / House Tax Branch": Property tax collection, tax sealings, recovery notices.
   - "Accounts & Finance": Budgets, audits, development funds, salary issues, tender awards.
   - "Establishment & General Branch": Staff transfers, promotions, suspensions, HR complaints, MCL office matters.
   - "Legal Cell": Court cases, High Court orders, contempt notices, legal litigations.
   - "Public Grievance Redressal / IT Cell": Online complaints, mobile app issues, grievance portals.
   - "Fire Brigade & Emergency Services": Fires, rescue operations, fire safety notices, fire tenders.

5. **Severity Assessment & Routine Exclusion**:
   Assign a severity level based on the urgency of the issue. Skip routine updates entirely.
   - "High": Involves loss of life/injury, disease outbreaks, major infrastructure collapse, High Court legal contempt/notices, public protests, or direct criticism from MLAs/MPs.
   - "Medium": Service disruptions, pending development projects, Councillor criticisms, or general public complaints with local evidence.
   - "Low": Minor local issues (e.g. minor cleanups or small park repairs) that are still actionable, but not routine/promotional updates.

6. **JSON Schema Output**:
   You must respond with a raw JSON array of objects. Do NOT wrap the JSON in markdown formatting (no ```json ... ```), do not add preamble, introductory text, or explanatory footnotes. Output ONLY the JSON array.
   Each object in the array must conform EXACTLY to the following schema:
   {{
     "headline": "The English-translated headline of the news article.",
     "body": "The complete text of the article translated to English. Preserve all important details, figures, and quotes.",
     "publication": "Name of the newspaper (e.g., Jag Bani, Dainik Bhaskar, The Tribune, Punjabi Jagran) if identifiable. Use 'Unknown' if not specified.",
     "department": "The exact department name from the list of 15 allowed values.",
     "severity": "High" | "Medium" | "Low",
     "page_number": 1, // Will be overridden or set to current page number
     "summary": {{
       "when": "Specific date, day, or timeframe mentioned (e.g., 'Thursday morning', 'July 9, 2026'). If not specified, write 'Not specified'.",
       "where": "Specific location mentioned (e.g., 'Ward 34', 'Ghumar Mandi', 'Ferozepur Road'). Be as granular as possible. If not specified, write 'Not specified'.",
       "what": "A clear 2-3 sentence explanation of the problem, issue, or development.",
       "next_steps": "2-3 highly actionable and concrete suggestions for the assigned MCL officer/department to address this issue (e.g., 'Conduct site inspection of the sewer line', 'Issue notice to the builder')."
     }}
   }}

---
### FEW-SHOT EXAMPLE FOR REFERENCE:
Input OCR text:
"Ludhiana: Residents of Ward 32 faced sewer blockage on Rahon Road yesterday. Local councillor criticised MC officials."

Expected JSON Output:
[
  {{
    "headline": "Sewer Blockage Causes Woes on Rahon Road",
    "body": "Residents of Ward 32 faced sewer blockage on Rahon Road yesterday. Local councillor criticised MC officials.",
    "publication": "Unknown",
    "department": "Operations & Maintenance (O&M)",
    "severity": "Medium",
    "page_number": 1,
    "summary": {{
      "when": "Yesterday",
      "where": "Ward 32, Rahon Road",
      "what": "Residents faced sewer blockage on Rahon Road, drawing criticism from the local councillor.",
      "next_steps": "Conduct site inspection of the sewer line and dispatch a super suction machine to clear the blockage."
    }}
  }}
]
"""

            user_prompt = f"""OCR TEXT FOR PAGE {p_num} TO ANALYZE:
{clean_text}

JSON output (must conform to schema with page_number set strictly to {p_num}):"""

            raw_analysis = ""
            try:
                if settings.ANTHROPIC_API_KEY:
                    raw_analysis = call_claude(user_prompt, system_prompt)
                else:
                    combined_prompt = f"{system_prompt}\n\n{user_prompt}"
                    raw_analysis = call_gemini_with_rotation(combined_prompt)

                cleaned_json = raw_analysis.strip()
                if cleaned_json.startswith("```json"):
                    cleaned_json = cleaned_json[7:]
                if cleaned_json.startswith("```"):
                    cleaned_json = cleaned_json[3:]
                if cleaned_json.endswith("```"):
                    cleaned_json = cleaned_json[:-3]
                cleaned_json = cleaned_json.strip()

                if cleaned_json:
                    page_items = json.loads(cleaned_json, strict=False)
                    if isinstance(page_items, list):
                        news_items.extend(page_items)
                        print(f"Extracted {len(page_items)} articles from Page {p_num}")
            except Exception as page_err:
                print(f"Failed to analyse Page {p_num}: {page_err}. raw_response: {raw_analysis}")
                update_pdf_upload(upload_id, {
                    "progress_log": f"Page {p_num} analysis failed: {str(page_err)[:100]}"
                })
                # Check for critical invalid keys
                llm_error_text = str(page_err)
                if "API_KEY_INVALID" in llm_error_text or "API key not valid" in llm_error_text:
                    raise ValueError(
                        "LLM API key is invalid. Update GEMINI_API_KEY_1/2/3 or ANTHROPIC_API_KEY in .env and restart the backend."
                    ) from page_err

        # Merge adjacent page segments for articles spanning consecutive pages
        news_items = merge_consecutive_articles(news_items)

        # Fallback to local keyword extraction if no news items could be extracted via AI
        if not news_items:
            print("No news items extracted via AI. Running local keyword fallback...")
            update_pdf_upload(upload_id, {
                "progress_log": "No news items extracted via AI. Running local keyword fallback..."
            })
            ocr_blocks = []
            for p_num, text in extracted_texts:
                ocr_blocks.append(f"--- PAGE {p_num} ---\n{text}")
            combined_text = "\n\n".join(ocr_blocks)
            news_items = extract_fallback_news(combined_text)
            if not news_items:
                raise ValueError(
                    "Gemini did not return valid articles, and the local fallback found no usable article text."
                )

        # Step 3: Insert items to DB
        items_count = len(news_items)
        print(f"Segmented {items_count} news items.")
        update_pdf_upload(upload_id, {
            "progress_log": f"AI Segmented and Classified {items_count} news items. Storing records..."
        })

        # Fetch mappings & officers for mapping suggested officer logs
        mappings = get_domain_mappings()
        officers = get_officers()
        
        mapping_dict = {m["department"]: m["suggested_officer_id"] for m in mappings}
        officer_dict = {o["id"]: o for o in officers}
        
        # Fallback to JC (V) if none matched
        jc_v_id = next((o["id"] for o in officers if o["short_code"] == "JC (V)"), None)

        for idx, item in enumerate(news_items):
            dept = item.get("department", "Operations & Maintenance (O&M)")
            severity = item.get("severity", "Medium")
            # Ensure severity is matching enum constraints
            if severity not in ["High", "Medium", "Low"]:
                severity = "Medium"
                
            headline = item.get("headline", f"News Article {idx+1}")
            body = item.get("body", "")
            publication = item.get("publication", "Unknown")
            summary = item.get("summary", "")
            page_num = item.get("page_number", 1)

            # Insert
            create_news_item({
                "pdf_upload_id": upload_id,
                "headline": headline,
                "body": body,
                "publication": publication,
                "department": dept,
                "severity": severity,
                "summary": summary,
                "page_number": page_num,
                "status": "pending"
            })
            
            # Lookup officer details for log
            s_off_id = mapping_dict.get(dept) or jc_v_id
            s_off_code = "JC (V)"
            if s_off_id and s_off_id in officer_dict:
                s_off_code = officer_dict[s_off_id]["short_code"]
                
            update_pdf_upload(upload_id, {
                "progress_log": f"Extracted: '{headline[:40]}...' -> Classified: {dept} ({severity}) | Pre-assigned to: {s_off_code}"
            })

        # Complete upload
        update_pdf_upload(upload_id, {
            "processing_status": "completed",
            "current_step": "completed",
            "items_extracted": items_count,
            "progress_log": f"Pipeline execution completed successfully. Ingested {items_count} items."
        })
        print(f"Pipeline completed successfully for {upload_id}")

    except Exception as e:
        error_msg = f"Pipeline failed: {e}\n{traceback.format_exc()}"
        print(error_msg)
        update_pdf_upload(upload_id, {
            "processing_status": "failed",
            "current_step": "failed",
            "progress_log": f"Critical Error in pipeline: {str(e)}"
        })
