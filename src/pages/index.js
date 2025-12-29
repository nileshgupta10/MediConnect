import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>MediConnect</h1>
        <p>Pharmacy employment platform</p>

        <br />

        <Link href="/simple-login">
          Login / Sign Up
        </Link>
      </div>
    </div>
  );
}