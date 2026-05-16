"""
Attendance Service
Tracks attendance and writes to PVC mount for storage testing
"""

import csv
import os
from datetime import datetime
from flask import Flask, jsonify, request

app = Flask(__name__)

# PVC mount path
PVC_PATH = os.getenv("PVC_PATH", "/data/attendance")


def ensure_pvc_path():
    """Ensure PVC directory exists."""
    os.makedirs(PVC_PATH, exist_ok=True)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "attendance-service"})


@app.route("/attendance", methods=["GET"])
def get_attendance():
    """Get all attendance records."""
    ensure_pvc_path()
    records = []
    csv_file = os.path.join(PVC_PATH, "log.csv")

    if os.path.exists(csv_file):
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            records = list(reader) if reader else []

    return jsonify({"records": records, "count": len(records)})


@app.route("/attendance/mark", methods=["POST"])
def mark_attendance():
    """Mark attendance for a student."""
    ensure_pvc_path()

    data = request.get_json()
    student_id = data.get("student_id")
    status = data.get("status", "present")

    csv_file = os.path.join(PVC_PATH, "log.csv")

    # Write to CSV
    with open(csv_file, "a", newline="") as f:
        writer = csv.writer(f)
        # Write header if file is new
        if os.path.getsize(csv_file) == 0:
            writer.writerow(["timestamp", "student_id", "status"])
        writer.writerow([datetime.utcnow().isoformat(), student_id, status])

    return jsonify({
        "status": "recorded",
        "student_id": student_id,
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.route("/stress", methods=["POST"])
def storage_stress():
    """Write large amounts of data to trigger storage pressure."""
    ensure_pvc_path()

    # Write 50MB of data
    stress_file = os.path.join(PVC_PATH, f"stress_{datetime.utcnow().timestamp()}.bin")

    try:
        with open(stress_file, "wb") as f:
            # Write 50MB in chunks
            chunk_size = 1024 * 1024  # 1MB
            for _ in range(50):
                f.write(b"X" * chunk_size)

        return jsonify({
            "status": "complete",
            "file": stress_file,
            "size_mb": 50,
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
        }), 500


@app.route("/", methods=["GET"])
def index():
    """Root endpoint."""
    return jsonify({
        "service": "attendance-service",
        "pvc_path": PVC_PATH,
        "endpoints": {
            "/health": "Health check",
            "/attendance": "List attendance records (GET)",
            "/attendance/mark": "Mark attendance (POST)",
            "/stress": "Write large data to PVC (POST)",
        },
    })


if __name__ == "__main__":
    ensure_pvc_path()
    app.run(host="0.0.0.0", port=5001)
