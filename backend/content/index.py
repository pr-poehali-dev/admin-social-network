import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def make_resp(status, data):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False, default=str)}

def get_user_from_token(cur, token):
    if not token:
        return None
    cur.execute(
        "SELECT u.id, u.username, u.role FROM users u JOIN user_sessions s ON s.user_id=u.id WHERE s.token=%s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()

def get_section(path):
    """Determine which section to handle based on path"""
    parts = [p for p in path.strip('/').split('/') if p]
    # Remove function ID prefix if present (UUID format)
    if parts and len(parts[0]) > 20 and '-' in parts[0]:
        parts = parts[1:]
    if not parts:
        return None, None
    section = parts[0]
    resource_id = parts[1] if len(parts) > 1 else None
    return section, resource_id

def handler(event: dict, context) -> dict:
    """Видео, оценки, задания, новости, донаты"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    token = (event.get('headers') or {}).get('X-Auth-Token', '')
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            body = {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        auth_user = get_user_from_token(cur, token)
        section, resource_id = get_section(path)

        # ===== VIDEOS =====
        if section == 'videos':
            if method == 'GET':
                cur.execute("""
                    SELECT v.id, v.title, v.description, v.url, v.thumbnail_url, v.views, v.created_at,
                           u.id, u.username
                    FROM videos v
                    LEFT JOIN users u ON u.id = v.uploaded_by
                    ORDER BY v.created_at DESC
                """)
                rows = cur.fetchall()
                videos = [{
                    'id': r[0], 'title': r[1], 'description': r[2], 'url': r[3],
                    'thumbnail_url': r[4], 'views': r[5], 'created_at': str(r[6]),
                    'author': {'id': r[7], 'username': r[8]}
                } for r in rows]
                return make_resp(200, {'videos': videos})

            if method == 'POST':
                if not auth_user:
                    return make_resp(401, {'error': 'Не авторизован'})
                title = (body.get('title') or '').strip()
                url = (body.get('url') or '').strip()
                if not title or not url:
                    return make_resp(400, {'error': 'Заполните название и ссылку'})
                cur.execute(
                    "INSERT INTO videos (title, description, url, thumbnail_url, uploaded_by) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                    (title, body.get('description', ''), url, body.get('thumbnail_url', ''), auth_user[0])
                )
                vid_id = cur.fetchone()[0]
                conn.commit()
                return make_resp(200, {'id': vid_id, 'success': True})

        # ===== GRADES =====
        if section == 'grades':
            if method == 'GET':
                cur.execute("""
                    SELECT g.id, g.score, g.comment, g.created_at,
                           u1.id, u1.username, u1.verified,
                           u2.id, u2.username, u2.verified
                    FROM grades g
                    LEFT JOIN users u1 ON u1.id = g.from_user_id
                    LEFT JOIN users u2 ON u2.id = g.to_user_id
                    ORDER BY g.created_at DESC
                """)
                rows = cur.fetchall()
                grades = [{
                    'id': r[0], 'score': r[1], 'comment': r[2], 'created_at': str(r[3]),
                    'from': {'id': r[4], 'username': r[5], 'verified': r[6]},
                    'to': {'id': r[7], 'username': r[8], 'verified': r[9]}
                } for r in rows]
                return make_resp(200, {'grades': grades})

            if method == 'POST':
                if not auth_user:
                    return make_resp(401, {'error': 'Не авторизован'})
                to_uid = body.get('to_user_id')
                score = body.get('score')
                if not to_uid or score is None:
                    return make_resp(400, {'error': 'Укажите пользователя и оценку'})
                score = int(score)
                if not (1 <= score <= 10):
                    return make_resp(400, {'error': 'Оценка должна быть от 1 до 10'})
                cur.execute(
                    "INSERT INTO grades (from_user_id, to_user_id, score, comment) VALUES (%s, %s, %s, %s) RETURNING id",
                    (auth_user[0], int(to_uid), score, body.get('comment', ''))
                )
                gid = cur.fetchone()[0]
                conn.commit()
                return make_resp(200, {'id': gid, 'success': True})

        # ===== TASKS =====
        if section == 'tasks':
            if method == 'GET':
                cur.execute("""
                    SELECT t.id, t.title, t.description, t.status, t.priority,
                           t.due_date, t.created_at, t.updated_at,
                           u1.id, u1.username,
                           u2.id, u2.username
                    FROM tasks t
                    LEFT JOIN users u1 ON u1.id = t.assigned_to
                    LEFT JOIN users u2 ON u2.id = t.created_by
                    ORDER BY t.created_at DESC
                """)
                rows = cur.fetchall()
                tasks = [{
                    'id': r[0], 'title': r[1], 'description': r[2],
                    'status': r[3], 'priority': r[4],
                    'due_date': str(r[5]) if r[5] else None,
                    'created_at': str(r[6]), 'updated_at': str(r[7]),
                    'assigned_to': {'id': r[8], 'username': r[9]},
                    'created_by': {'id': r[10], 'username': r[11]}
                } for r in rows]
                return make_resp(200, {'tasks': tasks})

            if method == 'POST':
                if not auth_user:
                    return make_resp(401, {'error': 'Не авторизован'})
                title = (body.get('title') or '').strip()
                if not title:
                    return make_resp(400, {'error': 'Введите название задания'})
                assigned_to = body.get('assigned_to')
                cur.execute(
                    "INSERT INTO tasks (title, description, assigned_to, created_by, status, priority, due_date) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (
                        title,
                        body.get('description', ''),
                        int(assigned_to) if assigned_to else None,
                        auth_user[0],
                        body.get('status', 'pending'),
                        body.get('priority', 'medium'),
                        body.get('due_date') or None
                    )
                )
                tid = cur.fetchone()[0]
                conn.commit()
                return make_resp(200, {'id': tid, 'success': True})

            if method == 'PUT' and resource_id and resource_id.isdigit():
                if not auth_user:
                    return make_resp(401, {'error': 'Не авторизован'})
                allowed_statuses = ('pending', 'in_progress', 'done', 'cancelled')
                status = body.get('status', 'pending')
                if status not in allowed_statuses:
                    return make_resp(400, {'error': 'Неверный статус'})
                cur.execute("UPDATE tasks SET status=%s, updated_at=NOW() WHERE id=%s", (status, int(resource_id)))
                conn.commit()
                return make_resp(200, {'success': True})

        # ===== DONATIONS =====
        if section == 'donations':
            if method == 'GET':
                cur.execute("""
                    SELECT d.id, d.amount, d.level, d.note, d.expires_at, d.created_at,
                           u1.id, u1.username,
                           u2.id, u2.username
                    FROM donations d
                    LEFT JOIN users u1 ON u1.id = d.user_id
                    LEFT JOIN users u2 ON u2.id = d.granted_by
                    ORDER BY d.created_at DESC
                """)
                rows = cur.fetchall()
                donations = [{
                    'id': r[0], 'amount': r[1], 'level': r[2], 'note': r[3],
                    'expires_at': str(r[4]) if r[4] else None,
                    'created_at': str(r[5]),
                    'user': {'id': r[6], 'username': r[7]},
                    'granted_by': {'id': r[8], 'username': r[9]}
                } for r in rows]
                return make_resp(200, {'donations': donations})

            if method == 'POST':
                if not auth_user or auth_user[2] != 'superadmin':
                    return make_resp(403, {'error': 'Только Главный Администратор'})
                user_id = body.get('user_id')
                level = int(body.get('level', 1))
                amount = int(body.get('amount', level * 100))
                note = body.get('note', '')
                expires_at = body.get('expires_at') or None
                if not user_id:
                    return make_resp(400, {'error': 'Укажите пользователя'})
                cur.execute(
                    "INSERT INTO donations (user_id, amount, level, granted_by, expires_at, note) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (int(user_id), amount, level, auth_user[0], expires_at, note)
                )
                did = cur.fetchone()[0]
                cur.execute(
                    "UPDATE users SET donate_level=%s, donate_expires_at=%s, updated_at=NOW() WHERE id=%s",
                    (level, expires_at, int(user_id))
                )
                conn.commit()
                return make_resp(200, {'id': did, 'success': True})

        # ===== NEWS =====
        if section == 'news':
            if method == 'GET':
                cur.execute("""
                    SELECT n.id, n.title, n.content, n.pinned, n.created_at,
                           u.id, u.username, u.verified
                    FROM news n
                    LEFT JOIN users u ON u.id = n.author_id
                    ORDER BY n.pinned DESC, n.created_at DESC
                """)
                rows = cur.fetchall()
                items = [{
                    'id': r[0], 'title': r[1], 'content': r[2], 'pinned': r[3],
                    'created_at': str(r[4]),
                    'author': {'id': r[5], 'username': r[6], 'verified': r[7]}
                } for r in rows]
                return make_resp(200, {'news': items})

            if method == 'POST':
                if not auth_user or auth_user[2] != 'superadmin':
                    return make_resp(403, {'error': 'Только Главный Администратор'})
                title = (body.get('title') or '').strip()
                content = (body.get('content') or '').strip()
                if not title or not content:
                    return make_resp(400, {'error': 'Заполните заголовок и текст'})
                cur.execute(
                    "INSERT INTO news (title, content, author_id, pinned) VALUES (%s, %s, %s, %s) RETURNING id",
                    (title, content, auth_user[0], bool(body.get('pinned', False)))
                )
                nid = cur.fetchone()[0]
                conn.commit()
                return make_resp(200, {'id': nid, 'success': True})

        return make_resp(404, {'error': 'Not found'})

    except Exception as e:
        conn.rollback()
        return make_resp(500, {'error': f'Ошибка сервера: {str(e)}'})
    finally:
        cur.close()
        conn.close()
