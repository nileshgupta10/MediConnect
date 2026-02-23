import { useEffect } from 'react'
import { registerServiceWorker } from '../lib/registerSW'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <Component {...pageProps} />
}