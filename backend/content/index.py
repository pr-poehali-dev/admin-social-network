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

def get_user_from_token(cur, token):
    if not token:
        return None
    cur.execute(
        "SELECT u.id, u.username, u.role FROM users u JOIN user_sessions s ON s.user_id=u.id WHERE s.token=%s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Видео, оценки, задания, новости, донаты"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('X-Auth-Token', '')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    conn = get_conn()
    cur = conn.cursor()

    try:
        auth_user = get_user_from_token(cur, token)

        # === VIDEOS ===
        if '/videos' in path and not '/grades' in path and not '/tasks' in path:
            if method == 'GET':
                cur.execute("""
                    SELECT v.id, v.title, v.description, v.url, v.thumbnail_url, v.views, v.created_at,
                           u.id, u.username
                    FROM videos v LEFT JOIN users u ON u.id = v.uploaded_by
                    ORDER BY v.created_at DESC
                """)
                rows = cur.fetchall()
                videos = [{'id': r[0], 'title': r[1], 'description': r[2], 'url': r[3], 'thumbnail_url': r[4], 'views': r[5], 'created_at': str(r[6]), 'author': {'id': r[7], 'username': r[8]}} for r in rows]
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'videos': videos})}

            if method == 'POST':
                if not auth_user:
                    return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
                title = body.get('title', '').strip()
                url = body.get('url', '').strip()
                if not title or not url:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
                cur.execute(
                    "INSERT INTO videos (title, description, url, thumbnail_url, uploaded_by) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                    (title, body.get('description', ''), url, body.get('thumbnail_url', ''), auth_user[0])
                )
                vid_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': vid_id, 'success': True})}

        # === GRADES ===
        if '/grades' in path:
            if method == 'GET':
                cur.execute("""
                    SELECT g.id, g.score, g.comment, g.created_at,
                           u1.id, u1.username, u2.id, u2.username
                    FROM grades g
                    LEFT JOIN users u1 ON u1.id = g.from_user_id
                    LEFT JOIN users u2 ON u2.id = g.to_user_id
                    ORDER BY g.created_at DESC
                """)
                rows = cur.fetchall()
                grades = [{'id': r[0], 'score': r[1], 'comment': r[2], 'created_at': str(r[3]), 'from': {'id': r[4], 'username': r[5]}, 'to': {'id': r[6], 'username': r[7]}} for r in rows]
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'grades': grades})}

            if method == 'POST':
                if not auth_user:
                    return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
                to_uid = body.get('to_user_id')
                score = body.get('score')
                comment = body.get('comment', '')
                if not to_uid or score is None:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Укажите пользователя и оценку'})}
                cur.execute(
                    "INSERT INTO grades (from_user_id, to_user_id, score, comment) VALUES (%s, %s, %s, %s) RETURNING id",
                    (auth_user[0], to_uid, int(score), comment)
                )
                gid = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': gid, 'success': True})}

        # === TASKS ===
        if '/tasks' in path:
            if method == 'GET':
                cur.execute("""
                    SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at,
                           u1.id, u1.username, u2.id, u2.username
                    FROM tasks t
                    LEFT JOIN users u1 ON u1.id = t.assigned_to
                    LEFT JOIN users u2 ON u2.id = t.created_by
                    ORDER BY t.created_at DESC
                """)
                rows = cur.fetchall()
                tasks = [{'id': r[0], 'title': r[1], 'description': r[2], 'status': r[3], 'priority': r[4], 'due_date': str(r[5]) if r[5] else None, 'created_at': str(r[6]), 'assigned_to': {'id': r[7], 'username': r[8]}, 'created_by': {'id': r[9], 'username': r[10]}} for r in rows]
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'tasks': tasks})}

            if method == 'POST':
                if not auth_user:
                    return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
                title = body.get('title', '').strip()
                if not title:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Введите название задания'})}
                cur.execute(
                    "INSERT INTO tasks (title, description, assigned_to, created_by, status, priority, due_date) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (title, body.get('description', ''), body.get('assigned_to'), auth_user[0], body.get('status', 'pending'), body.get('priority', 'medium'), body.get('due_date'))
                )
                tid = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': tid, 'success': True})}

            if method == 'PUT' and path.split('/')[-1].isdigit():
                if not auth_user:
                    return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
                tid = path.split('/')[-1]
                status = body.get('status', 'pending')
                cur.execute("UPDATE tasks SET status=%s, updated_at=NOW() WHERE id=%s", (status, tid))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True})}

        # === DONATIONS ===
        if '/donations' in path:
            if method == 'GET':
                cur.execute("""
                    SELECT d.id, d.amount, d.level, d.note, d.expires_at, d.created_at,
                           u1.id, u1.username, u2.id, u2.username
                    FROM donations d
                    LEFT JOIN users u1 ON u1.id = d.user_id
                    LEFT JOIN users u2 ON u2.id = d.granted_by
                    ORDER BY d.created_at DESC
                """)
                rows = cur.fetchall()
                donations = [{'id': r[0], 'amount': r[1], 'level': r[2], 'note': r[3], 'expires_at': str(r[4]) if r[4] else None, 'created_at': str(r[5]), 'user': {'id': r[6], 'username': r[7]}, 'granted_by': {'id': r[8], 'username': r[9]}} for r in rows]
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'donations': donations})}

            if method == 'POST':
                if not auth_user or auth_user[2] != 'superadmin':
                    return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Только главный администратор'})}
                uid = body.get('user_id')
                amount = body.get('amount', 0)
                level = body.get('level', 1)
                note = body.get('note', '')
                expires_at = body.get('expires_at')
                cur.execute(
                    "INSERT INTO donations (user_id, amount, level, granted_by, expires_at, note) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (uid, amount, level, auth_user[0], expires_at, note)
                )
                did = cur.fetchone()[0]
                cur.execute("UPDATE users SET donate_level=%s, donate_expires_at=%s WHERE id=%s", (level, expires_at, uid))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': did, 'success': True})}

        # === NEWS ===
        if '/news' in path:
            if method == 'GET':
                cur.execute("""
                    SELECT n.id, n.title, n.content, n.pinned, n.created_at, u.id, u.username
                    FROM news n LEFT JOIN users u ON u.id = n.author_id
                    ORDER BY n.pinned DESC, n.created_at DESC
                """)
                rows = cur.fetchall()
                items = [{'id': r[0], 'title': r[1], 'content': r[2], 'pinned': r[3], 'created_at': str(r[4]), 'author': {'id': r[5], 'username': r[6]}} for r in rows]
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'news': items})}

            if method == 'POST':
                if not auth_user or auth_user[2] != 'superadmin':
                    return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Только главный администратор'})}
                title = body.get('title', '').strip()
                content = body.get('content', '').strip()
                if not title or not content:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
                pinned = body.get('pinned', False)
                cur.execute("INSERT INTO news (title, content, author_id, pinned) VALUES (%s, %s, %s, %s) RETURNING id", (title, content, auth_user[0], pinned))
                nid = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': nid, 'success': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
