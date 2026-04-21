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
    cur.execute(
        "SELECT u.id, u.username, u.role FROM users u JOIN user_sessions s ON s.user_id=u.id WHERE s.token=%s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Управление пользователями: список, профиль, обновление"""
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
        auth_user = get_user_from_token(cur, token) if token else None

        # GET /users — all users list
        if method == 'GET' and (path.endswith('/users') or path == '/'):
            cur.execute("SELECT id, username, email, role, verified, donate_level, avatar_url, bio, is_active, created_at FROM users ORDER BY created_at DESC")
            rows = cur.fetchall()
            users = [{'id': r[0], 'username': r[1], 'email': r[2], 'role': r[3], 'verified': r[4], 'donate_level': r[5], 'avatar_url': r[6], 'bio': r[7], 'is_active': r[8], 'created_at': str(r[9])} for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': users})}

        # GET /users/{id}
        if method == 'GET' and '/users/' in path:
            uid = path.split('/')[-1]
            cur.execute("SELECT id, username, email, role, verified, donate_level, avatar_url, bio, is_active, created_at FROM users WHERE id=%s", (uid,))
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}
            user = {'id': r[0], 'username': r[1], 'email': r[2], 'role': r[3], 'verified': r[4], 'donate_level': r[5], 'avatar_url': r[6], 'bio': r[7], 'is_active': r[8], 'created_at': str(r[9])}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': user})}

        # PUT /users/{id} — update profile or admin actions
        if method == 'PUT' and '/users/' in path:
            if not auth_user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            uid = path.split('/')[-1]
            # Only superadmin or self
            if str(auth_user[0]) != uid and auth_user[2] != 'superadmin':
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            fields = []
            values = []
            if 'bio' in body:
                fields.append('bio=%s')
                values.append(body['bio'])
            if 'avatar_url' in body:
                fields.append('avatar_url=%s')
                values.append(body['avatar_url'])
            if 'role' in body and auth_user[2] == 'superadmin':
                fields.append('role=%s')
                values.append(body['role'])
            if 'is_active' in body and auth_user[2] == 'superadmin':
                fields.append('is_active=%s')
                values.append(body['is_active'])
            if 'verified' in body and auth_user[2] == 'superadmin':
                fields.append('verified=%s')
                values.append(body['verified'])
            if 'donate_level' in body and auth_user[2] == 'superadmin':
                fields.append('donate_level=%s')
                values.append(body['donate_level'])

            if fields:
                fields.append('updated_at=NOW()')
                values.append(uid)
                cur.execute(f"UPDATE users SET {', '.join(fields)} WHERE id=%s", values)
                conn.commit()

            cur.execute("SELECT id, username, email, role, verified, donate_level, avatar_url, bio, is_active FROM users WHERE id=%s", (uid,))
            r = cur.fetchone()
            user = {'id': r[0], 'username': r[1], 'email': r[2], 'role': r[3], 'verified': r[4], 'donate_level': r[5], 'avatar_url': r[6], 'bio': r[7], 'is_active': r[8]}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': user})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()