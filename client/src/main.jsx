import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Note: StrictMode removed intentionally to prevent double socket connections
// in development. Socket.IO doesn't handle double-mount cleanly.
createRoot(document.getElementById('root')).render(<App />)
