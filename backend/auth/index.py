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

def handler(event: dict, context) -> dict:
    """Авторизация и регистрация пользователей"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Register
        if '/register' in path and method == 'POST':
            username = body.get('username', '').strip()
            email = body.get('email', '').strip()
            password = body.get('password', '')
            role = body.get('role', 'admin')
            if role not in ('admin', 'superadmin'):
                role = 'admin'

            if not username or not email or not password:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}

            cur.execute("SELECT id FROM users WHERE username=%s OR email=%s", (username, email))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь уже существует'})}

            pw_hash = hash_password(password)
            cur.execute(
                "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id, username, email, role, verified, donate_level, created_at",
                (username, email, pw_hash, role)
            )
            row = cur.fetchone()
            user = {'id': row[0], 'username': row[1], 'email': row[2], 'role': row[3], 'verified': row[4], 'donate_level': row[5]}

            token = secrets.token_hex(32)
            expires = datetime.now() + timedelta(days=30)
            cur.execute("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user['id'], token, expires))
            conn.commit()

            # Add to general chat
            cur.execute("SELECT id FROM chats LIMIT 1")
            chat = cur.fetchone()
            if chat:
                try:
                    cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (chat[0], user['id']))
                    conn.commit()
                except:
                    conn.rollback()

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': user, 'token': token})}

        # Login
        if '/login' in path and method == 'POST':
            login = body.get('login', '').strip()
            password = body.get('password', '')
            pw_hash = hash_password(password)

            cur.execute(
                "SELECT id, username, email, role, verified, donate_level, is_active FROM users WHERE (username=%s OR email=%s) AND password_hash=%s",
                (login, login, pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}
            if not row[6]:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Аккаунт заблокирован'})}

            user = {'id': row[0], 'username': row[1], 'email': row[2], 'role': row[3], 'verified': row[4], 'donate_level': row[5]}
            token = secrets.token_hex(32)
            expires = datetime.now() + timedelta(days=30)
            cur.execute("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user['id'], token, expires))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': user, 'token': token})}

        # Check token / get me
        if '/me' in path and method == 'GET':
            token = event.get('headers', {}).get('X-Auth-Token', '')
            if not token:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            cur.execute(
                "SELECT u.id, u.username, u.email, u.role, u.verified, u.donate_level, u.avatar_url, u.bio FROM users u JOIN user_sessions s ON s.user_id=u.id WHERE s.token=%s AND s.expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Сессия истекла'})}
            user = {'id': row[0], 'username': row[1], 'email': row[2], 'role': row[3], 'verified': row[4], 'donate_level': row[5], 'avatar_url': row[6], 'bio': row[7]}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': user})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
