import os
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import local services
from backend.config import settings
import backend.database as db
from backend.pipeline import process_pdf_background

app = FastAPI(
    title="Suchit Nagar Nigam API (ਸੂਚਿਤ ਨਗਰ ਨਿਗਮ)",
    description="Media Intelligence and Dispatch System Backend for Municipal Corporation Ludhiana (MCL)"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- REQUEST/RESPONSE SCHEMAS ---

class OfficerCreateSchema(BaseModel):
    short_code: str
    full_name: str
    designation: str
    officer_type: str  # additional_commissioner / joint_commissioner / zonal_commissioner / superintending_engineer
    zone: Optional[str] = None  # A / B / C / D
    department: Optional[str] = None
    whatsapp_number: str
    is_active: Optional[bool] = True

class OfficerUpdateSchema(BaseModel):
    short_code: Optional[str] = None
    full_name: Optional[str] = None
    designation: Optional[str] = None
    officer_type: Optional[str] = None
    zone: Optional[str] = None
    department: Optional[str] = None
    whatsapp_number: Optional[str] = None
    is_active: Optional[bool] = None

class DispatchSchema(BaseModel):
    officer_id: Optional[str] = None
    officer_ids: Optional[List[str]] = None
    remarks: Optional[str] = None

class BulkDispatchItem(BaseModel):
    news_item_id: str
    officer_id: str
    remarks: Optional[str] = None

class BulkDispatchSchema(BaseModel):
    items: List[BulkDispatchItem]

class DomainMappingItem(BaseModel):
    department: str
    officer_id: str

class DomainMappingSchema(BaseModel):
    mappings: List[DomainMappingItem]

class ActionUpdateSchema(BaseModel):
    status: str  # pending / dispatched / in_progress / resolved
    action_taken_description: str


# --- HELPER FUNCTIONS ---

def generate_whatsapp_message(news_item: Dict[str, Any], officer: Dict[str, Any], remarks: Optional[str] = None) -> str:
    """Generates the formatted WhatsApp message based on the spec template."""
    headline = news_item.get("headline", "")
    pub = news_item.get("publication", "Unknown")
    dept = news_item.get("department", "")
    sev = news_item.get("severity", "Medium")
    summary = news_item.get("summary", "")
    
    short_code = officer.get("short_code", "")
    full_name = officer.get("full_name", "")
    desig = officer.get("designation", "")
    
    today_str = date.today().strftime("%d-%m-%Y")

    remarks_block = ""
    if remarks and remarks.strip():
        remarks_block = f"💡 *Suggested Action:*\n{remarks.strip()}\n\n"

    # Check if item is an official Daak grievance
    is_daak = (news_item.get("source_type") == "daak") or (isinstance(summary, dict) and summary.get("source_type") == "daak")
    
    if is_daak:
        ref_no = ""
        sender_info = ""
        summary_text = ""
        if isinstance(summary, dict):
            ref_no = summary.get("reference_number") or summary.get("diary_no") or ""
            sender_name = summary.get("sender_name") or ""
            sender_contact = summary.get("sender_contact") or ""
            if sender_name and sender_contact:
                sender_info = f"{sender_name} ({sender_contact})"
            else:
                sender_info = sender_name or sender_contact or "Citizen"
            summary_text = summary.get("what") or news_item.get("body", "")
        else:
            summary_text = str(summary) if summary else news_item.get("body", "")
            
        ref_line = f"📄 *Ref / Diary No:* {ref_no}\n" if ref_no else ""
        sender_line = f"👤 *Complainant:* {sender_info}\n" if sender_info else ""

        template = f"""🏛️ *Suchit Nagar Nigam — ਸੂਚਿਤ ਨਗਰ ਨਿਗਮ*
*MCL Official Daak Grievance*

{short_code} — {full_name}
*Designation:* {desig}

An official citizen Daak grievance has been marked to you by Corporation Commissioner:

📬 *{headline}*
{ref_line}{sender_line}🏷️ *Department:* {dept}
⚠️ *Severity:* {sev}

*Summary:*
{summary_text}

{remarks_block}Please inspect the site, take necessary action, and update ATR status
on the MCL dashboard at your earliest.

Please visit https://suchit-mcl.vercel.app to upload ATRs.

— Municipal Corporation Ludhiana (MCL)"""
        return template

    # Media intelligence template
    summary_text = summary.get("what", "") if isinstance(summary, dict) else str(summary)
    template = f"""🏛️ *Suchit Nagar Nigam — ਸੂਚਿਤ ਨਗਰ ਨਿਗਮ*
*MCL Media Intelligence Brief*

{short_code} — {full_name}
*Designation:* {desig}

A news item has been flagged and assigned to you:

📰 *{headline}*
📅 {today_str} | 📰 {pub}
🏷️ *Department:* {dept}
⚠️ *Severity:* {sev}

*Summary:*
{summary_text}

{remarks_block}Please take necessary action and update status
on the MCL dashboard at your earliest.

Please visit https://suchit-mcl.vercel.app to upload ATRs.

— Municipal Corporation Ludhiana (MCL)"""
    
    return template


# --- ENDPOINTS ---

@app.post("/upload-pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    publish_date: Optional[str] = Query(None)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        contents = await file.read()
        storage_path = db.upload_pdf_to_storage(file.filename, contents)
        upload_id = db.create_pdf_upload(
            filename=file.filename,
            uploaded_by="PR Officer",
            storage_path=storage_path,
            upload_date=publish_date
        )
        background_tasks.add_task(process_pdf_background, upload_id, contents)
        return {"upload_id": upload_id, "status": "uploading"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload: {str(e)}")


@app.get("/processing-status/{upload_id}")
def get_processing_status(upload_id: str):
    status_record = db.get_pdf_upload(upload_id)
    if not status_record:
        raise HTTPException(status_code=444, detail="Upload record not found.")

    return {
        "status": status_record.get("processing_status"),
        "progress_log": status_record.get("progress_log", []),
        "total_pages": status_record.get("total_pages", 0),
        "items_extracted": status_record.get("items_extracted", 0),
        "current_step": status_record.get("current_step")
    }


@app.get("/news-items")
def get_news_items(
    date_str: Optional[str] = Query(None, alias="date"),
    department: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None)
):
    # If date_str is "all" or empty string, do not filter by date
    if date_str and date_str.lower() in ["all", "none", ""]:
        date_str = None

    # If status is "all" or empty string, do not filter by status
    if status and status.lower() in ["all", "none", ""]:
        status = None
        
    try:
        items = db.get_news_items(
            date_str=date_str,
            department=department,
            severity=severity,
            status=status,
            source_type=source_type
        )
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- DAAK GRIEVANCES ENDPOINTS ---

@app.post("/daak/sync")
def sync_daak_from_sheet(url: Optional[str] = Query(None)):
    """
    Pulls pending citizen Daak grievances from the configured Google Apps Script Web App
    and ingests them into the Commissioner's Desk for review and dispatch.
    """
    try:
        from backend.daak import fetch_daak_from_appscript, process_and_ingest_daak_rows
        rows = fetch_daak_from_appscript(url=url)
        result = process_and_ingest_daak_rows(rows)
        return {
            "success": True,
            "message": f"Successfully synced {result['synced_count']} new Daak grievances ({result['skipped_count']} already up-to-date).",
            "details": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync Daak grievances: {str(e)}")


@app.post("/daak/webhook")
def receive_daak_webhook(payload: Any = Body(...)):
    """
    Webhook endpoint to receive pushed Daak grievance rows from Google Apps Script.
    """
    try:
        from backend.daak import process_and_ingest_daak_rows
        rows = []
        if isinstance(payload, list):
            rows = payload
        elif isinstance(payload, dict):
            if "rows" in payload and isinstance(payload["rows"], list):
                rows = payload["rows"]
            else:
                rows = [payload]
        result = process_and_ingest_daak_rows(rows)
        return {
            "success": True,
            "message": f"Ingested {result['synced_count']} Daak grievances.",
            "details": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process Daak webhook: {str(e)}")


@app.post("/dispatch/{news_item_id}")
def dispatch_news_item(news_item_id: str, payload: DispatchSchema, background_tasks: BackgroundTasks):
    # Fetch news item details
    all_items = db.get_news_items(status=None, date_str=None)
    news_item = next((item for item in all_items if item["id"] == news_item_id), None)
    if not news_item:
        raise HTTPException(status_code=444, detail="News item not found.")

    # Resolve list of officer IDs
    officer_ids = payload.officer_ids or []
    if payload.officer_id and payload.officer_id not in officer_ids:
        officer_ids.append(payload.officer_id)

    if not officer_ids:
        raise HTTPException(status_code=400, detail="At least one officer must be selected.")

    # Fetch all officers to map details
    all_officers = db.get_officers()
    officers_map = {o["id"]: o for o in all_officers}

    dispatched_records = []
    messages = []

    for off_id in officer_ids:
        officer = officers_map.get(off_id)
        if not officer:
            raise HTTPException(status_code=404, detail=f"Officer with ID {off_id} not found.")

        message_text = generate_whatsapp_message(news_item, officer, payload.remarks)

        try:
            dispatch_record = db.create_dispatch(
                news_item_id=news_item_id,
                officer_id=off_id,
                remarks=payload.remarks,
                message_text=message_text
            )
            dispatched_records.append(dispatch_record)
            messages.append(message_text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to record dispatch for officer {off_id}: {str(e)}")

    combined_message_text = "\n\n========================================\n\n".join(messages)

    # Sync with Google Sheets in background
    from backend.sheets import sync_to_google_sheet
    background_tasks.add_task(
        sync_to_google_sheet,
        news_item,
        dispatched_records,
        officers_map,
        payload.remarks
    )

    return {
        "dispatches": [
            {
                "dispatch_id": r["id"],
                "officer_short_code": officers_map[r["officer_id"]]["short_code"],
                "officer_name": officers_map[r["officer_id"]]["full_name"],
                "message_text": r["message_text"]
            }
            for r in dispatched_records
        ],
        "message_text": combined_message_text
    }


@app.post("/dispatch-bulk")
def dispatch_bulk(payload: BulkDispatchSchema, background_tasks: BackgroundTasks):
    results = []
    all_items = db.get_news_items(status=None, date_str=None)
    items_map = {x["id"]: x for x in all_items}
    
    all_officers = db.get_officers()
    officers_map = {o["id"]: o for o in all_officers}

    grouped_dispatches = {} # news_item_id -> list of records

    for item in payload.items:
        news_item = items_map.get(item.news_item_id)
        officer = officers_map.get(item.officer_id)

        if not news_item or not officer:
            continue

        message_text = generate_whatsapp_message(news_item, officer, item.remarks)
        try:
            dispatch_record = db.create_dispatch(
                news_item_id=item.news_item_id,
                officer_id=item.officer_id,
                remarks=item.remarks,
                message_text=message_text
            )
            results.append({"news_item_id": item.news_item_id, "status": "success"})
            
            if dispatch_record:
                if item.news_item_id not in grouped_dispatches:
                    grouped_dispatches[item.news_item_id] = []
                grouped_dispatches[item.news_item_id].append(dispatch_record)
        except Exception as e:
            results.append({"news_item_id": item.news_item_id, "status": "failed", "error": str(e)})

    # Sync bulk dispatches to Google Sheets in background
    if grouped_dispatches:
        from backend.sheets import sync_to_google_sheet
        for nid, records in grouped_dispatches.items():
            news_item = items_map.get(nid)
            if news_item:
                first_remarks = records[0].get("remarks", "")
                background_tasks.add_task(
                    sync_to_google_sheet,
                    news_item,
                    records,
                    officers_map,
                    first_remarks
                )

    return {"dispatched_count": len([r for r in results if r["status"] == "success"]), "results": results}


@app.get("/dispatched")
def get_dispatched(
    officer_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    try:
        dispatched_items = db.get_dispatched(
            officer_id=officer_id,
            department=department,
            date_from=date_from,
            date_to=date_to
        )
        return dispatched_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- OFFICERS DIRECTORY ENDPOINTS ---

@app.get("/officers")
def get_officers():
    try:
        officers_list = db.get_officers()
        grouped = {
            "additional_commissioner": [],
            "joint_commissioner": [],
            "zonal_commissioner": [],
            "superintending_engineer": []
        }
        for o in officers_list:
            o_type = o.get("officer_type")
            if o_type in grouped:
                grouped[o_type].append(o)
        return grouped
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/officers")
def create_new_officer(officer: OfficerCreateSchema):
    try:
        new_off = db.create_officer(officer.dict())
        return new_off
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create officer: {str(e)}")


@app.put("/officers/{id}")
def update_officer_details(id: str, updates: OfficerUpdateSchema):
    try:
        filtered_updates = {k: v for k, v in updates.dict().items() if v is not None}
        updated = db.update_officer(id, filtered_updates)
        if not updated:
            raise HTTPException(status_code=404, detail="Officer not found.")
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/officers/{id}")
def delete_officer_record(id: str):
    success = db.delete_officer(id)
    if not success:
        raise HTTPException(status_code=404, detail="Officer not found or delete failed.")
    return {"message": "Officer deleted successfully."}


# --- DOMAIN MAPPINGS ENDPOINTS ---

@app.get("/domain-mappings")
def get_domain_mappings_list():
    try:
        return db.get_domain_mappings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/domain-mappings")
def update_domain_mappings_list(payload: DomainMappingSchema):
    try:
        formatted_mappings = [
            {"department": m.department, "suggested_officer_id": m.officer_id}
            for m in payload.mappings
        ]
        success = db.update_domain_mappings(formatted_mappings)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update domain mappings.")
        return {"message": "Domain mappings updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- NEW LIFECYCLE MANAGEMENT ENDPOINTS ---

@app.get("/officer-mapping")
def get_officer_mapping():
    """
    Returns active officers along with their assigned pending or in-progress news items.
    """
    try:
        return db.get_officers_with_active_items()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/news-items/{id}/action")
def update_news_item_lifecycle(id: str, payload: ActionUpdateSchema, background_tasks: BackgroundTasks):
    """
    Updates the news item status (e.g. dispatched, in_progress, resolved).
    If resolved, records dates and calculations.
    """
    try:
        updated_item = db.update_news_item_action(id, payload.status, payload.action_taken_description)
        if not updated_item:
            raise HTTPException(status_code=404, detail="News item not found.")
            
        # Sync resolution details and evidence to Google Sheets
        if payload.status == "resolved":
            evidence_list = db.get_evidence_for_item(id)
            from backend.sheets import sync_resolution_to_google_sheet
            background_tasks.add_task(
                sync_resolution_to_google_sheet,
                id,
                payload.action_taken_description,
                evidence_list
            )
            
        return updated_item
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/news-items/{id}/discard")
def discard_news_item(id: str):
    """
    Updates the news item status to 'discarded'.
    """
    try:
        updated_item = db.update_news_item_action(id, "discarded", "Discarded by Commissioner")
        if not updated_item:
            raise HTTPException(status_code=444, detail="News item not found.")
        return updated_item
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/news-items/{id}/evidence")
async def upload_news_item_evidence(id: str, files: List[UploadFile] = File(...)):
    """
    Accepts one or more file uploads, stores them in mcl-evidence storage, and creates evidence links in DB.
    """
    try:
        uploaded_records = []
        for file in files:
            file_data = await file.read()
            
            # Store PDF or Photo in Supabase Storage and get public URL
            public_url = db.upload_evidence_to_storage(file.filename, file_data)
            
            # Identify file type
            file_type = "pdf" if file.filename.lower().endswith(".pdf") else "photo"
            
            # Insert metadata record
            record = db.create_evidence(
                news_item_id=id,
                file_type=file_type,
                file_url=public_url,
                file_name=file.filename
            )
            uploaded_records.append(record)
            
        return {"message": f"Successfully uploaded {len(uploaded_records)} evidence items", "uploaded_evidence": uploaded_records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest evidence: {str(e)}")


@app.get("/resolved")
def get_resolved_items_list(
    department: Optional[str] = Query(None),
    officer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """
    Retrieves all resolved news items with evidence links attached.
    """
    try:
        items = db.get_resolved_items(
            department=department,
            officer_id=officer_id,
            search=search
        )
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/overview-stats")
def get_overview_stats(
    scope: str = Query("month"),
    selected_date: Optional[str] = Query(None, alias="date"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """
    Computes dashboard aggregate stats for 'today', 'month', 'all', a specific date,
    or a date range based on verified dispatched items.
    Excludes pending un-dispatched news and discarded administrative/political noise.
    """
    try:
        # Sanitize parameters if called directly
        if not isinstance(scope, str):
            scope = "month"
        if not isinstance(selected_date, str):
            selected_date = None
        if not isinstance(date_from, str):
            date_from = None
        if not isinstance(date_to, str):
            date_to = None

        # Load all news items
        all_items = db.get_news_items(status=None, date_str=None)
        
        # Filter strictly to dispatched items (dispatched, in_progress, resolved)
        dispatched_items = [
            x for x in all_items 
            if x.get("status") in ["dispatched", "in_progress", "resolved"]
        ]
        
        now_dt = datetime.now()
        today_str = now_dt.date().isoformat()
        limit_month = now_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Helper to parse database dates safely
        def parse_item_date(val: Any) -> Optional[datetime]:
            if not val:
                return None
            if isinstance(val, datetime):
                return val
            if isinstance(val, date):
                return datetime(val.year, val.month, val.day)
            try:
                val_str = str(val).strip().rstrip("Z")
                clean_str = val_str.split("+")[0].split(".")[0]
                return datetime.fromisoformat(clean_str)
            except:
                return None

        def get_item_date_obj(item: Dict[str, Any]) -> Optional[datetime]:
            return parse_item_date(item.get("dispatched_at")) or parse_item_date(item.get("created_at"))

        def get_item_date_str(item: Dict[str, Any]) -> Optional[str]:
            d = get_item_date_obj(item)
            return d.date().isoformat() if d else None

        scope_clean = scope.lower().strip()
        target_items = []
        effective_scope = scope_clean

        if selected_date:
            effective_scope = f"date:{selected_date}"
            target_items = [x for x in dispatched_items if get_item_date_str(x) == selected_date]
        elif date_from or date_to:
            effective_scope = "custom"
            for x in dispatched_items:
                d_str = get_item_date_str(x)
                if d_str:
                    if date_from and d_str < date_from:
                        continue
                    if date_to and d_str > date_to:
                        continue
                    target_items.append(x)
        elif scope_clean == "today":
            effective_scope = "today"
            target_items = [x for x in dispatched_items if get_item_date_str(x) == today_str]
        elif scope_clean == "all":
            effective_scope = "all"
            target_items = dispatched_items
        else:  # "month"
            effective_scope = "month"
            for x in dispatched_items:
                d = get_item_date_obj(x)
                if d and d >= limit_month:
                    target_items.append(x)

        # 1. Total dispatched items in selected scope
        total_items = len(target_items)

        # 2. Urgent Action Required: High severity items in target scope that are NOT resolved
        urgent_required = len([
            x for x in target_items 
            if x.get("severity") == "High" and x.get("status") != "resolved"
        ])

        # 3. Under Monitoring: items in target scope currently dispatched or in_progress
        under_monitoring = len([
            x for x in target_items 
            if x.get("status") in ["dispatched", "in_progress"]
        ])

        # 4. Resolved items in target scope
        resolved_count = len([
            x for x in target_items 
            if x.get("status") == "resolved"
        ])

        # 4b. Resolved Percentage: cases solved in target scope
        resolved_percentage = 0
        if total_items > 0:
            resolved_percentage = round((resolved_count / total_items) * 100)

        # 5. Marked to Officer Breakdown (Officer-wise complaints with urgency split)
        target_ids = set(x["id"] for x in target_items)
        target_map = {x["id"]: x for x in target_items}
        dispatches = db.get_dispatched()
        
        officer_stats: Dict[str, Dict[str, Any]] = {}
        if target_ids:
            for d in dispatches:
                nid = d.get("news_item_id")
                if nid in target_ids:
                    off = d.get("officer", {})
                    o_name = off.get("full_name")
                    if not o_name:
                        continue
                    if o_name not in officer_stats:
                        officer_stats[o_name] = {
                            "officer_name": o_name,
                            "short_code": off.get("short_code", ""),
                            "designation": off.get("designation", ""),
                            "count": 0,
                            "urgent_count": 0,
                            "monitoring_count": 0,
                            "resolved_count": 0
                        }
                    officer_stats[o_name]["count"] += 1
                    item = target_map.get(nid, d.get("news_item", {}))
                    sev = item.get("severity")
                    status = item.get("status")
                    if status == "resolved":
                        officer_stats[o_name]["resolved_count"] += 1
                    elif sev == "High":
                        officer_stats[o_name]["urgent_count"] += 1
                    else:
                        officer_stats[o_name]["monitoring_count"] += 1
        
        officer_breakdown = list(officer_stats.values())
        officer_breakdown.sort(key=lambda x: x["count"], reverse=True)

        # 6. Department-wise Breakdown
        dept_stats: Dict[str, Dict[str, Any]] = {}
        for item in target_items:
            dept = item.get("department", "Other") or "Other"
            if dept not in dept_stats:
                dept_stats[dept] = {
                    "department": dept,
                    "count": 0,
                    "urgent_count": 0,
                    "monitoring_count": 0,
                    "resolved_count": 0
                }
            dept_stats[dept]["count"] += 1
            sev = item.get("severity")
            status = item.get("status")
            if status == "resolved":
                dept_stats[dept]["resolved_count"] += 1
            elif sev == "High":
                dept_stats[dept]["urgent_count"] += 1
            else:
                dept_stats[dept]["monitoring_count"] += 1
        
        department_breakdown = list(dept_stats.values())
        department_breakdown.sort(key=lambda x: x["count"], reverse=True)

        # 7. Urgency Trend: Counts per day
        trend_list = []
        if selected_date or scope_clean == "today":
            try:
                anchor_date = datetime.fromisoformat(selected_date).date() if selected_date else now_dt.date()
            except:
                anchor_date = now_dt.date()
            start_date = anchor_date - timedelta(days=6)
            for d_offset in range(7):
                curr_date = start_date + timedelta(days=d_offset)
                curr_date_str = curr_date.isoformat()
                high_count = sum(1 for item in dispatched_items if get_item_date_str(item) == curr_date_str and item.get("severity") == "High")
                med_count = sum(1 for item in dispatched_items if get_item_date_str(item) == curr_date_str and item.get("severity") == "Medium")
                trend_list.append({"date": curr_date_str, "critical_count": high_count, "watch_count": med_count})
        elif date_from or date_to:
            try:
                start_d = datetime.fromisoformat(date_from).date() if date_from else (now_dt - timedelta(days=14)).date()
                end_d = datetime.fromisoformat(date_to).date() if date_to else now_dt.date()
            except:
                start_d = (now_dt - timedelta(days=14)).date()
                end_d = now_dt.date()
            num_days = min(max((end_d - start_d).days + 1, 1), 60)
            for d_offset in range(num_days):
                curr_date = start_d + timedelta(days=d_offset)
                curr_date_str = curr_date.isoformat()
                high_count = sum(1 for item in dispatched_items if get_item_date_str(item) == curr_date_str and item.get("severity") == "High")
                med_count = sum(1 for item in dispatched_items if get_item_date_str(item) == curr_date_str and item.get("severity") == "Medium")
                trend_list.append({"date": curr_date_str, "critical_count": high_count, "watch_count": med_count})
        elif scope_clean == "all":
            start_date = (now_dt - timedelta(days=29)).date()
            for d_offset in range(30):
                curr_date = start_date + timedelta(days=d_offset)
                curr_date_str = curr_date.isoformat()
                high_count = sum(1 for item in target_items if get_item_date_str(item) == curr_date_str and item.get("severity") == "High")
                med_count = sum(1 for item in target_items if get_item_date_str(item) == curr_date_str and item.get("severity") == "Medium")
                trend_list.append({"date": curr_date_str, "critical_count": high_count, "watch_count": med_count})
        else:  # "month"
            days_in_month = now_dt.day
            for d_offset in range(days_in_month):
                curr_date = (limit_month + timedelta(days=d_offset)).date()
                curr_date_str = curr_date.isoformat()
                high_count = sum(1 for item in target_items if get_item_date_str(item) == curr_date_str and item.get("severity") == "High")
                med_count = sum(1 for item in target_items if get_item_date_str(item) == curr_date_str and item.get("severity") == "Medium")
                trend_list.append({"date": curr_date_str, "critical_count": high_count, "watch_count": med_count})

        return {
            "scope": effective_scope,
            "selected_date": selected_date,
            "date_from": date_from,
            "date_to": date_to,
            "total_items": total_items,
            "total_items_month": total_items,  # backward compatibility
            "urgent_required": urgent_required,
            "under_monitoring": under_monitoring,
            "resolved_count": resolved_count,
            "resolved_month": resolved_count,  # backward compatibility
            "resolved_percentage": resolved_percentage,
            "marked_to_officer_breakdown": officer_breakdown,
            "department_breakdown": department_breakdown,
            "urgency_trend_month": trend_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sentiment-analysis")
def get_sentiment_analysis(
    date_str: Optional[str] = Query(None, alias="date"),
    department: Optional[str] = Query(None),
    generate_ai: bool = Query(True)
):
    """
    Computes comprehensive AI Sentiment Analysis, District Media Mood Index,
    most suffering wards by domain, and commissioner directives based on dispatched items.
    Excludes un-dispatched pending news items and discarded administrative/political noise.
    """
    try:
        from backend.sentiment import calculate_sentiment_metrics, generate_ai_sentiment_synthesis
        
        # Load items
        if date_str and date_str.lower() in ["all", "none", ""]:
            date_str = None
            
        all_items = db.get_news_items(
            date_str=date_str,
            department=department if department and department != "All" else None,
            status=None
        )
        
        # Filter strictly to dispatched items (dispatched, in_progress, resolved)
        items = [
            x for x in all_items 
            if x.get("status") in ["dispatched", "in_progress", "resolved"]
        ]
        
        metrics = calculate_sentiment_metrics(items)
        
        sample_headlines = [item.get("headline", "") for item in items if item.get("headline")]
        
        ai_synthesis = None
        if generate_ai and len(items) > 0:
            ai_synthesis = generate_ai_sentiment_synthesis(metrics, sample_headlines)
            
        return {
            "success": True,
            "metrics": metrics,
            "ai_synthesis": ai_synthesis,
            "queried_count": len(items)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cleanup-duplicates")
@app.get("/cleanup-duplicates")
def cleanup_duplicates(dry_run: bool = Query(False)):
    """
    Executes automated semantic incident clustering and purge of duplicate news items.
    If dry_run=True, returns audit preview without modifying database.
    """
    try:
        from backend.dedup import execute_database_cleanup
        result = execute_database_cleanup(dry_run=dry_run)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
