"""
Notification Service
Sends notifications to other services (network-heavy)
Can generate error logs for testing LogIO agent
"""

import logging
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service endpoints
RESULT_SERVICE_URL = "http://result-service:5002"
ATTENDANCE_SERVICE_URL = "http://attendance-service:5001"


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "notification-service"})


@app.route("/notify", methods=["POST"])
def send_notification():
    """Send a notification to other services."""
    data = request.get_json()
    notification_type = data.get("type", "info")
    message = data.get("message", "")

    logger.info(f"Notification [{notification_type}]: {message}")

    # Forward to result-service
    try:
        requests.post(
            f"{RESULT_SERVICE_URL}/results/compute",
            json={"trigger": "notification"},
            timeout=5,
        )
    except Exception as e:
        logger.warning(f"Could not reach result-service: {e}")

    return jsonify({
        "status": "sent",
        "type": notification_type,
        "message": message,
    })


@app.route("/notifications", methods=["GET"])
def get_notifications():
    """Get recent notifications."""
    return jsonify({
        "notifications": [
            {"id": 1, "message": "System started"},
            {"id": 2, "message": "Services healthy"},
        ]
    })


@app.route("/flood", methods=["POST"])
def notification_flood():
    """Send many notifications rapidly (network stress test)."""
    count = int(request.args.get("count", 100))

    for i in range(count):
        try:
            requests.post(
                f"{RESULT_SERVICE_URL}/results/compute",
                json={"id": i},
                timeout=1,
            )
        except Exception as e:
            logger.debug(f"Notification {i} failed: {e}")

    return jsonify({
        "status": "flooded",
        "notifications_sent": count,
    })


@app.route("/break", methods=["POST"])
def trigger_errors():
    """Generate error logs for testing LogIO agent."""
    error_count = int(request.args.get("count", 10))

    for i in range(error_count):
        logger.error(f"INJECTED ERROR #{i}: Simulated application error for testing")
        logger.critical(f"INJECTED CRITICAL #{i}: Critical event for log analysis")

    return jsonify({
        "status": "errors_generated",
        "error_count": error_count,
    })


@app.route("/", methods=["GET"])
def index():
    """Root endpoint."""
    return jsonify({
        "service": "notification-service",
        "result_service_url": RESULT_SERVICE_URL,
        "attendance_service_url": ATTENDANCE_SERVICE_URL,
        "endpoints": {
            "/health": "Health check",
            "/notify": "Send notification (POST)",
            "/notifications": "Get recent notifications (GET)",
            "/flood": "Send many notifications (POST)",
            "/break": "Generate error logs (POST)",
        },
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
