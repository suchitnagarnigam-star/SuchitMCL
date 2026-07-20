import os
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from backend.config import settings

# Initialize Supabase client
supabase: Optional[Client] = None
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")

# In-memory mock database for fallback
mock_db = {
    "uploads": {},
    "news_items": {},
    "officers": {},
    "domain_mappings": {},
    "dispatches": {},
    "evidence": {} # news_item_id -> list of evidence
}

# Helper to load seed data into mock database if needed
def seed_mock_db():
    officers = [
        {"id": "o1", "short_code": "JC (V)", "full_name": "Vineet Kumar", "designation": "Joint Commissioner", "officer_type": "joint_commissioner", "zone": None, "department": None, "whatsapp_number": "", "is_active": True},
        {"id": "o2", "short_code": "JC (A)", "full_name": "Amanpreet Singh", "designation": "Joint Commissioner", "officer_type": "joint_commissioner", "zone": None, "department": None, "whatsapp_number": "", "is_active": True},
        {"id": "o3", "short_code": "JC (T)", "full_name": "Tapan Bhanot", "designation": "Joint Commissioner", "officer_type": "joint_commissioner", "zone": None, "department": None, "whatsapp_number": "", "is_active": True},
        {"id": "o4", "short_code": "Zonal (A)", "full_name": "Zonal Commissioner A", "designation": "Zonal Commissioner", "officer_type": "zonal_commissioner", "zone": "A", "department": None, "whatsapp_number": "", "is_active": True},
        {"id": "o5", "short_code": "Zonal (B)", "full_name": "Zonal Commissioner B", "designation": "Zonal Commissioner", "officer_type": "zonal_commissioner", "zone": "B", "department": None, "whatsapp_number": "", "is_active": True},
        {"id": "o6", "short_code": "Zonal (C)", "full_name": "Zonal Commissioner C", "designation": "Zonal Commissioner", "officer_type": "zonal_commissioner", "zone": "C", "department": None, "whatsapp_number": "", "is_active": True},
        {"id": "o7", "short_code": "Zonal (D)", "full_name": "Zonal Commissioner D", "designation": "Zonal Commissioner", "officer_type": "zonal_commissioner", "zone": "D", "department": None, "whatsapp_number": "", "is_active": True},
        {"id": "o8", "short_code": "SE (O&M)", "full_name": "Ekjot Singh", "designation": "Superintending Engineer", "officer_type": "superintending_engineer", "zone": None, "department": "Operations & Maintenance (O&M)", "whatsapp_number": "", "is_active": True},
        {"id": "o9", "short_code": "SE (B&R)", "full_name": "Parveen Singla", "designation": "Superintending Engineer", "officer_type": "superintending_engineer", "zone": None, "department": "Bridges & Roads (B&R)", "whatsapp_number": "", "is_active": True},
        {"id": "o10", "short_code": "MTP", "full_name": "Ranjit Singh", "designation": "Municipal Town Planner", "officer_type": "superintending_engineer", "zone": None, "department": "Town Planning (Building Branch)", "whatsapp_number": "", "is_active": True},
        {"id": "o11", "short_code": "SE (SLG)", "full_name": "Shyam Lal Gupta", "designation": "Superintending Engineer", "officer_type": "superintending_engineer", "zone": None, "department": None, "whatsapp_number": "", "is_active": True},
        {"id": "o12", "short_code": "SE (HPS)", "full_name": "Harkiranpal Singh", "designation": "Superintending Engineer", "officer_type": "superintending_engineer", "zone": None, "department": None, "whatsapp_number": "", "is_active": True}
    ]
    for o in officers:
        mock_db["officers"][o["id"]] = o

    mappings = [
        {"id": "m1", "department": "Operations & Maintenance (O&M)", "suggested_officer_id": "o8"},
        {"id": "m2", "department": "Bridges & Roads (B&R)", "suggested_officer_id": "o9"},
        {"id": "m3", "department": "Town Planning (Building Branch)", "suggested_officer_id": "o10"},
        {"id": "m4", "department": "Tehbazari / Land & Encroachment", "suggested_officer_id": "o1"},
        {"id": "m5", "department": "Legal Cell", "suggested_officer_id": "o1"},
        {"id": "m6", "department": "Sanitation & Vector Control", "suggested_officer_id": "o2"},
        {"id": "m7", "department": "Solid Waste Management (SWM)", "suggested_officer_id": "o2"},
        {"id": "m8", "department": "Health Branch", "suggested_officer_id": "o2"},
        {"id": "m9", "department": "Horticulture / Parks & Squares", "suggested_officer_id": "o2"},
        {"id": "m10", "department": "Property Tax / House Tax Branch", "suggested_officer_id": "o3"},
        {"id": "m11", "department": "Licensing & Health License Branch", "suggested_officer_id": "o3"},
        {"id": "m12", "department": "Accounts & Finance", "suggested_officer_id": "o3"},
        {"id": "m13", "department": "Establishment & General Branch", "suggested_officer_id": "o3"},
        {"id": "m14", "department": "Public Grievance Redressal / IT Cell", "suggested_officer_id": "o1"},
        {"id": "m15", "department": "Fire Brigade & Emergency Services", "suggested_officer_id": "o1"}
    ]
    for m in mappings:
        mock_db["domain_mappings"][m["department"]] = m["suggested_officer_id"]

seed_mock_db()

# --- PDF UPLOADS ---
def create_pdf_upload(filename: str, uploaded_by: str, storage_path: str) -> str:
    if supabase:
        try:
            data = {
                "filename": filename,
                "uploaded_by": uploaded_by,
                "storage_path": storage_path,
                "processing_status": "uploading",
                "current_step": "uploading",
                "progress_log": ["PDF file uploaded successfully."]
            }
            res = supabase.table("mcl_pdf_uploads").insert(data).execute()
            if res.data:
                return res.data[0]["id"]
        except Exception as e:
            print(f"DB Error create_pdf_upload: {e}")
    
    # Fallback
    import uuid
    uid = str(uuid.uuid4())
    mock_db["uploads"][uid] = {
        "id": uid,
        "filename": filename,
        "uploaded_by": uploaded_by,
        "storage_path": storage_path,
        "processing_status": "uploading",
        "current_step": "uploading",
        "progress_log": ["PDF file uploaded successfully."],
        "total_pages": 0,
        "items_extracted": 0,
        "created_at": datetime.now().isoformat()
    }
    return uid

def update_pdf_upload(upload_id: str, updates: Dict[str, Any]) -> None:
    if supabase:
        try:
            if "progress_log" in updates and isinstance(updates["progress_log"], str):
                current = supabase.table("mcl_pdf_uploads").select("progress_log").eq("id", upload_id).execute()
                log = []
                if current.data:
                    log = current.data[0].get("progress_log") or []
                log.append(updates["progress_log"])
                updates["progress_log"] = log

            supabase.table("mcl_pdf_uploads").update(updates).eq("id", upload_id).execute()
            return
        except Exception as e:
            print(f"DB Error update_pdf_upload: {e}")

    # Fallback
    if upload_id in mock_db["uploads"]:
        item = mock_db["uploads"][upload_id]
        for k, v in updates.items():
            if k == "progress_log" and isinstance(v, str):
                item["progress_log"].append(v)
            else:
                item[k] = v

def get_pdf_upload(upload_id: str) -> Optional[Dict[str, Any]]:
    if supabase:
        try:
            res = supabase.table("mcl_pdf_uploads").select("*").eq("id", upload_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"DB Error get_pdf_upload: {e}")
    
    # Fallback
    return mock_db["uploads"].get(upload_id)


# --- OFFICERS ---
def get_officers() -> List[Dict[str, Any]]:
    if supabase:
        try:
            res = supabase.table("mcl_officers").select("*").execute()
            if res.data:
                return res.data
        except Exception as e:
            print(f"DB Error get_officers: {e}")
    
    # Fallback
    return list(mock_db["officers"].values())

def create_officer(officer: Dict[str, Any]) -> Dict[str, Any]:
    if supabase:
        try:
            res = supabase.table("mcl_officers").insert(officer).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"DB Error create_officer: {e}")
    
    # Fallback
    import uuid
    uid = str(uuid.uuid4())
    officer["id"] = uid
    mock_db["officers"][uid] = officer
    return officer

def update_officer(officer_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if supabase:
        try:
            res = supabase.table("mcl_officers").update(updates).eq("id", officer_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"DB Error update_officer: {e}")
    
    # Fallback
    if officer_id in mock_db["officers"]:
        mock_db["officers"][officer_id].update(updates)
        return mock_db["officers"][officer_id]
    return None

def delete_officer(officer_id: str) -> bool:
    if supabase:
        try:
            supabase.table("mcl_officers").delete().eq("id", officer_id).execute()
            return True
        except Exception as e:
            print(f"DB Error delete_officer: {e}")
            return False
    
    # Fallback
    if officer_id in mock_db["officers"]:
        del mock_db["officers"][officer_id]
        return True
    return False


# --- DOMAIN MAPPINGS ---
def get_domain_mappings() -> List[Dict[str, Any]]:
    if supabase:
        try:
            res = supabase.table("mcl_domain_mapping").select("*").execute()
            if res.data:
                return res.data
        except Exception as e:
            print(f"DB Error get_domain_mappings: {e}")
    
    # Fallback
    mappings = []
    for dept, officer_id in mock_db["domain_mappings"].items():
        mappings.append({
            "id": f"map_{dept}",
            "department": dept,
            "suggested_officer_id": officer_id
        })
    return mappings

def update_domain_mappings(mappings: List[Dict[str, Any]]) -> bool:
    if supabase:
        try:
            for mapping in mappings:
                supabase.table("mcl_domain_mapping").upsert({
                    "department": mapping["department"],
                    "suggested_officer_id": mapping["suggested_officer_id"]
                }, on_conflict="department").execute()
            return True
        except Exception as e:
            print(f"DB Error update_domain_mappings: {e}")
            return False
    
    # Fallback
    for m in mappings:
        mock_db["domain_mappings"][m["department"]] = m["suggested_officer_id"]
    return True


# --- NEWS ITEMS ---
def create_news_item(news_item: Dict[str, Any]) -> Dict[str, Any]:
    if supabase:
        try:
            res = supabase.table("mcl_news_items").insert(news_item).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"DB Error create_news_item: {e}")
    
    # Fallback
    import uuid
    uid = str(uuid.uuid4())
    news_item["id"] = uid
    news_item["status"] = news_item.get("status", "pending")
    news_item["created_at"] = datetime.now().isoformat()
    mock_db["news_items"][uid] = news_item
    return news_item

def get_news_items(date_str: Optional[str] = None, department: Optional[str] = None, severity: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    news_items_list = []
    if supabase:
        try:
            q = supabase.table("mcl_news_items").select("*")
            if status:
                q = q.eq("status", status)
            if department:
                q = q.eq("department", department)
            if severity:
                q = q.eq("severity", severity)
            if date_str:
                q = q.gte("created_at", f"{date_str}T00:00:00").lte("created_at", f"{date_str}T23:59:59")
            
            res = q.execute()
            if res.data:
                news_items_list = res.data
        except Exception as e:
            print(f"DB Error get_news_items: {e}")
    else:
        news_items_list = list(mock_db["news_items"].values())
        if status:
            news_items_list = [x for x in news_items_list if x.get("status") == status]
        if department:
            news_items_list = [x for x in news_items_list if x.get("department") == department]
        if severity:
            news_items_list = [x for x in news_items_list if x.get("severity") == severity]
        if date_str:
            news_items_list = [x for x in news_items_list if x.get("created_at", "").startswith(date_str)]

    all_mappings = get_domain_mappings()
    all_officers = get_officers()
    officer_map = {o["id"]: o for o in all_officers}
    mapping_map = {m["department"]: m["suggested_officer_id"] for m in all_mappings}

    # Bulk fetch evidence to prevent N+1 query problem
    evidence_by_item = {}
    if news_items_list:
        if supabase:
            try:
                item_ids = [item["id"] for item in news_items_list]
                evidence_list = []
                chunk_size = 200
                for i in range(0, len(item_ids), chunk_size):
                    chunk = item_ids[i:i+chunk_size]
                    res_ev = supabase.table("mcl_evidence").select("*").in_("news_item_id", chunk).execute()
                    if res_ev.data:
                        evidence_list.extend(res_ev.data)
                for ev in evidence_list:
                    nid = ev["news_item_id"]
                    if nid not in evidence_by_item:
                        evidence_by_item[nid] = []
                    evidence_by_item[nid].append(ev)
            except Exception as e:
                print(f"DB Error fetching bulk evidence: {e}")
        else:
            for item in news_items_list:
                nid = item["id"]
                evidence_by_item[nid] = mock_db["evidence"].get(nid, [])

    joined_list = []
    for item in news_items_list:
        joined_item = dict(item)
        dept = item.get("department")
        suggested_officer_id = mapping_map.get(dept)
        
        if not suggested_officer_id:
            fallback_officers = [o for o in all_officers if o.get("short_code") == "JC (V)"]
            if fallback_officers:
                suggested_officer_id = fallback_officers[0]["id"]

        suggested_officer = officer_map.get(suggested_officer_id) if suggested_officer_id else None
        joined_item["suggested_officer"] = suggested_officer
        
        # Attach bulk fetched evidence
        joined_item["evidence"] = evidence_by_item.get(item["id"], [])
        
        joined_list.append(joined_item)

    return joined_list


# --- DISPATCHES ---
def create_dispatch(news_item_id: str, officer_id: str, remarks: Optional[str], message_text: str) -> Dict[str, Any]:
    now_iso = datetime.now().isoformat()
    if supabase:
        try:
            supabase.table("mcl_news_items").update({
                "status": "dispatched",
                "dispatched_at": now_iso
            }).eq("id", news_item_id).execute()

            data = {
                "news_item_id": news_item_id,
                "officer_id": officer_id,
                "remarks": remarks,
                "message_text": message_text,
                "whatsapp_status": "sent"
            }
            res = supabase.table("mcl_dispatches").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"DB Error create_dispatch: {e}")

    # Fallback
    if news_item_id in mock_db["news_items"]:
        mock_db["news_items"][news_item_id]["status"] = "dispatched"
        mock_db["news_items"][news_item_id]["dispatched_at"] = now_iso

    import uuid
    uid = str(uuid.uuid4())
    dispatch = {
        "id": uid,
        "news_item_id": news_item_id,
        "officer_id": officer_id,
        "dispatched_by": "Commissioner",
        "dispatched_at": now_iso,
        "remarks": remarks,
        "whatsapp_status": "sent",
        "message_text": message_text
    }
    mock_db["dispatches"][uid] = dispatch
    return dispatch

def get_dispatched(officer_id: Optional[str] = None, department: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
    dispatches_list = []
    if supabase:
        try:
            res = supabase.table("mcl_dispatches").select("*").execute()
            if res.data:
                dispatches_list = res.data
        except Exception as e:
            print(f"DB Error get_dispatched: {e}")
    else:
        dispatches_list = list(mock_db["dispatches"].values())

    all_officers = get_officers()
    officer_map = {o["id"]: o for o in all_officers}

    news_items_list = []
    if supabase:
        try:
            res = supabase.table("mcl_news_items").select("*").execute()
            if res.data:
                news_items_list = res.data
        except Exception as e:
            print(f"DB Error get_dispatched news items: {e}")
    else:
        news_items_list = list(mock_db["news_items"].values())
    news_map = {n["id"]: n for n in news_items_list}

    joined_dispatches = []
    for d in dispatches_list:
        news_item = news_map.get(d["news_item_id"])
        officer = officer_map.get(d["officer_id"])

        if not news_item or not officer:
            continue

        if officer_id and d["officer_id"] != officer_id:
            continue
        if department and news_item.get("department") != department:
            continue

        disp_date = d["dispatched_at"][:10]
        if date_from and disp_date < date_from:
            continue
        if date_to and disp_date > date_to:
            continue

        joined = dict(d)
        joined["news_item"] = news_item
        joined["officer"] = officer
        joined_dispatches.append(joined)

    joined_dispatches.sort(key=lambda x: x.get("dispatched_at", ""), reverse=True)
    return joined_dispatches


# --- SUPABASE STORAGE UPLOADS ---
def upload_pdf_to_storage(filename: str, file_data: bytes) -> str:
    if supabase:
        try:
            import uuid
            unique_name = f"{uuid.uuid4()}_{filename}"
            res = supabase.storage.from_("mcl-pdfs").upload(
                path=unique_name,
                file=file_data,
                file_options={"content-type": "application/pdf"}
            )
            return unique_name
        except Exception as e:
            print(f"Storage Upload Error: {e}")
    
    return f"local_mock_storage/{filename}"


# --- NEW life-cycle tracking DB methods ---

def upload_evidence_to_storage(filename: str, file_data: bytes) -> str:
    """Uploads file evidence to Supabase mcl-evidence bucket and returns public URL."""
    if supabase:
        try:
            import uuid
            unique_name = f"{uuid.uuid4()}_{filename}"
            
            # Determine content type based on name extension
            content_type = "application/octet-stream"
            if filename.lower().endswith(".pdf"):
                content_type = "application/pdf"
            elif filename.lower().endswith((".jpg", ".jpeg")):
                content_type = "image/jpeg"
            elif filename.lower().endswith(".png"):
                content_type = "image/png"

            supabase.storage.from_("mcl-evidence").upload(
                path=unique_name,
                file=file_data,
                file_options={"content-type": content_type}
            )
            
            # Retrieve public URL
            public_url = supabase.storage.from_("mcl-evidence").get_public_url(unique_name)
            return public_url
        except Exception as e:
            print(f"Evidence Storage Upload Error: {e}")
    
    return f"http://localhost:8000/mock-evidence/{filename}"

def create_evidence(news_item_id: str, file_type: str, file_url: str, file_name: str) -> Dict[str, Any]:
    if supabase:
        try:
            data = {
                "news_item_id": news_item_id,
                "file_type": file_type,
                "file_url": file_url,
                "file_name": file_name
            }
            res = supabase.table("mcl_evidence").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"DB Error create_evidence: {e}")

    # Fallback
    import uuid
    uid = str(uuid.uuid4())
    record = {
        "id": uid,
        "news_item_id": news_item_id,
        "file_type": file_type,
        "file_url": file_url,
        "file_name": file_name,
        "uploaded_at": datetime.now().isoformat()
      }
    if news_item_id not in mock_db["evidence"]:
        mock_db["evidence"][news_item_id] = []
    mock_db["evidence"][news_item_id].append(record)
    return record

def get_evidence_for_item(news_item_id: str) -> List[Dict[str, Any]]:
    if supabase:
        try:
            res = supabase.table("mcl_evidence").select("*").eq("news_item_id", news_item_id).execute()
            if res.data:
                return res.data
        except Exception as e:
            print(f"DB Error get_evidence_for_item: {e}")
            return []
    
    # Fallback
    return mock_db["evidence"].get(news_item_id, [])

def update_news_item_action(news_item_id: str, status: str, action_taken_description: str) -> Optional[Dict[str, Any]]:
    """Updates news item action details. Calculates time_taken_days if status is Resolved."""
    now_iso = datetime.now().isoformat()
    updates: Dict[str, Any] = {
        "status": status,
        "action_taken_description": action_taken_description
    }

    # Fetch original item first to calculate duration or retrieve dates
    orig_item = None
    if supabase:
        try:
            res = supabase.table("mcl_news_items").select("*").eq("id", news_item_id).execute()
            if res.data:
                orig_item = res.data[0]
        except Exception as e:
            print(f"DB Error fetching original item for action updates: {e}")
    else:
        orig_item = mock_db["news_items"].get(news_item_id)

    if status == "resolved":
        updates["resolved_at"] = now_iso
        
        # Calculate time taken in days
        dispatched_at_str = None
        if orig_item:
            dispatched_at_str = orig_item.get("dispatched_at") or orig_item.get("created_at")
        
        if dispatched_at_str:
            try:
                # Truncate timezone offset variations for standard python datetime parser
                clean_disp = dispatched_at_str.split("+")[0].split(".")[0]
                disp_dt = datetime.fromisoformat(clean_disp)
                res_dt = datetime.now()
                delta = res_dt - disp_dt
                updates["time_taken_days"] = max(1, delta.days)
            except Exception as dt_err:
                print(f"Date calculation error: {dt_err}")
                updates["time_taken_days"] = 1
        else:
            updates["time_taken_days"] = 1

    # Apply updates
    if supabase:
        try:
            res = supabase.table("mcl_news_items").update(updates).eq("id", news_item_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"DB Error updating news item action: {e}")
    else:
        if news_item_id in mock_db["news_items"]:
            mock_db["news_items"][news_item_id].update(updates)
            return mock_db["news_items"][news_item_id]

    return None

def get_officers_with_active_items() -> List[Dict[str, Any]]:
    """Returns list of officers containing at least one item in 'dispatched' or 'in_progress' status."""
    # 1. Fetch active dispatches
    all_dispatches = get_dispatched()
    
    # 2. Query items to check status
    news_items_list = []
    if supabase:
        try:
            res = supabase.table("mcl_news_items").select("id, status").in_("status", ["dispatched", "in_progress"]).execute()
            if res.data:
                news_items_list = res.data
        except Exception as e:
            print(f"DB Error fetching active items statuses: {e}")
    else:
        news_items_list = list(mock_db["news_items"].values())

    active_item_ids = {item["id"] for item in news_items_list if item["status"] in ["dispatched", "in_progress"]}
    
    # Fetch full news item details once outside the loop to avoid N+1 queries
    all_items = get_news_items(status=None, date_str=None)
    items_by_id = {x["id"]: x for x in all_items}

    # Gather officer item counts
    officer_active_counts: Dict[str, List[Dict[str, Any]]] = {}
    for d in all_dispatches:
        n_id = d["news_item_id"]
        if n_id in active_item_ids:
            off_id = d["officer_id"]
            
            full_item = items_by_id.get(n_id)
            if not full_item:
                continue

            # Attach remarks and dispatch details inside item
            item_details = dict(full_item)
            item_details["remarks"] = d.get("remarks")
            item_details["dispatched_at"] = d.get("dispatched_at")
            
            if off_id not in officer_active_counts:
                officer_active_counts[off_id] = []
            officer_active_counts[off_id].append(item_details)

    # Resolve officer objects
    all_officers = get_officers()
    active_officers_list = []
    
    for o in all_officers:
        o_id = o["id"]
        if o_id in officer_active_counts:
            officer_details = dict(o)
            officer_details["active_items"] = officer_active_counts[o_id]
            officer_details["active_count"] = len(officer_active_counts[o_id])
            active_officers_list.append(officer_details)

    return active_officers_list

def get_resolved_items(department: Optional[str] = None, officer_id: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    # Get all news items with status = 'resolved'
    news_items_list = []
    if supabase:
        try:
            q = supabase.table("mcl_news_items").select("*").eq("status", "resolved")
            if department:
                q = q.eq("department", department)
            res = q.execute()
            if res.data:
                news_items_list = res.data
        except Exception as e:
            print(f"DB Error fetching resolved news items: {e}")
    else:
        news_items_list = [x for x in mock_db["news_items"].values() if x.get("status") == "resolved"]
        if department:
            news_items_list = [x for x in news_items_list if x.get("department") == department]

    # Join dispatches to identify who resolved what
    all_dispatches = get_dispatched()
    dispatches_map = {}
    for d in all_dispatches:
        nid = d["news_item_id"]
        if nid not in dispatches_map:
            dispatches_map[nid] = []
        dispatches_map[nid].append(d)
    
    all_officers = get_officers()
    officers_map = {o["id"]: o for o in all_officers}

    # Bulk fetch evidence to prevent N+1 query problem
    evidence_by_item = {}
    if news_items_list:
        if supabase:
            try:
                item_ids = [item["id"] for item in news_items_list]
                evidence_list = []
                chunk_size = 200
                for i in range(0, len(item_ids), chunk_size):
                    chunk = item_ids[i:i+chunk_size]
                    res_ev = supabase.table("mcl_evidence").select("*").in_("news_item_id", chunk).execute()
                    if res_ev.data:
                        evidence_list.extend(res_ev.data)
                for ev in evidence_list:
                    nid = ev["news_item_id"]
                    if nid not in evidence_by_item:
                        evidence_by_item[nid] = []
                    evidence_by_item[nid].append(ev)
            except Exception as e:
                print(f"DB Error fetching bulk evidence for resolved: {e}")
        else:
            for item in news_items_list:
                nid = item["id"]
                evidence_by_item[nid] = mock_db["evidence"].get(nid, [])

    joined_list = []
    for item in news_items_list:
        # Search filter match
        if search and search.strip():
            query_str = search.lower()
            if query_str not in item.get("headline", "").lower() and query_str not in item.get("action_taken_description", "").lower():
                continue

        d_records = dispatches_map.get(item["id"]) or []
        if officer_id:
            matched = any(d["officer_id"] == officer_id for d in d_records)
            if not matched:
                continue

        officer = None
        d_record = None
        if d_records:
            d_record = d_records[-1] # Default to the last dispatch
            officer = officers_map.get(d_record["officer_id"])

        joined = dict(item)
        joined["officer"] = officer
        joined["dispatch_details"] = d_record
        joined["all_dispatches"] = d_records
        joined["evidence"] = evidence_by_item.get(item["id"], [])
        joined_list.append(joined)

    # Sort reverse chronological by resolved_at
    joined_list.sort(key=lambda x: x.get("resolved_at", ""), reverse=True)
    return joined_list
