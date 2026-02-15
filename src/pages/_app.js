import { useEffect } from 'react'
import Layout from '../components/Layout'
import { registerServiceWorker } from '../lib/registerSW'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}