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
    title="Suchit Nagar Nigam API (ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ)",
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
    officer_type: str  # joint_commissioner / zonal_commissioner / superintending_engineer
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
        remarks_block = f"📋 *Commissioner's Remarks:*\n{remarks.strip()}\n\n"

    template = f"""🏛️ *Suchit Nagar Nigam — ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ*
*MCL Media Intelligence Brief*

{short_code} — {full_name}
*Designation:* {desig}

A news item has been flagged and assigned to you by the
Office of the Corporation Commissioner, Ludhiana:

📰 *{headline}*
📅 {today_str} | 📰 {pub}
🏷️ *Department:* {dept}
⚠️ *Severity:* {sev}

*Summary:*
{summary}

{remarks_block}Please take necessary action and update status
on the MCL dashboard at your earliest.

— Office of the Corporation Commissioner
Municipal Corporation Ludhiana"""
    
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
    status: Optional[str] = Query("pending")
):
    if not date_str:
        date_str = date.today().isoformat()
        
    try:
        items = db.get_news_items(
            date_str=date_str,
            department=department,
            severity=severity,
            status=status
        )
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
def get_overview_stats():
    """
    Computes dashboard aggregate stats for the current calendar month.
    """
    try:
        # Load all news items
        all_items = db.get_news_items(status=None, date_str=None)
        
        # Calculate date limits for the current calendar month
        now_dt = datetime.now()
        limit_month = now_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Helper to parse database dates
        def parse_item_date(item_date_str: Optional[str]) -> Optional[datetime]:
            if not item_date_str:
                return None
            try:
                clean_str = item_date_str.split("+")[0].split(".")[0]
                return datetime.fromisoformat(clean_str)
            except:
                return None

        # Filter items for current calendar month
        items_month = []
        for item in all_items:
            c_date = parse_item_date(item.get("created_at"))
            if c_date and c_date >= limit_month:
                items_month.append(item)

        # 1. Total items in the current calendar month
        total_items_month = len(items_month)

        # 2. Urgent Action Required: High severity items that are NOT resolved or discarded
        urgent_required = len([
            x for x in all_items 
            if x.get("severity") == "High" and x.get("status") not in ["resolved", "discarded"]
        ])

        # 3. Under Monitoring: dispatched or in_progress status
        under_monitoring = len([
            x for x in all_items 
            if x.get("status") in ["dispatched", "in_progress"]
        ])

        # 4. Resolved items resolved in the current calendar month
        resolved_month = 0
        for item in all_items:
            if item.get("status") == "resolved":
                res_date = parse_item_date(item.get("resolved_at"))
                if res_date and res_date >= limit_month:
                    resolved_month += 1

        # 4b. Resolved Percentage: items created this month that are resolved
        resolved_percentage = 0
        if total_items_month > 0:
            resolved_created_in_month = len([
                x for x in items_month 
                if x.get("status") == "resolved"
            ])
            resolved_percentage = round((resolved_created_in_month / total_items_month) * 100)

        # 5. Marked to Officer Breakdown
        # Fetch active dispatches
        dispatches = db.get_dispatched()
        officer_counts: Dict[str, int] = {}
        for d in dispatches:
            o_name = d.get("officer", {}).get("full_name")
            if o_name:
                officer_counts[o_name] = officer_counts.get(o_name, 0) + 1
        
        breakdown_list = [
            {"officer_name": name, "count": count}
            for name, count in officer_counts.items()
        ]
        breakdown_list.sort(key=lambda x: x["count"], reverse=True)

        # 6. Urgency Trend: Counts per day for the days of the current calendar month
        trend_list = []
        days_in_month = now_dt.day
        for d_offset in range(days_in_month):
            curr_date = (limit_month + timedelta(days=d_offset)).date()
            curr_date_str = curr_date.isoformat()
            
            # Count items created on this date
            high_count = 0
            med_count = 0
            for item in all_items:
                c_date = parse_item_date(item.get("created_at"))
                if c_date and c_date.date() == curr_date:
                    if item.get("severity") == "High":
                        high_count += 1
                    elif item.get("severity") == "Medium":
                        med_count += 1
                        
            trend_list.append({
                "date": curr_date_str,
                "critical_count": high_count,
                "watch_count": med_count
            })

        # 7. Latest Marked News (dispatched/in_progress/resolved in current month, limit 10)
        marked_news = []
        for item in items_month:
            if item.get("status") in ["dispatched", "in_progress", "resolved"]:
                marked_news.append({
                    "headline": item.get("headline", ""),
                    "department": item.get("department", ""),
                    "date": (parse_item_date(item.get("created_at")) or now_dt).date().isoformat()
                })
        # Sort latest first
        marked_news.sort(key=lambda x: x["date"], reverse=True)
        latest_marked_news = marked_news[:10]

        return {
            "total_items_month": total_items_month,
            "urgent_required": urgent_required,
            "under_monitoring": under_monitoring,
            "resolved_month": resolved_month,
            "resolved_percentage": resolved_percentage,
            "marked_to_officer_breakdown": breakdown_list,
            "urgency_trend_month": trend_list,
            "latest_marked_news": latest_marked_news
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
