// where was i? — entry point.
// The original JumpyBrain web app (src/App.jsx and src/components/) needs its
// own server, MongoDB and Google sign-in. It is kept in the repository
// unchanged, but this local-first app is what gets built and served.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './wwi/wwi.css'
import WhereWasI from './wwi/App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WhereWasI />
  </StrictMode>,
)
