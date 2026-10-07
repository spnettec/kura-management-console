import { request } from './http'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

export function login(payload: LoginRequest) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
