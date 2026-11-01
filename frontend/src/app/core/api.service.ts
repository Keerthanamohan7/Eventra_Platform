import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../config';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}
  get<T = any>(path: string, params?: Record<string, any>) {
    const p: any = {};
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== '' && v != null) p[k] = v; });
    return this.http.get<T>(API + path, { params: p });
  }
  post<T = any>(path: string, body: any = {}) { return this.http.post<T>(API + path, body); }
  put<T = any>(path: string, body: any = {}) { return this.http.put<T>(API + path, body); }
  delete<T = any>(path: string) { return this.http.delete<T>(API + path); }
}
