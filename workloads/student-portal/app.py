"""
Student Portal Service
University management system demo workload
"""

import sqlite3
import time
from flask import Flask, jsonify, request

app = Flask(__name__)

# Database initialization
def init_db():
    """Initialize SQLite database with sample student data."""
    conn = sqlite3.connect("students.db")
    c = conn.cursor()
    c.execute(
        """CREATE TABLE IF NOT EXISTS students
           (id INTEGER PRIMARY KEY, name TEXT, email TEXT, enrollment_year INTEGER)"""
    )

    # Check if we already have data
    c.execute("SELECT COUNT(*) FROM students")
    if c.fetchone()[0] == 0:
        # Insert sample data
        students = [
            ("Alice Johnson", "alice@university.edu", 2022),
            ("Bob Smith", "bob@university.edu", 2021),
            ("Charlie Brown", "charlie@university.edu", 2023),
            ("Diana Prince", "diana@university.edu", 2022),
            ("Evan Davis", "evan@university.edu", 2021),
            ("Fiona Green", "fiona@university.edu", 2023),
            ("George Wilson", "george@university.edu", 2022),
            ("Hannah Lee", "hannah@university.edu", 2021),
            ("Ivan Martinez", "ivan@university.edu", 2023),
            ("Julia White", "julia@university.edu", 2022),
        ]
        c.executemany(
            "INSERT INTO students (name, email, enrollment_year) VALUES (?, ?, ?)",
            students,
        )

    conn.commit()
    conn.close()


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "student-portal"})


@app.route("/students", methods=["GET"])
def get_students():
    """Get all students."""
    conn = sqlite3.connect("students.db")
    c = conn.cursor()
    c.execute("SELECT id, name, email, enrollment_year FROM students")
    students = [
        {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "enrollment_year": row[3],
        }
        for row in c.fetchall()
    ]
    conn.close()
    return jsonify({"students": students, "count": len(students)})


@app.route("/students/<int:student_id>", methods=["GET"])
def get_student(student_id):
    """Get a specific student."""
    conn = sqlite3.connect("students.db")
    c = conn.cursor()
    c.execute(
        "SELECT id, name, email, enrollment_year FROM students WHERE id = ?",
        (student_id,),
    )
    row = c.fetchone()
    conn.close()

    if row:
        return jsonify({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "enrollment_year": row[3],
        })
    else:
        return jsonify({"error": "Student not found"}), 404


@app.route("/load", methods=["POST"])
def cpu_load():
    """Trigger CPU spike by running compute-intensive loop."""
    duration = int(request.args.get("duration", 30))
    end_time = time.time() + duration

    # Spin CPU
    count = 0
    while time.time() < end_time:
        count += 1
        for _ in range(1000000):
            _ = 2 ** 64

    return jsonify({
        "status": "complete",
        "duration_seconds": duration,
        "iterations": count,
    })


@app.route("/", methods=["GET"])
def index():
    """Root endpoint."""
    return jsonify({
        "service": "student-portal",
        "endpoints": {
            "/health": "Health check",
            "/students": "List all students",
            "/students/<id>": "Get specific student",
            "/load": "Trigger CPU spike (POST)",
        },
    })


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)
