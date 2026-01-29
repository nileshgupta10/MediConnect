// src/pages/_app.js

import Layout from '../components/Layout';

export default function MyApp({ Component, pageProps }) {
  // ❌ NO hooks
  // ❌ NO auth listeners
  // ❌ NO effects
  // ❌ NO router usage

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
