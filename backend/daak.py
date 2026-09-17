import re
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, date

from backend.config import settings
import backend.database as db

MCL_DEPARTMENTS = [
    "Operations & Maintenance (O&M)",
    "Bridges & Roads (B&R)",
    "Horticulture / Parks & Squares",
    "Solid Waste Management (SWM)",
    "Sanitation & Vector Control",
    "Health Branch",
    "Town Planning (Building Branch)",
    "Tehbazari / Land & Encroachment",
    "Licensing & Health License Branch",
    "Property Tax / House Tax Branch",
    "Accounts & Finance",
    "Establishment & General Branch",
    "Legal Cell",
    "Public Grievance Redressal / IT Cell",
    "Fire Brigade & Emergency Services"
]

DEPT_KEYWORD_MAP = {
    "Operations & Maintenance (O&M)": ["o&m", "sewer", "sewage", "drain", "water supply", "waterlogging", "pipe", "leakage", "nullah", "motor", "tubewell"],
    "Bridges & Roads (B&R)": ["b&r", "road", "pothole", "patch", "patchwork", "highway", "footpath", "bridge", "flyover", "carpeting", "interlocking", "tile"],
    "Horticulture / Parks & Squares": ["park", "garden", "greenery", "tree", "pruning", "lawn", "horticulture", "plants"],
    "Solid Waste Management (SWM)": ["swm", "garbage", "dump", "waste", "refuse", "collection", "lifting", "secondary point", "trash"],
    "Sanitation & Vector Control": ["sanitation", "mosquito", "fogging", "dengue", "malaria", "sweeper", "safai", "cleanliness", "spray"],
    "Health Branch": ["health", "dog", "bite", "stray", "rabies", "birth certificate", "death certificate", "slaughter", "dairy", "animal"],
    "Town Planning (Building Branch)": ["building", "mtp", "illegal construction", "unauthorized", "demolition", "town planning", "building branch", "map approval"],
    "Tehbazari / Land & Encroachment": ["tehbazari", "encroachment", "rehri", "vendor", "squatter", "illegal occupation", "footpath encroachment"],
    "Licensing & Health License Branch": ["license", "licensing", "trade license", "shop permit", "commercial license"],
    "Property Tax / House Tax Branch": ["property tax", "house tax", "tax collection", "defaulter", "tax sealing", "assessment"],
    "Accounts & Finance": ["accounts", "finance", "budget", "audit", "salary", "expense", "tender", "estimate", "funds", "f&cc"],
    "Establishment & General Branch": ["establishment", "staff", "transfer", "promotion", "suspension", "employee", "hr", "pension"],
    "Legal Cell": ["legal", "court", "high court", "stay order", "contempt", "litigation", "advocate", "notice"],
    "Public Grievance Redressal / IT Cell": ["it cell", "grievance", "portal", "website", "online complaint", "mcl app", "helpline"],
    "Fire Brigade & Emergency Services": ["fire", "blaze", "emergency", "fire extinguisher", "fire safety", "fire tender", "rescue"]
}

def normalize_department(dept_raw: Optional[str], text_fallback: str = "") -> str:
    """
    Normalizes free-text or user-supplied department names to one of MCL's 15 standard departments.
    Falls back to keyword matching across subject and summary.
    """
    if dept_raw:
        clean = dept_raw.strip().lower()
        # Direct exact or partial match
        for dept in MCL_DEPARTMENTS:
            if clean == dept.lower():
                return dept
            
        for dept, keywords in DEPT_KEYWORD_MAP.items():
            if any(k in clean for k in keywords):
                return dept

    # Fallback to scanning subject / summary text
    text_lower = (text_fallback or "").lower()
    for dept, keywords in DEPT_KEYWORD_MAP.items():
        if any(k in text_lower for k in keywords):
            return dept

    return "Public Grievance Redressal / IT Cell"

def parse_date_to_iso(val: Any) -> Optional[str]:
    """
    Parses various date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY) into YYYY-MM-DD string.
    """
    if not val:
        return None
    s = str(val).strip()
    if not s:
        return None
    import re
    # Match YYYY-MM-DD or YYYY/MM/DD
    m1 = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})", s)
    if m1:
        y, m, d = m1.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    # Match DD/MM/YYYY or DD-MM-YYYY
    m2 = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{4})", s)
    if m2:
        d, m, y = m2.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    return None


def infer_severity(category: str, subject: str, summary: str) -> str:
    """
    Infers High / Medium / Low urgency from Daak category and grievance text.
    """
    combined = f"{category} {subject} {summary}".lower()
    high_triggers = [
        "urgent", "emergency", "court", "contempt", "high court", "legal notice",
        "death", "injury", "outbreak", "collapse", "vip", "mla", "mp",
        "councillor", "protest", "strike", "disaster", "hazard", "threat"
    ]
    if any(t in combined for t in high_triggers):
        return "High"
    
    low_triggers = ["routine", "information", "survey", "appreciation", "clarification"]
    if any(t in combined for t in low_triggers):
        return "Low"

    return "Medium"

def extract_location(text: str) -> str:
    """
    Extracts Ward or locality details from text if present.
    """
    ward_match = re.search(r"\bward\s*(?:no\.?|number)?\s*(\d+)\b", text, re.IGNORECASE)
    if ward_match:
        return f"Ward {ward_match.group(1)}"
    
    localities = [
        "Ghumar Mandi", "Model Town", "Sarabha Nagar", "BRS Nagar", "Civil Lines",
        "Ferozepur Road", "Gill Road", "Rahon Road", "Tajpur Road", "Haibowal",
        "Dugri", "Chandigarh Road", "Jalandhar Bypass", "Old City", "Chaura Bazar"
    ]
    for loc in localities:
        if loc.lower() in text.lower():
            return loc
            
    return "Ludhiana"

def fetch_daak_from_appscript(url: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Pulls Daak rows from the Google Apps Script Web App URL.
    Handles redirects automatically.
    """
    target_url = url or settings.DAAK_APPSCRIPT_URL
    if not target_url:
        raise ValueError("DAAK_APPSCRIPT_URL is not configured in settings or environment variables.")

    headers = {"User-Agent": "SuchitNagarNigam/1.0"}
    resp = requests.get(target_url, headers=headers, timeout=25, allow_redirects=True)
    if resp.status_code != 200:
        raise Exception(f"Google Apps Script returned HTTP {resp.status_code}: {resp.text[:200]}")

    try:
        data = resp.json()
    except Exception as e:
        raise Exception(f"Failed to parse JSON from Google Apps Script: {e}. Output: {resp.text[:200]}")

    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        if "rows" in data and isinstance(data["rows"], list):
            return data["rows"]
        elif "data" in data and isinstance(data["data"], list):
            return data["data"]
        else:
            return [data]
            
    return []

def get_existing_daak_keys() -> set:
    """
    Fetches reference numbers and headlines of existing items to prevent duplicate ingestion.
    """
    all_items = db.get_news_items(status=None, date_str=None)
    keys = set()
    for it in all_items:
        s = it.get("summary")
        if isinstance(s, dict):
            ref = s.get("reference_number") or s.get("diary_no")
            if ref:
                keys.add(str(ref).strip().lower())
            serial = s.get("serial_number")
            if serial:
                keys.add(f"serial_{str(serial).strip()}")
        h = it.get("headline")
        if h:
            keys.add(h.strip().lower())
    return keys

def process_and_ingest_daak_rows(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Processes rows from the Daak Google Sheet and ingests new records into mcl_news_items.
    """
    if not rows:
        return {"total_rows": 0, "synced_count": 0, "skipped_count": 0, "new_items": []}

    existing_keys = get_existing_daak_keys()
    new_items_created = []
    skipped_count = 0

    mappings = db.get_domain_mappings()
    mapping_dict = {m["department"]: m["suggested_officer_id"] for m in mappings}
    officers = db.get_officers()
    officer_dict = {o["id"]: o for o in officers}
    jc_v = next((o for o in officers if o["short_code"] == "JC (V)"), None)

    for row in rows:
        # Match columns regardless of case / whitespace
        clean_row = {str(k).strip(): v for k, v in row.items()}
        
        # 1. Extract values
        serial_no = clean_row.get("Serial Number") or clean_row.get("serial_number") or ""
        date_val = clean_row.get("Date") or clean_row.get("date") or ""
        subject = str(clean_row.get("Subject") or clean_row.get("subject") or "").strip()
        summary_desc = str(clean_row.get("Summary") or clean_row.get("summary") or "").strip()
        raw_dept = clean_row.get("Department") or clean_row.get("department") or ""
        category = str(clean_row.get("category") or clean_row.get("Category") or "Civic Grievance").strip()
        sender_name = str(clean_row.get("Sender Name") or clean_row.get("sender_name") or "Citizen").strip()
        sender_contact = str(clean_row.get("Sender Contact") or clean_row.get("sender_contact") or "").strip()
        receiver = str(clean_row.get("Receiver") or clean_row.get("receiver") or "Commissioner MCL").strip()
        ref_no = str(clean_row.get("Reference Number") or clean_row.get("reference_number") or "").strip()
        filename = str(clean_row.get("Filename") or clean_row.get("filename") or "").strip()
        processed_at = clean_row.get("Processed At") or clean_row.get("processed_at") or ""
        sheet_status = str(clean_row.get("STATUS") or clean_row.get("status") or "").strip().lower()

        # Target date based on Processed At (fallback to Date)
        processed_date_str = parse_date_to_iso(processed_at) or parse_date_to_iso(date_val)

        # Ignore entries processed before 15/09/2026 (2026-09-15)
        if processed_date_str and processed_date_str < "2026-09-15":
            skipped_count += 1
            continue

        # Skip rows without subject or summary
        if not subject and not summary_desc:
            skipped_count += 1
            continue

        # Headline fallback
        headline = subject if subject else summary_desc[:90].strip() + "..."
        headline_clean = headline.replace("\n", " ").strip()
        if len(headline_clean) > 130:
            headline_clean = headline_clean[:127] + "..."

        # Deduplication check
        ref_key = ref_no.lower() if ref_no else None
        headline_key = headline_clean.lower()
        serial_key = f"serial_{str(serial_no).strip()}" if serial_no else None

        if (ref_key and ref_key in existing_keys) or (headline_key in existing_keys) or (serial_key and serial_key in existing_keys):
            skipped_count += 1
            continue

        # Department classification
        department = normalize_department(str(raw_dept) if raw_dept else None, text_fallback=f"{subject} {summary_desc}")
        
        # Urgency
        severity = infer_severity(category, subject, summary_desc)

        # Location
        location = extract_location(f"{subject} {summary_desc}")

        # Sender honorific formatting
        sender_formatted = db.format_person_name_with_sh(sender_name)

        # Concrete next steps
        next_steps = f"Conduct on-site inspection for {department} issue at {location}, verify grievance records, and submit Action Taken Report (ATR)."

        # Structured JSON summary
        structured_summary = {
            "source_type": "daak",
            "when": processed_date_str if processed_date_str else (str(date_val) if date_val else date.today().isoformat()),
            "where": location,
            "what": summary_desc if summary_desc else subject,
            "next_steps": next_steps,
            "reference_number": ref_no,
            "diary_no": ref_no,
            "serial_number": serial_no,
            "sender_name": sender_formatted,
            "sender_contact": sender_contact,
            "receiver": receiver,
            "category": category,
            "filename": filename,
            "processed_at": str(processed_at) if processed_at else None,
            "is_actionable_grievance": True,
            "content_category": "civic_grievance"
        }

        # Format publication tag
        pub_tag = f"Daak • Ref #{ref_no}" if ref_no else f"Daak ({sender_formatted})"

        # Determine created_at timestamp based on Processed At date so it appears on that day's Commissioner's desk
        if processed_date_str:
            time_now = datetime.now().strftime("%H:%M:%S")
            created_timestamp = f"{processed_date_str}T{time_now}"
        else:
            created_timestamp = datetime.now().isoformat()

        # Insert record into database
        item_data = {
            "pdf_upload_id": None,
            "headline": headline_clean,
            "body": summary_desc if summary_desc else subject,
            "publication": pub_tag,
            "department": department,
            "severity": severity,
            "summary": structured_summary,
            "page_number": 1,
            "status": "pending",
            "created_at": created_timestamp
        }

        try:
            created_record = db.create_news_item(item_data)
            new_items_created.append(created_record)
            if ref_key:
                existing_keys.add(ref_key)
            existing_keys.add(headline_key)
            if serial_key:
                existing_keys.add(serial_key)
        except Exception as insert_err:
            print(f"Error inserting Daak item '{headline_clean}': {insert_err}")

    return {
        "total_rows": len(rows),
        "synced_count": len(new_items_created),
        "skipped_count": skipped_count,
        "new_items": new_items_created
    }
