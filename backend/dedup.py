import re
import json
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import backend.database as db

# Stopwords & common generic words to ignore during similarity computation
STOPWORDS = {
    "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by", 
    "is", "was", "are", "were", "been", "be", "has", "have", "had", "will", "would",
    "mc", "mcl", "ludhiana", "punjab", "nagar", "nigam", "municipal", "corporation",
    "news", "report", "city", "area", "ward", "officer", "authorities", "people", "residents",
    "case", "action", "over", "after", "into", "from", "about", "took", "take", "alleged", "allegations"
}

def clean_and_tokenize(text: str) -> List[str]:
    """Cleans and extracts meaningful lowercase word tokens."""
    if not text:
        return []
    words = re.findall(r'\b\w+\b', text.lower())
    return [w for w in words if len(w) > 2 and w not in STOPWORDS]

def compute_jaccard_similarity(tokens1: List[str], tokens2: List[str]) -> float:
    """Computes Jaccard similarity coefficient between two token lists."""
    if not tokens1 or not tokens2:
        return 0.0
    set1, set2 = set(tokens1), set(tokens2)
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return len(intersection) / len(union) if union else 0.0

def compute_token_overlap_ratio(tokens1: List[str], tokens2: List[str]) -> float:
    """Computes overlap ratio relative to smaller token set."""
    if not tokens1 or not tokens2:
        return 0.0
    set1, set2 = set(tokens1), set(tokens2)
    intersection = set1.intersection(set2)
    min_len = min(len(set1), len(set2))
    return len(intersection) / min_len if min_len > 0 else 0.0

def are_items_duplicate(item1: Dict[str, Any], item2: Dict[str, Any]) -> Tuple[bool, float, str]:
    """
    Evaluates whether two news items refer to the exact same real-world incident.
    Returns: (is_duplicate: bool, confidence_score: float, reason: str)
    """
    dept1 = item1.get("department", "")
    dept2 = item2.get("department", "")

    h1 = item1.get("headline", "")
    h2 = item2.get("headline", "")

    s1 = item1.get("summary")
    s2 = item2.get("summary")
    
    what1 = s1.get("what", "") if isinstance(s1, dict) else str(s1 or "")
    what2 = s2.get("what", "") if isinstance(s2, dict) else str(s2 or "")
    
    where1 = s1.get("where", "") if isinstance(s1, dict) else ""
    where2 = s2.get("where", "") if isinstance(s2, dict) else ""

    text1 = f"{h1} {what1} {where1}".lower()
    text2 = f"{h2} {what2} {where2}".lower()

    # Exact headline match
    if h1.strip().lower() == h2.strip().lower() and len(h1) > 10:
        return True, 1.0, "Exact headline match"

    # --- SPECIFIC MUNICIPAL LUDHIANA INCIDENT CLUSTER PATTERNS ---

    # 1. ATP / Building Inspector Dilip Soni / 5 Lakh Bribe in Sunder Nagar / Noorwala Road
    atp_kw1 = any(k in text1 for k in ["atp", "dilip soni", "dalip soni", "inspector soni", "quack atp", "fake atp", "fraudulent atp", "arun sharma", "5 lakh", "sweet shop", "multi-storey building", "multi storey"])
    atp_kw2 = any(k in text2 for k in ["atp", "dilip soni", "dalip soni", "inspector soni", "quack atp", "fake atp", "fraudulent atp", "arun sharma", "5 lakh", "sweet shop", "multi-storey building", "multi storey"])
    atp_loc1 = any(k in text1 for k in ["sundar nagar", "sunder nagar", "noorwala", "bribe", "suspended", "human rights commission"])
    atp_loc2 = any(k in text2 for k in ["sundar nagar", "sunder nagar", "noorwala", "bribe", "suspended", "human rights commission"])

    if (atp_kw1 and atp_loc1) and (atp_kw2 and atp_loc2):
        return True, 0.98, "Matched Sunder Nagar / ATP 5 Lakh Bribery & Suspension Cluster"

    # 2. CVO / Vigilance Building Plan Approval 1-Year Pending Report
    cvo_kw1 = any(k in text1 for k in ["year after complaint", "year on", "cvo", "chief vigilance office", "building plan violation", "plan approval case"])
    cvo_kw2 = any(k in text2 for k in ["year after complaint", "year on", "cvo", "chief vigilance office", "building plan violation", "plan approval case"])
    if cvo_kw1 and cvo_kw2:
        return True, 0.96, "Matched Commercial Building Plan CVO Inquiry Cluster"

    # 3. Super Suction Machine Tender Scam / Work Orders Without Tender
    ss_kw1 = "super suction" in text1 or ("sewer cleaning contracts" in text1 and "tender" in text1)
    ss_kw2 = "super suction" in text2 or ("sewer cleaning contracts" in text2 and "tender" in text2)
    if ss_kw1 and ss_kw2:
        return True, 0.96, "Matched Super Suction Machine Tender Irregularity Cluster"

    # 4. Ferozepur Road Underpass Rs 400 Crore Drainage Failure
    fzp_kw1 = ("ferozepur road" in text1 or "underpass" in text1) and ("400 crore" in text1 or "drainage issue" in text1)
    fzp_kw2 = ("ferozepur road" in text2 or "underpass" in text2) and ("400 crore" in text2 or "drainage issue" in text2)
    if fzp_kw1 and fzp_kw2:
        return True, 0.95, "Matched Ferozepur Road Underpass 400-Crore Drainage Cluster"

    # 5. Rahon Road Potholes / Dana Mandi to Meharban Stretch
    rahon_kw1 = "rahon road" in text1 and any(k in text1 for k in ["pothole", "crater", "dana mandi", "meharban", "baldev nagar", "poor condition", "block"])
    rahon_kw2 = "rahon road" in text2 and any(k in text2 for k in ["pothole", "crater", "dana mandi", "meharban", "baldev nagar", "poor condition", "block"])
    if rahon_kw1 and rahon_kw2:
        return True, 0.94, "Matched Rahon Road Dilapidated Stretch Cluster"

    # 6. Buddha Nullah Desilting / Toxic Sludge Overflow in Haibowal/Shivpuri
    nullah_kw1 = any(k in text1 for k in ["budha nullah", "buddha nullah", "budha dariya", "buddha dariya"]) and any(k in text1 for k in ["desilting", "sludge", "overflow", "haibowal", "shivpuri", "chand cinema"])
    nullah_kw2 = any(k in text2 for k in ["budha nullah", "buddha nullah", "budha dariya", "buddha dariya"]) and any(k in text2 for k in ["desilting", "sludge", "overflow", "haibowal", "shivpuri", "chand cinema"])
    if nullah_kw1 and nullah_kw2:
        return True, 0.92, "Matched Buddha Nullah Desilting & Overflow Cluster"

    # 7. Model Town Market Park / Green Belt Maintenance
    mt_kw1 = "model town" in text1 and any(k in text1 for k in ["park", "green belt", "plants", "horticulture"])
    mt_kw2 = "model town" in text2 and any(k in text2 for k in ["park", "green belt", "plants", "horticulture"])
    if mt_kw1 and mt_kw2:
        return True, 0.90, "Matched Model Town Market Green Belt Cluster"

    # 8. Pindi Gali / Bijli Market Street Vendor Encroachments
    pindi_kw1 = any(k in text1 for k in ["pindi gali", "bijli market"]) and "encroachment" in text1
    pindi_kw2 = any(k in text2 for k in ["pindi gali", "bijli market"]) and "encroachment" in text2
    if pindi_kw1 and pindi_kw2:
        return True, 0.92, "Matched Pindi Gali / Bijli Market Encroachment Cluster"

    # --- GENERAL TOKEN SIMILARITY ---
    tokens1 = clean_and_tokenize(h1 + " " + what1)
    tokens2 = clean_and_tokenize(h2 + " " + what2)

    jaccard = compute_jaccard_similarity(tokens1, tokens2)
    overlap = compute_token_overlap_ratio(tokens1, tokens2)

    # Department match + high token overlap
    if dept1 == dept2 and dept1 != "Public Grievance Redressal / IT Cell":
        if jaccard >= 0.50 or (overlap >= 0.65 and len(tokens1) >= 4 and len(tokens2) >= 4):
            return True, round(max(jaccard, overlap), 2), f"High semantic token overlap ({round(max(jaccard, overlap)*100)}%)"

    if jaccard >= 0.62 or overlap >= 0.78:
        return True, round(max(jaccard, overlap), 2), f"Strong textual similarity ({round(max(jaccard, overlap)*100)}%)"

    return False, 0.0, "Different incidents"


def cluster_and_deduplicate(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Groups all items into unique Incident Clusters and identifies master vs duplicate records.
    """
    visited = set()
    clusters: List[Dict[str, Any]] = []

    # Priority sorting: Dispatched / Resolved items prioritized as Master
    def item_priority(it):
        status_weight = 3 if it.get("status") in ["dispatched", "resolved"] else 1
        body_len = len(it.get("body", "") or "")
        summary_len = len(str(it.get("summary", "") or ""))
        return (status_weight, body_len + summary_len)

    sorted_items = sorted(items, key=item_priority, reverse=True)

    for i, item in enumerate(sorted_items):
        item_id = item.get("id")
        if not item_id or item_id in visited:
            continue

        cluster_items = [item]
        visited.add(item_id)
        cluster_reasons = []

        for j in range(i + 1, len(sorted_items)):
            other = sorted_items[j]
            other_id = other.get("id")
            if not other_id or other_id in visited:
                continue

            is_dup, score, reason = are_items_duplicate(item, other)
            if is_dup:
                cluster_items.append(other)
                visited.add(other_id)
                cluster_reasons.append(f"{reason} (conf: {score})")

        # Master record selection
        master_item = cluster_items[0]
        duplicate_items = cluster_items[1:]

        # Aggregate publications & page numbers
        pubs = []
        for it in cluster_items:
            pub_name = it.get("publication", "Unknown")
            p_num = it.get("page_number", 1)
            pubs.append(f"{pub_name} (p.{p_num})")
        
        unique_pubs = list(dict.fromkeys(pubs))

        clusters.append({
            "master_id": master_item["id"],
            "master_headline": master_item.get("headline", ""),
            "department": master_item.get("department", ""),
            "severity": master_item.get("severity", "Medium"),
            "status": master_item.get("status", "pending"),
            "created_at": master_item.get("created_at"),
            "total_coverage_count": len(cluster_items),
            "duplicate_count": len(duplicate_items),
            "duplicate_ids": [d["id"] for d in duplicate_items],
            "publications": unique_pubs,
            "match_reasons": cluster_reasons[:3]
        })

    total_original = len(items)
    unique_incidents = len(clusters)
    total_duplicates_identified = sum(c["duplicate_count"] for c in clusters)
    dedup_ratio = round((total_duplicates_identified / total_original * 100), 1) if total_original > 0 else 0

    return {
        "total_original_items": total_original,
        "unique_master_incidents": unique_incidents,
        "total_duplicates_identified": total_duplicates_identified,
        "deduplication_ratio_percent": dedup_ratio,
        "clusters": clusters
    }


def execute_database_cleanup(dry_run: bool = True) -> Dict[str, Any]:
    """
    Scans database, groups duplicate articles, consolidates multi-publication sources,
    and purges duplicate records.
    """
    items = db.get_news_items(date_str=None, status=None)
    analysis = cluster_and_deduplicate(items)

    if dry_run:
        return {
            "status": "DRY_RUN_COMPLETED",
            "message": f"Preview: Identified {analysis['total_duplicates_identified']} duplicate items across {analysis['unique_master_incidents']} unique incidents. No records were deleted.",
            "metrics": {
                "total_items": analysis["total_original_items"],
                "unique_incidents": analysis["unique_master_incidents"],
                "duplicates_to_remove": analysis["total_duplicates_identified"],
                "reduction_percentage": analysis["deduplication_ratio_percent"]
            },
            "sample_merged_clusters": [c for c in analysis["clusters"] if c["duplicate_count"] > 0][:15]
        }

    # Live Execution
    all_duplicate_ids_to_delete = []
    updated_master_count = 0

    for c in analysis["clusters"]:
        master_id = c["master_id"]
        dup_ids = c["duplicate_ids"]

        if dup_ids:
            all_duplicate_ids_to_delete.extend(dup_ids)
            
            # Enrich master record summary with multi-source coverage metadata
            try:
                if db.supabase:
                    curr = db.supabase.table("mcl_news_items").select("summary").eq("id", master_id).execute()
                    if curr.data:
                        s_data = curr.data[0].get("summary")
                        if isinstance(s_data, str):
                            try:
                                s_dict = json.loads(s_data)
                            except:
                                s_dict = {"what": s_data}
                        elif isinstance(s_data, dict):
                            s_dict = dict(s_data)
                        else:
                            s_dict = {}

                        s_dict["media_coverage_count"] = c["total_coverage_count"]
                        s_dict["publications_reported"] = c["publications"]
                        
                        db.supabase.table("mcl_news_items").update({
                            "summary": json.dumps(s_dict) if isinstance(s_data, str) else s_dict
                        }).eq("id", master_id).execute()
                        updated_master_count += 1
            except Exception as update_err:
                print(f"Failed to update master item {master_id}: {update_err}")

    # Delete duplicates in chunks
    deleted_count = 0
    if all_duplicate_ids_to_delete:
        chunk_size = 50
        for i in range(0, len(all_duplicate_ids_to_delete), chunk_size):
            chunk = all_duplicate_ids_to_delete[i:i+chunk_size]
            if db.supabase:
                try:
                    db.supabase.table("mcl_news_items").delete().in_("id", chunk).execute()
                    deleted_count += len(chunk)
                except Exception as del_err:
                    print(f"Error deleting duplicate chunk: {del_err}")
            else:
                for d_id in chunk:
                    if d_id in db.mock_db["news_items"]:
                        del db.mock_db["news_items"][d_id]
                        deleted_count += 1

    return {
        "status": "CLEANUP_SUCCESSFUL",
        "message": f"Successfully merged and purged {deleted_count} duplicate records. Database now contains {analysis['unique_master_incidents']} clean unique incidents.",
        "metrics": {
            "initial_items_count": analysis["total_original_items"],
            "cleaned_items_count": analysis["unique_master_incidents"],
            "deleted_duplicate_records": deleted_count,
            "updated_master_records": updated_master_count,
            "reduction_percentage": analysis["deduplication_ratio_percent"]
        },
        "sample_cleaned_clusters": [c for c in analysis["clusters"] if c["duplicate_count"] > 0][:15]
    }
