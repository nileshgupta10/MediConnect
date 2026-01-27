import { createServerClient } from '@supabase/auth-helpers-nextjs';

export default function RoleSelect() {
  // This page will never render visibly
  // because it always redirects
  return null;
}

export async function getServerSideProps(ctx) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ctx
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 🔴 Not logged in → go to simple login
  if (!session) {
    return {
      redirect: {
        destination: '/simple-login',
        permanent: false,
      },
    };
  }

  // 🔐 Admin override
  if (session.user.email === 'maniac.gupta@gmail.com') {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }

  // 🔍 Check role
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  // ✅ Role already selected → direct entry
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

  // 🆕 No role yet → show role select UI
  return {
    props: {},
  };
}
