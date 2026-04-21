const URLS = {
  auth: 'https://functions.poehali.dev/4c20e921-1f82-4013-acba-65e04a81aed4',
  chats: 'https://functions.poehali.dev/454360c5-c7e9-4a4b-869e-4218c0257bca',
  content: 'https://functions.poehali.dev/850304a9-9bc9-43ef-9521-ea44f196b455',
  users: 'https://functions.poehali.dev/8a176473-9d6a-49cd-9f9b-abc371d01df8',
};

function getToken() {
  return localStorage.getItem('token') || '';
}

async function req(base: string, path: string, method = 'GET', body?: object) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['X-Auth-Token'] = token;

  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export const api = {
  // Auth
  register: (data: object) => req(URLS.auth, '/register', 'POST', data),
  login: (data: object) => req(URLS.auth, '/login', 'POST', data),
  me: () => req(URLS.auth, '/me'),

  // Users
  getUsers: () => req(URLS.users, '/users'),
  getUser: (id: number) => req(URLS.users, `/users/${id}`),
  updateUser: (id: number, data: object) => req(URLS.users, `/users/${id}`, 'PUT', data),

  // Chats
  getChats: () => req(URLS.chats, '/chats'),
  createChat: (data: object) => req(URLS.chats, '/chats', 'POST', data),
  getMessages: (chatId: number) => req(URLS.chats, `/chats/${chatId}/messages`),
  sendMessage: (chatId: number, content: string) => req(URLS.chats, `/chats/${chatId}/messages`, 'POST', { content }),

  // Videos
  getVideos: () => req(URLS.content, '/videos'),
  addVideo: (data: object) => req(URLS.content, '/videos', 'POST', data),

  // Grades
  getGrades: () => req(URLS.content, '/grades'),
  addGrade: (data: object) => req(URLS.content, '/grades', 'POST', data),

  // Tasks
  getTasks: () => req(URLS.content, '/tasks'),
  addTask: (data: object) => req(URLS.content, '/tasks', 'POST', data),
  updateTask: (id: number, data: object) => req(URLS.content, `/tasks/${id}`, 'PUT', data),

  // Donations
  getDonations: () => req(URLS.content, '/donations'),
  addDonation: (data: object) => req(URLS.content, '/donations', 'POST', data),

  // News
  getNews: () => req(URLS.content, '/news'),
  addNews: (data: object) => req(URLS.content, '/news', 'POST', data),
};

export type User = {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'superadmin';
  verified: boolean;
  donate_level: number;
  avatar_url?: string;
  bio?: string;
  is_active?: boolean;
};
