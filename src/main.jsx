import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import config from './config'

// Dinamik sayfa başlığı ve tema rengi
document.title = `${config.businessName} | ${config.businessSubtitle}`
const metaTheme = document.querySelector('meta[name="theme-color"]')
if (metaTheme) metaTheme.content = config.themeColor

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
