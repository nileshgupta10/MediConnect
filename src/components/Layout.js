export default function Layout({ children }) {
  return (
    <div>
      {/* Top Spacer / Future Navbar Area */}
      <div style={{ height: '64px' }} />

      {/* Main Content */}
      <main className="mc-page">
        {children}
      </main>
    </div>
  );
}
