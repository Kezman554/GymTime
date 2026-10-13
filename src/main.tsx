import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installBackButtonHandler } from './native/backButton'
import { getSpeech } from './audio/speech'

installBackButtonHandler()
// Start the TTS engine and voice lookup now, so the first cue has its voice.
getSpeech()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
