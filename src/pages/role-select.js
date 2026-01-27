import { createServerClient } from '@supabase/ssr';

export default function RoleSelect() {
  // This page never renders on client if redirected
  return (
    <div style={{ padding: 40 }}>
      <p>Redirecting…</p>
    </div>
  );
}

export async function getServerSideProps({ req, res }) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return Object.entries(req.cookies).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly`);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔐 NOT LOGGED IN → BACK TO LOGIN
  if (!user) {
    return {
      redirect: {
        destination: '/simple-login',
        permanent: false,
      },
    };
  }

  // 🔑 ADMIN BYPASS
  if (user.email === 'maniac.gupta@gmail.com') {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }

  // 🎭 CHECK ROLE
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleRow?.role === 'pharmacist') {
    return {
      redirect: {
        destination: '/pharmacist-profile',
        permanent: false,
      },
    };
  }

  if (roleRow?.role === 'store_owner') {
    return {
      redirect: {
        destination: '/store-profile',
        permanent: false,
      },
    };
  }

  // ❓ NO ROLE → LET USER SELECT
  return {
    props: {},
  };
}
