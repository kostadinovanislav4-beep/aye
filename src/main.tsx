import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { requestPersistentStorage } from './data/persist'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Липсва елементът #root в index.html.')

// Браузърът да не изтрива прогреса при недостиг на място (раздел 2 от SPEC).
void requestPersistentStorage()

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
