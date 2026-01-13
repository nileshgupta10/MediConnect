import Layout from '../components/Layout';
import { useRouter } from 'next/router';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Pages that should NOT use Layout
  const noLayoutPages = ['/', '/simple-login', '/auth-callback'];

  const isNoLayout = noLayoutPages.includes(router.pathname);

  if (isNoLayout) {
    return <Component {...pageProps} />;
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
