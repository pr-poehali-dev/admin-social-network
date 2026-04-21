import json
import hashlib
import secrets
import os
import psycopg2
from datetime import datetime, timedelta

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def make_resp(status, data):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False, default=str)}

def handler(event: dict, context) -> dict:
    """Авторизация и регистрация пользователей"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            body = {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Register
        if '/register' in path and method == 'POST':
            username = (body.get('username') or '').strip()
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            role = body.get('role', 'admin')
            if role not in ('admin', 'superadmin'):
                role = 'admin'

            if not username or not email or not password:
                return make_resp(400, {'error': 'Заполните все поля'})
            if len(password) < 4:
                return make_resp(400, {'error': 'Пароль минимум 4 символа'})

            cur.execute("SELECT id FROM users WHERE username=%s OR email=%s", (username, email))
            if cur.fetchone():
                return make_resp(409, {'error': 'Пользователь с таким именем или email уже существует'})

            pw_hash = hash_password(password)
            cur.execute(
                "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id, username, email, role, verified, donate_level",
                (username, email, pw_hash, role)
            )
            row = cur.fetchone()
            user = {'id': row[0], 'username': row[1], 'email': row[2], 'role': row[3], 'verified': row[4], 'donate_level': row[5]}

            token = secrets.token_hex(32)
            expires = datetime.now() + timedelta(days=30)
            cur.execute("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user['id'], token, expires))
            conn.commit()

            # Add to all group chats
            try:
                cur.execute("SELECT id FROM chats WHERE chat_type='group'")
                group_chats = cur.fetchall()
                for (chat_id,) in group_chats:
                    cur.execute(
                        "INSERT INTO chat_members (chat_id, user_id) SELECT %s, %s WHERE NOT EXISTS (SELECT 1 FROM chat_members WHERE chat_id=%s AND user_id=%s)",
                        (chat_id, user['id'], chat_id, user['id'])
                    )
                conn.commit()
            except Exception:
                conn.rollback()

            return make_resp(200, {'user': user, 'token': token})

        # Login
        if '/login' in path and method == 'POST':
            login = (body.get('login') or '').strip()
            password = body.get('password') or ''
            if not login or not password:
                return make_resp(400, {'error': 'Введите логин и пароль'})
            pw_hash = hash_password(password)

            cur.execute(
                "SELECT id, username, email, role, verified, donate_level, is_active, avatar_url, bio FROM users WHERE (username=%s OR email=%s) AND password_hash=%s",
                (login, login.lower(), pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return make_resp(401, {'error': 'Неверный логин или пароль'})
            if not row[6]:
                return make_resp(403, {'error': 'Аккаунт заблокирован администратором'})

            user = {'id': row[0], 'username': row[1], 'email': row[2], 'role': row[3], 'verified': row[4], 'donate_level': row[5], 'avatar_url': row[7], 'bio': row[8]}
            token = secrets.token_hex(32)
            expires = datetime.now() + timedelta(days=30)
            cur.execute("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user['id'], token, expires))
            conn.commit()
            return make_resp(200, {'user': user, 'token': token})

        # Get me
        if '/me' in path and method == 'GET':
            token = (event.get('headers') or {}).get('X-Auth-Token', '')
            if not token:
                return make_resp(401, {'error': 'Не авторизован'})
            cur.execute(
                "SELECT u.id, u.username, u.email, u.role, u.verified, u.donate_level, u.avatar_url, u.bio FROM users u JOIN user_sessions s ON s.user_id=u.id WHERE s.token=%s AND s.expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return make_resp(401, {'error': 'Сессия истекла, войдите снова'})
            user = {'id': row[0], 'username': row[1], 'email': row[2], 'role': row[3], 'verified': row[4], 'donate_level': row[5], 'avatar_url': row[6], 'bio': row[7]}
            return make_resp(200, {'user': user})

        return make_resp(404, {'error': 'Not found'})

    except Exception as e:
        conn.rollback()
        return make_resp(500, {'error': f'Ошибка сервера: {str(e)}'})
    finally:
        cur.close()
        conn.close()
