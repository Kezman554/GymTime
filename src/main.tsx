import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/archivo/400.css'
import '@fontsource/archivo/500.css'
import '@fontsource/archivo/700.css'
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
