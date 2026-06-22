import { initAdminMode } from "./utils/admin"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './components/App.tsx'

// 라이트모드 강제
document.documentElement.classList.remove('dark')
document.documentElement.classList.add('dark')

initAdminMode()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
