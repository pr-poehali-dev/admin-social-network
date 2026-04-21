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
    """Управление чатами и сообщениями"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('X-Auth-Token', '')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        auth_user = get_user_from_token(cur, token)
        if not auth_user:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        uid = auth_user[0]

        # GET /chats — list all chats user is member of
        if method == 'GET' and path.endswith('/chats'):
            cur.execute("""
                SELECT c.id, c.name, c.description, c.chat_type, c.created_at,
                       (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as msg_count
                FROM chats c
                LEFT JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = %s
                WHERE c.chat_type = 'group' OR cm.user_id = %s
                ORDER BY c.created_at DESC
            """, (uid, uid))
            rows = cur.fetchall()
            chats = [{'id': r[0], 'name': r[1], 'description': r[2], 'type': r[3], 'created_at': str(r[4]), 'msg_count': r[5]} for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'chats': chats})}

        # POST /chats — create chat (superadmin only)
        if method == 'POST' and path.endswith('/chats'):
            if auth_user[2] != 'superadmin':
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Только главный администратор может создавать чаты'})}
            name = body.get('name', '').strip()
            desc = body.get('description', '')
            chat_type = body.get('type', 'group')
            if not name:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Введите название чата'})}
            cur.execute("INSERT INTO chats (name, description, chat_type, created_by) VALUES (%s, %s, %s, %s) RETURNING id", (name, desc, chat_type, uid))
            chat_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'chat_id': chat_id, 'success': True})}

        # GET /chats/{id}/messages
        if method == 'GET' and '/messages' in path:
            chat_id = path.split('/')[-2]
            limit = int(params.get('limit', 50))
            cur.execute("""
                SELECT m.id, m.content, m.created_at, u.id as uid, u.username, u.avatar_url, u.verified, u.donate_level
                FROM messages m
                LEFT JOIN users u ON u.id = m.user_id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
                LIMIT %s
            """, (chat_id, limit))
            rows = cur.fetchall()
            msgs = [{'id': r[0], 'content': r[1], 'created_at': str(r[2]), 'user': {'id': r[3], 'username': r[4], 'avatar_url': r[5], 'verified': r[6], 'donate_level': r[7]}} for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'messages': msgs})}

        # POST /chats/{id}/messages
        if method == 'POST' and '/messages' in path:
            chat_id = path.split('/')[-2]
            content = body.get('content', '').strip()
            if not content:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Сообщение не может быть пустым'})}
            cur.execute("INSERT INTO messages (chat_id, user_id, content) VALUES (%s, %s, %s) RETURNING id, created_at", (chat_id, uid, content))
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': row[0], 'created_at': str(row[1]), 'success': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
