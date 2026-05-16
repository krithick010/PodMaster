"""
Result Service
Computes results (CPU-intensive) and communicates with student-portal
Creates cross-namespace network traffic for dependency mapping
"""

import time
import numpy as np
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

# Service endpoints
STUDENT_PORTAL_URL = "http://student-portal:5000"


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "result-service"})


@app.route("/results", methods=["GET"])
def get_results():
    """Get precomputed results."""
    return jsonify({
        "results": [
            {"student_id": i, "gpa": 3.5 + (i % 4) * 0.1}
            for i in range(1, 11)
        ]
    })


@app.route("/results/compute", methods=["POST"])
def compute_results():
    """Compute results using CPU-intensive operations."""
    try:
        # Fetch students from student-portal (cross-namespace communication)
        response = requests.get(
            f"{STUDENT_PORTAL_URL}/students",
            timeout=5,
        )
        students = response.json().get("students", [])

        # CPU-intensive computation: matrix operations
        start_time = time.time()

        matrix_size = 500
        matrix_a = np.random.rand(matrix_size, matrix_size)
        matrix_b = np.random.rand(matrix_size, matrix_size)

        # Perform multiple matrix multiplications (CPU spike)
        result = matrix_a
        for _ in range(5):
            result = np.dot(result, matrix_b)

        computation_time = time.time() - start_time

        # Compute GPAs
        results = []
        for student in students:
            student_id = student.get("id", 0)
            # Use random matrix result for GPA calculation
            gpa = 2.0 + (student_id % 10) * 0.2
            results.append({
                "student_id": student_id,
                "student_name": student.get("name", "Unknown"),
                "gpa": round(min(gpa, 4.0), 2),
            })

        return jsonify({
            "status": "computed",
            "student_count": len(results),
            "computation_time_seconds": computation_time,
            "results": results,
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": f"Could not fetch students: {str(e)}",
        }), 503
    except Exception as e:
        return jsonify({
            "error": str(e),
        }), 500


@app.route("/", methods=["GET"])
def index():
    """Root endpoint."""
    return jsonify({
        "service": "result-service",
        "student_portal_url": STUDENT_PORTAL_URL,
        "endpoints": {
            "/health": "Health check",
            "/results": "Get precomputed results (GET)",
            "/results/compute": "Compute results CPU-intensive (POST)",
        },
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
