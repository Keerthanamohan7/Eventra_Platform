export const HOST = 'http://localhost:5000';
export const API = HOST + '/api';
export const MULT: Record<string, number> = { Regular: 1, Premium: 1.8, VIP: 3 };
export const CATEGORIES = ['Music', 'Comedy', 'Theatre', 'Festival', 'Sports', 'Workshop'];
export const EMOJI: Record<string, string> = { Music: '🎤', Comedy: '😂', Theatre: '🎭', Festival: '🎪', Sports: '🏏', Workshop: '🛠' };
export const img = (u?: string) => (!u ? '' : u.startsWith('http') || u.startsWith('data:') ? u : HOST + u);
