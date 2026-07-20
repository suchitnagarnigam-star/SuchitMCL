import os
import requests
from datetime import datetime
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from backend.config import settings

def sync_to_google_sheet(news_item: dict, dispatches: list, officers_map: dict, remarks: str):
    """
    Syncs the dispatched news item and its assignees to Google Sheets.
    Creates a new row with details.
    """
    dispatched_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    headline = news_item.get("headline", "")
    department = news_item.get("department", "")
    news_item_id = news_item.get("id")
    
    # Extract AI summary (what column)
    summary_text = ""
    summary = news_item.get("summary")
    if isinstance(summary, dict):
      summary_text = summary.get("what", "")
    elif isinstance(summary, str):
      summary_text = summary
      
    # Compile assignees list: "Name (Short Code)"
    assignees_list = []
    for d in dispatches:
        off_id = d.get("officer_id")
        officer = officers_map.get(off_id)
        if officer:
            assignees_list.append(f"{officer['full_name']} ({officer['short_code']})")
    assignees = ", ".join(assignees_list)

    row_data = {
        "action": "create",
        "news_item_id": news_item_id,
        "dispatched_at": dispatched_at,
        "department": department,
        "assignees": assignees,
        "headline": headline,
        "summary": summary_text,
        "remarks": remarks or "",
        "tab_name": settings.GOOGLE_SHEET_TAB_NAME
    }

    # METHOD A: Google Apps Script Webhook URL (Easiest)
    webhook_url = settings.GOOGLE_SHEET_WEBHOOK_URL
    if webhook_url:
        print(f"[Sheets Sync] Sending POST (create) to Apps Script Webhook...")
        try:
            res = requests.post(webhook_url, json=row_data, timeout=10)
            if res.status_code == 200:
                print("[Sheets Sync] Webhook append successful.")
                return True
            else:
                print(f"[Sheets Sync] Webhook returned status code {res.status_code}: {res.text}")
        except Exception as err:
            print(f"[Sheets Sync] Webhook request error: {err}")

    # METHOD B: Google Sheets API Service Account (Native)
    sheet_id = settings.GOOGLE_SHEET_ID
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    
    if sheet_id and os.path.exists(credentials_path):
        print(f"[Sheets Sync] Appending row to sheet {sheet_id} via API...")
        try:
            scopes = ["https://www.googleapis.com/auth/spreadsheets"]
            creds = Credentials.from_service_account_file(credentials_path, scopes=scopes)
            service = build("sheets", "v4", credentials=creds)
            
            # Format row matching requested columns:
            # Date, Department, Assigned Officer, Headline, Summary, Remarks, Action Taken (blank), Upload ATR (blank), ID
            values = [[
                dispatched_at,
                department,
                assignees,
                headline,
                summary_text,
                remarks or "",
                "", # Action Taken (blank)
                "", # Upload ATR (blank)
                news_item_id
            ]]
            
            body = {
                "values": values
            }
            
            # Append to sheet
            result = service.spreadsheets().values().append(
                spreadsheetId=sheet_id,
                range=f"{settings.GOOGLE_SHEET_TAB_NAME}!A:I",
                valueInputOption="RAW",
                insertDataOption="INSERT_ROWS",
                body=body
            ).execute()
            
            print(f"[Sheets Sync] API write successful: {result.get('updates')}")
            return True
        except Exception as err:
            print(f"[Sheets Sync] API write error: {err}")
            
    if not webhook_url and not sheet_id:
        print("[Sheets Sync] Skip sync: Neither GOOGLE_SHEET_WEBHOOK_URL nor GOOGLE_SHEET_ID is configured in environment.")
        
    return False


def sync_resolution_to_google_sheet(news_item_id: str, action_taken_description: str, evidence_list: list):
    """
    Updates the Google Sheet row matching news_item_id with resolution details.
    """
    evidence_urls = ", ".join([ev.get("file_url", "") for ev in evidence_list])
    
    row_data = {
        "action": "update",
        "news_item_id": news_item_id,
        "action_taken": action_taken_description,
        "evidence_urls": evidence_urls,
        "tab_name": settings.GOOGLE_SHEET_TAB_NAME
    }
    
    # METHOD A: Webhook
    webhook_url = settings.GOOGLE_SHEET_WEBHOOK_URL
    if webhook_url:
        print(f"[Sheets Sync] Sending POST (update) to Apps Script Webhook...")
        try:
            res = requests.post(webhook_url, json=row_data, timeout=10)
            if res.status_code == 200:
                print("[Sheets Sync] Webhook update successful.")
                return True
            else:
                print(f"[Sheets Sync] Webhook returned status code {res.status_code}: {res.text}")
        except Exception as err:
            print(f"[Sheets Sync] Webhook update error: {err}")
            
    # METHOD B: API
    sheet_id = settings.GOOGLE_SHEET_ID
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    
    if sheet_id and os.path.exists(credentials_path):
        print(f"[Sheets Sync] Searching for row in sheet {sheet_id} via API...")
        try:
            scopes = ["https://www.googleapis.com/auth/spreadsheets"]
            creds = Credentials.from_service_account_file(credentials_path, scopes=scopes)
            service = build("sheets", "v4", credentials=creds)
            
            # Read Column I (News Item ID) to find the row index
            res = service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=f"{settings.GOOGLE_SHEET_TAB_NAME}!I:I"
            ).execute()
            
            rows = res.get("values", [])
            found_idx = -1
            for idx, r in enumerate(rows):
                if r and r[0] == news_item_id:
                    found_idx = idx + 1 # 1-indexed row number
                    break
                    
            if found_idx != -1:
                # Update Column G (Action Taken, index 7) and Column H (Upload ATR, index 8)
                update_body = {
                    "values": [[action_taken_description, evidence_urls]]
                }
                result = service.spreadsheets().values().update(
                    spreadsheetId=sheet_id,
                    range=f"{settings.GOOGLE_SHEET_TAB_NAME}!G{found_idx}:H{found_idx}",
                    valueInputOption="RAW",
                    body=update_body
                ).execute()
                print(f"[Sheets Sync] API update successful: {result.get('updatedCells')} cells updated.")
                return True
            else:
                print(f"[Sheets Sync] API update error: News Item ID {news_item_id} not found in Column I.")
        except Exception as err:
            print(f"[Sheets Sync] API update error: {err}")
            
    return False
