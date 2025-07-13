from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import os
import csv
import psycopg2
from datetime import datetime

# Initialize FastAPI app
app = FastAPI(title="Clinical Data ETL Service", version="1.0.0")

# In-memory job tracker (for demo purposes; not persistent)
jobs: Dict[str, Dict[str, Any]] = {}

# -------------------------------
# Models for Request & Response
# -------------------------------
class ETLJobRequest(BaseModel):
    jobId: str
    filename: str
    studyId: Optional[str] = None

class ETLJobResponse(BaseModel):
    jobId: str
    status: str
    message: str

class ETLJobStatus(BaseModel):
    jobId: str
    status: str
    progress: Optional[int] = None
    message: Optional[str] = None

# -------------------------------
# Health Check Endpoint
# -------------------------------
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "etl"}

# -------------------------------
# Submit a new ETL job
# -------------------------------
@app.post("/jobs", response_model=ETLJobResponse)
async def submit_job(job_request: ETLJobRequest):
    job_id = job_request.jobId
    filename = job_request.filename
    study_id = job_request.studyId or "unknown"

    # Initialize job status in memory
    jobs[job_id] = {
        "status": "running",
        "progress": 0,
        "message": "Starting job"
    }

    try:
        # Connect to PostgreSQL using DATABASE_URL environment variable
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()

        # Read and parse the input CSV file
        csv_path = f"/app/data/{filename}"
        with open(csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            count = 0

            for row in reader:
                # Insert each row into the clinical_measurements table
                cur.execute("""
                    INSERT INTO clinical_measurements (
                        id, study_id, participant_id, measurement_type,
                        value, unit, timestamp, site_id, quality_score, processed_at
                    ) VALUES (
                        gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    row.get('study_id'),
                    row.get('participant_id'),
                    row.get('measurement_type'),
                    row.get('value'),
                    row.get('unit'),
                    row.get('timestamp'),
                    row.get('site_id'),
                    100,  # Assign default quality score
                    datetime.utcnow()  # Add processed timestamp
                ))
                count += 1

        # Commit DB changes
        conn.commit()
        cur.close()
        conn.close()

        # Update job status to completed
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = f"Inserted {count} rows into clinical_measurements"

        return ETLJobResponse(
            jobId=job_id,
            status="completed",
            message=f"ETL completed successfully with {count} records"
        )

    except Exception as e:
        # In case of any failure
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = str(e)
        return ETLJobResponse(
            jobId=job_id,
            status="failed",
            message=f"ETL failed: {str(e)}"
        )

# -------------------------------
# Get Status of ETL Job by ID
# -------------------------------
@app.get("/jobs/{job_id}/status", response_model=ETLJobStatus)
async def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "jobId": job_id,
        "status": jobs[job_id]["status"],
        "progress": jobs[job_id].get("progress", 0),
        "message": jobs[job_id].get("message", "")
    }
