import { createServerClient } from '@supabase/ssr';
import { parse, serialize } from 'cookie';

export default function RoleSelect() {
  return (
    <div style={{ padding: 40 }}>
      <p>Redirecting…</p>
    </div>
  );
}

export async function getServerSideProps({ req, res }) {
  const cookies = parse(req.headers.cookie || '');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookiesToSet) {
          res.setHeader(
            'Set-Cookie',
            cookiesToSet.map(({ name, value, options }) =>
              serialize(name, value, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: true,
                ...options,
              })
            )
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔐 NOT LOGGED IN
  if (!user) {
    return {
      redirect: {
        destination: '/simple-login',
        permanent: false,
      },
    };
  }

  // 🔑 ADMIN
  if (user.email === 'maniac.gupta@gmail.com') {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }

  // 🎭 ROLE CHECK
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

  // ❓ NO ROLE
  return { props: {} };
}
