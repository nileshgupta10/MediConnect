import '../styles/globals.css';
import Layout from '../components/Layout';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const noLayoutPages = ['/', '/simple-login'];
  const isNoLayout = noLayoutPages.includes(router.pathname);

  return (
    <>
      <Head>
        <title>MediClan</title>
      </Head>
      {isNoLayout ? <Component {...pageProps} /> : <Layout><Component {...pageProps} /></Layout>}
    </>
  );
}
