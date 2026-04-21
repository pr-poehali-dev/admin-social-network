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

def handler(event: dict, context) -> dict:
    """Управление чатами и сообщениями"""
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
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        auth_user = get_user_from_token(cur, token)
        if not auth_user:
            return make_resp(401, {'error': 'Не авторизован'})

        uid = auth_user[0]

        # POST /chats/{id}/messages  (проверяем сначала более специфичный)
        if method == 'POST' and '/messages' in path:
            parts = [p for p in path.split('/') if p]
            # find chat_id before 'messages'
            chat_id = None
            for i, p in enumerate(parts):
                if p == 'messages' and i > 0:
                    try:
                        chat_id = int(parts[i-1])
                    except Exception:
                        pass
            if not chat_id:
                return make_resp(400, {'error': 'Неверный ID чата'})
            content = (body.get('content') or '').strip()
            if not content:
                return make_resp(400, {'error': 'Сообщение не может быть пустым'})
            if len(content) > 2000:
                return make_resp(400, {'error': 'Сообщение слишком длинное'})
            cur.execute(
                "INSERT INTO messages (chat_id, user_id, content) VALUES (%s, %s, %s) RETURNING id, created_at",
                (chat_id, uid, content)
            )
            row = cur.fetchone()
            conn.commit()
            return make_resp(200, {'id': row[0], 'created_at': str(row[1]), 'success': True})

        # GET /chats/{id}/messages
        if method == 'GET' and '/messages' in path:
            parts = [p for p in path.split('/') if p]
            chat_id = None
            for i, p in enumerate(parts):
                if p == 'messages' and i > 0:
                    try:
                        chat_id = int(parts[i-1])
                    except Exception:
                        pass
            if not chat_id:
                return make_resp(400, {'error': 'Неверный ID чата'})
            limit = min(int(params.get('limit', 100)), 200)
            cur.execute("""
                SELECT m.id, m.content, m.created_at,
                       u.id, u.username, u.avatar_url, u.verified, u.donate_level
                FROM messages m
                LEFT JOIN users u ON u.id = m.user_id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
                LIMIT %s
            """, (chat_id, limit))
            rows = cur.fetchall()
            msgs = [{
                'id': r[0], 'content': r[1], 'created_at': str(r[2]),
                'user': {'id': r[3], 'username': r[4], 'avatar_url': r[5], 'verified': r[6], 'donate_level': r[7]}
            } for r in rows]
            return make_resp(200, {'messages': msgs})

        # GET /chats
        if method == 'GET' and (path.endswith('/chats') or path == '/'):
            cur.execute("""
                SELECT c.id, c.name, c.description, c.chat_type, c.created_at,
                       (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as msg_count
                FROM chats c
                ORDER BY c.created_at DESC
            """)
            rows = cur.fetchall()
            chats = [{
                'id': r[0], 'name': r[1], 'description': r[2],
                'type': r[3], 'created_at': str(r[4]), 'msg_count': int(r[5])
            } for r in rows]
            return make_resp(200, {'chats': chats})

        # POST /chats
        if method == 'POST' and (path.endswith('/chats') or path == '/'):
            if auth_user[2] != 'superadmin':
                return make_resp(403, {'error': 'Только Главный Администратор может создавать чаты'})
            name = (body.get('name') or '').strip()
            if not name:
                return make_resp(400, {'error': 'Введите название чата'})
            desc = body.get('description', '')
            chat_type = body.get('type', 'group')
            cur.execute(
                "INSERT INTO chats (name, description, chat_type, created_by) VALUES (%s, %s, %s, %s) RETURNING id",
                (name, desc, chat_type, uid)
            )
            chat_id = cur.fetchone()[0]
            # Auto-add all users to group chat
            if chat_type == 'group':
                cur.execute("SELECT id FROM users WHERE is_active=TRUE")
                all_users = cur.fetchall()
                for (user_id,) in all_users:
                    cur.execute(
                        "INSERT INTO chat_members (chat_id, user_id) SELECT %s, %s WHERE NOT EXISTS (SELECT 1 FROM chat_members WHERE chat_id=%s AND user_id=%s)",
                        (chat_id, user_id, chat_id, user_id)
                    )
            conn.commit()
            return make_resp(200, {'chat_id': chat_id, 'success': True})

        return make_resp(404, {'error': 'Not found'})

    except Exception as e:
        conn.rollback()
        return make_resp(500, {'error': f'Ошибка сервера: {str(e)}'})
    finally:
        cur.close()
        conn.close()
