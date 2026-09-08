import axios from 'axios'

// Cria uma instância do axios com configurações padrão
const http = axios.create({
  baseURL: 'http://localhost:3000/api', // URL base do seu backend
  timeout: 10000, // tempo máximo de espera (opcional)
  headers: { 'Content-Type': 'application/json' }
})

// Interceptores (opcional) – para adicionar token de autenticação, etc.
http.interceptors.request.use(config => {
  // Exemplo: adicionar token se existir
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default http

//qualquer serviço ou componente, você importa esse http e faz requisições