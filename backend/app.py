import os
from datetime import date, datetime, timedelta

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from dotenv import load_dotenv
import mysql.connector


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY",
    "CHANGE_ME_FOR_PRODUCTION"
)

app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173"
            ]
        }
    }
)

bcrypt = Bcrypt(app)
jwt = JWTManager(app)


# ============================================================
# HEALTH CHECK API
# ============================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "success": True,
        "message": "Task 22 - Team Task Manager API is running",
        "status": "healthy"
    }), 200


# ============================================================
# MYSQL DATABASE CONNECTION
# ============================================================

def db():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "task_manager")
    )


def query(sql, args=(), one=False, commit=False):
    connection = db()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(sql, args)

        if commit:
            connection.commit()
            return cursor.lastrowid

        return cursor.fetchone() if one else cursor.fetchall()

    except Exception:
        if commit:
            connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def user():
    return query(
        """
        SELECT id, name, email, role
        FROM users
        WHERE id = %s
        """,
        (int(get_jwt_identity()),),
        one=True
    )


def visible():
    current_user = user()

    if current_user["role"] == "admin":
        return "1=1", []

    return (
        "(t.created_by=%s OR t.assigned_to=%s)",
        [current_user["id"], current_user["id"]]
    )


def serialize(value):

    if isinstance(value, list):
        return [serialize(item) for item in value]

    if isinstance(value, dict):
        return {
            key: serialize(item)
            for key, item in value.items()
        }

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return value


def fail(message, status=400):
    return jsonify(message=message), status


# ============================================================
# AUTHENTICATION - REGISTER
# ============================================================

@app.post("/api/register")
def register():

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).lower().strip()
    password = str(data.get("password", ""))

    if not name or "@" not in email or len(password) < 8:
        return fail(
            "Name, valid email and password of 8+ characters required"
        )

    existing_user = query(
        "SELECT id FROM users WHERE email=%s",
        (email,),
        one=True
    )

    if existing_user:
        return fail("Email already registered", 409)

    hashed_password = bcrypt.generate_password_hash(
        password
    ).decode("utf-8")

    user_id = query(
        """
        INSERT INTO users(name, email, password)
        VALUES(%s, %s, %s)
        """,
        (name, email, hashed_password),
        commit=True
    )

    token = create_access_token(identity=str(user_id))

    return jsonify(token=token), 201


# ============================================================
# AUTHENTICATION - LOGIN
# ============================================================

@app.post("/api/login")
def login():

    data = request.get_json(silent=True) or {}

    email = str(
        data.get("email", "")
    ).lower().strip()

    password = str(data.get("password", ""))

    current_user = query(
        "SELECT * FROM users WHERE email=%s",
        (email,),
        one=True
    )

    if not current_user:
        return fail("Invalid credentials", 401)

    if not bcrypt.check_password_hash(
        current_user["password"],
        password
    ):
        return fail("Invalid credentials", 401)

    token = create_access_token(
        identity=str(current_user["id"])
    )

    return jsonify(token=token), 200


# ============================================================
# CURRENT USER
# ============================================================

@app.get("/api/me")
@jwt_required()
def me():
    return jsonify(user())


# ============================================================
# LOGOUT
# ============================================================

@app.get("/api/logout")
@jwt_required()
def logout():

    return jsonify({
        "message": "Delete the JWT on the client to log out"
    })


# ============================================================
# GET USERS - ADMIN ONLY
# ============================================================

@app.get("/api/users")
@jwt_required()
def users():

    current_user = user()

    if current_user["role"] != "admin":
        return fail("Admin only", 403)

    results = query(
        """
        SELECT id, name, email, role
        FROM users
        ORDER BY name
        """
    )

    return jsonify(results)


# ============================================================
# GET ALL TASKS - FILTERS + PAGINATION
# ============================================================

@app.get("/api/tasks")
@jwt_required()
def tasks():

    where, args = visible()

    filters = []

    for key in ("status", "priority", "assigned_to"):

        if request.args.get(key):
            filters.append(f"t.{key}=%s")
            args.append(request.args[key])

    search = request.args.get("search")

    if search:
        filters.append("t.title LIKE %s")
        args.append(f"%{search}%")

    if filters:
        where += " AND " + " AND ".join(filters)

    try:
        page = max(
            1,
            int(request.args.get("page", 1))
        )

        limit = min(
            100,
            max(1, int(request.args.get("limit", 10)))
        )

    except ValueError:
        return fail("Page and limit must be valid numbers")

    total_result = query(
        "SELECT COUNT(*) AS n FROM tasks t WHERE " + where,
        args,
        one=True
    )

    total = total_result["n"]

    rows = query(
        """
        SELECT
            t.*,
            u.name AS assignee_name
        FROM tasks t
        LEFT JOIN users u
            ON u.id = t.assigned_to
        WHERE
        """
        + where +
        """
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT %s OFFSET %s
        """,
        args + [limit, (page - 1) * limit]
    )

    return jsonify({
        "items": serialize(rows),
        "total": total,
        "page": page,
        "limit": limit
    })


# ============================================================
# GET SINGLE TASK
# ============================================================

@app.get("/api/tasks/<int:tid>")
@jwt_required()
def task(tid):

    where, args = visible()

    result = query(
        """
        SELECT
            t.*,
            u.name AS assignee_name
        FROM tasks t
        LEFT JOIN users u
            ON u.id = t.assigned_to
        WHERE t.id=%s AND
        """
        + where,
        [tid] + args,
        one=True
    )

    if not result:
        return fail("Task not found", 404)

    return jsonify(serialize(result))


# ============================================================
# TASK VALIDATION
# ============================================================

def validate(data, creating=False):

    if creating and not str(
        data.get("title", "")
    ).strip():
        return "Title required"

    if "title" in data and not str(
        data["title"]
    ).strip():
        return "Title required"

    if "status" in data:
        if data["status"] not in (
            "todo",
            "in_progress",
            "done"
        ):
            return "Invalid status"

    if "priority" in data:
        if data["priority"] not in (
            "low",
            "medium",
            "high"
        ):
            return "Invalid priority"

    if data.get("due_date"):

        try:
            due_date = date.fromisoformat(
                data["due_date"]
            )

        except (ValueError, TypeError):
            return "Invalid date"

        if creating and due_date <= date.today():
            return "Due date must be in future"

    return None


# ============================================================
# CREATE TASK
# ============================================================

@app.post("/api/tasks")
@jwt_required()
def add():

    data = request.get_json(silent=True) or {}

    error = validate(data, creating=True)

    if error:
        return fail(error)

    current_user = user()

    user_id = current_user["id"]

    assigned = data.get("assigned_to") or None

    if assigned:

        if (
            current_user["role"] != "admin"
            and int(assigned) != user_id
        ):
            return fail(
                "Only admins may assign other users",
                403
            )

        assignee = query(
            "SELECT id FROM users WHERE id=%s",
            (assigned,),
            one=True
        )

        if not assignee:
            return fail("Assignee not found")

    task_id = query(
        """
        INSERT INTO tasks(
            title,
            description,
            status,
            priority,
            assigned_to,
            created_by,
            due_date
        )
        VALUES(%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            data["title"].strip(),
            data.get("description", ""),
            data.get("status", "todo"),
            data.get("priority", "medium"),
            assigned,
            user_id,
            data.get("due_date") or None
        ),
        commit=True
    )

    return jsonify({
        "id": task_id,
        "message": "Task created successfully"
    }), 201


# ============================================================
# UPDATE TASK
# ============================================================

@app.put("/api/tasks/<int:tid>")
@jwt_required()
def update(tid):

    old_task = query(
        "SELECT * FROM tasks WHERE id=%s",
        (tid,),
        one=True
    )

    current_user = user()

    if not old_task:
        return fail("Task not found", 404)

    if (
        current_user["role"] != "admin"
        and current_user["id"] not in (
            old_task["created_by"],
            old_task["assigned_to"]
        )
    ):
        return fail("Access denied", 403)

    data = request.get_json(silent=True) or {}

    error = validate(data)

    if error:
        return fail(error)

    allowed_fields = [
        "title",
        "description",
        "status",
        "priority",
        "due_date",
        "assigned_to"
    ]

    keys = [
        key for key in allowed_fields
        if key in data
    ]

    if not keys:
        return fail("No fields provided")

    if "assigned_to" in keys:

        assigned = data["assigned_to"]

        if (
            current_user["role"] != "admin"
            and assigned not in (
                None,
                current_user["id"]
            )
        ):
            return fail(
                "Admin only assignment",
                403
            )

        if assigned:

            assignee = query(
                "SELECT id FROM users WHERE id=%s",
                (assigned,),
                one=True
            )

            if not assignee:
                return fail("Assignee not found")

    values = [
        (
            data[key] or None
            if key in ("due_date", "assigned_to")
            else data[key]
        )
        for key in keys
    ]

    sql = (
        "UPDATE tasks SET "
        + ",".join(
            f"{key}=%s"
            for key in keys
        )
        + " WHERE id=%s"
    )

    query(
        sql,
        values + [tid],
        commit=True
    )

    return jsonify({
        "message": "Task updated successfully"
    })


# ============================================================
# DELETE TASK
# ============================================================

@app.delete("/api/tasks/<int:tid>")
@jwt_required()
def delete(tid):

    old_task = query(
        """
        SELECT created_by
        FROM tasks
        WHERE id=%s
        """,
        (tid,),
        one=True
    )

    current_user = user()

    if not old_task:
        return fail("Task not found", 404)

    if (
        current_user["role"] != "admin"
        and old_task["created_by"] != current_user["id"]
    ):
        return fail(
            "You do not have permission to delete this task",
            403
        )

    query(
        "DELETE FROM tasks WHERE id=%s",
        (tid,),
        commit=True
    )

    return jsonify({
        "message": "Task deleted successfully"
    })


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/api/stats")
@jwt_required()
def stats():

    where, args = visible()

    rows = query(
        """
        SELECT
            status,
            priority,
            due_date,
            updated_at
        FROM tasks t
        WHERE
        """
        + where,
        args
    )

    today = date.today()

    week_start = datetime.now() - timedelta(days=7)

    result = {
        "total": len(rows),

        "todo": sum(
            item["status"] == "todo"
            for item in rows
        ),

        "in_progress": sum(
            item["status"] == "in_progress"
            for item in rows
        ),

        "done": sum(
            item["status"] == "done"
            for item in rows
        ),

        "overdue": sum(
            bool(
                item["due_date"]
                and item["due_date"] < today
                and item["status"] != "done"
            )
            for item in rows
        ),

        "completed_this_week": sum(
            bool(
                item["status"] == "done"
                and item["updated_at"] >= week_start
            )
            for item in rows
        ),

        "low": sum(
            item["priority"] == "low"
            for item in rows
        ),

        "medium": sum(
            item["priority"] == "medium"
            for item in rows
        ),

        "high": sum(
            item["priority"] == "high"
            for item in rows
        )
    }

    return jsonify(result)


# ============================================================
# DATABASE ERROR HANDLER
# ============================================================

@app.errorhandler(mysql.connector.Error)
def database_error(error):

    app.logger.exception(
        "Database connection or query failed"
    )

    return fail(
        "Database error. Please check MySQL configuration.",
        500
    )


# ============================================================
# START FLASK SERVER
# ============================================================

if __name__ == "__main__":

    print("=" * 55)
    print("TASK 22 - TEAM TASK MANAGER")
    print("Flask Backend Starting...")
    print("API: http://127.0.0.1:5000")
    print("Health: http://127.0.0.1:5000/api/health")
    print("=" * 55)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )