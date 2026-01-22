import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const noLayoutPages = ['/', '/simple-login', '/auth-callback'];
  const isNoLayout = noLayoutPages.includes(router.pathname);

  const content = <Component {...pageProps} />;

  return (
    <>
      <Head>
        <title>MediClan</title>
      </Head>

      <div
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont',
          color: '#0f172a',
          background: '#ffffff',
        }}
      >
        {isNoLayout ? content : <Layout>{content}</Layout>}
      </div>
    </>
  );
}
