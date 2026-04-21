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
    """Управление пользователями: список, профиль, обновление"""
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

        # GET /users — all users list (auth required)
        if method == 'GET' and (path.endswith('/users') or path == '/'):
            cur.execute("""
                SELECT id, username, email, role, verified, donate_level, avatar_url, bio, is_active, created_at
                FROM users
                ORDER BY created_at DESC
            """)
            rows = cur.fetchall()
            users = [{
                'id': r[0], 'username': r[1], 'email': r[2], 'role': r[3],
                'verified': r[4], 'donate_level': r[5], 'avatar_url': r[6],
                'bio': r[7], 'is_active': r[8], 'created_at': str(r[9])
            } for r in rows]
            return make_resp(200, {'users': users})

        # GET /users/{id}
        if method == 'GET' and '/users/' in path:
            uid_str = path.split('/')[-1]
            if not uid_str.isdigit():
                return make_resp(400, {'error': 'Неверный ID'})
            cur.execute("""
                SELECT id, username, email, role, verified, donate_level, avatar_url, bio, is_active, created_at
                FROM users WHERE id=%s
            """, (int(uid_str),))
            r = cur.fetchone()
            if not r:
                return make_resp(404, {'error': 'Пользователь не найден'})
            user = {
                'id': r[0], 'username': r[1], 'email': r[2], 'role': r[3],
                'verified': r[4], 'donate_level': r[5], 'avatar_url': r[6],
                'bio': r[7], 'is_active': r[8], 'created_at': str(r[9])
            }
            return make_resp(200, {'user': user})

        # PUT /users/{id}
        if method == 'PUT' and '/users/' in path:
            if not auth_user:
                return make_resp(401, {'error': 'Не авторизован'})
            uid_str = path.split('/')[-1]
            if not uid_str.isdigit():
                return make_resp(400, {'error': 'Неверный ID'})
            uid = int(uid_str)
            if auth_user[0] != uid and auth_user[2] != 'superadmin':
                return make_resp(403, {'error': 'Нет доступа'})

            allowed = ['bio', 'avatar_url']
            if auth_user[2] == 'superadmin':
                allowed += ['role', 'is_active', 'verified', 'donate_level']

            fields = []
            values = []
            for key in allowed:
                if key in body:
                    fields.append(f'{key}=%s')
                    values.append(body[key])

            if fields:
                fields.append('updated_at=NOW()')
                values.append(uid)
                cur.execute(f"UPDATE users SET {', '.join(fields)} WHERE id=%s", values)
                conn.commit()

            cur.execute("""
                SELECT id, username, email, role, verified, donate_level, avatar_url, bio, is_active
                FROM users WHERE id=%s
            """, (uid,))
            r = cur.fetchone()
            if not r:
                return make_resp(404, {'error': 'Пользователь не найден'})
            user = {
                'id': r[0], 'username': r[1], 'email': r[2], 'role': r[3],
                'verified': r[4], 'donate_level': r[5], 'avatar_url': r[6],
                'bio': r[7], 'is_active': r[8]
            }
            return make_resp(200, {'user': user})

        return make_resp(404, {'error': 'Not found'})

    except Exception as e:
        conn.rollback()
        return make_resp(500, {'error': f'Ошибка сервера: {str(e)}'})
    finally:
        cur.close()
        conn.close()
