// src/components/PharmaNewsFeed.js
import { useEffect, useState, useCallback } from 'react'

function relativeTime(pubDate) {
  if (!pubDate) return ''
  try {
    const diff = Date.now() - new Date(pubDate).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  } catch { return '' }
}

function SkeletonCard() {
  return (
    <div style={ns.skeletonCard}>
      <div style={{ ...ns.skeletonLine, width: '90%', height: 14, marginBottom: 8 }} />
      <div style={{ ...ns.skeletonLine, width: '70%', height: 14, marginBottom: 8 }} />
      <div style={{ ...ns.skeletonLine, width: '40%', height: 11 }} />
    </div>
  )
}

function ArticleCard({ article }) {
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer" style={ns.articleCard}>
      <div style={ns.articleTitle}>{article.title}</div>
      <div style={ns.articleMeta}>
        {article.source && <span style={ns.articleSource}>{article.source}</span>}
        {article.source && article.pubDate && <span style={ns.dot}>·</span>}
        {article.pubDate && <span style={ns.articleTime}>{relativeTime(article.pubDate)}</span>}
      </div>
    </a>
  )
}

function Column({ icon, heading, articles, localAvailable, isLocal, loading }) {
  const showNoAddress = isLocal && !localAvailable
  return (
    <div style={ns.column}>
      <div style={ns.colHeader}>
        <span style={ns.colHeading}>{icon} {heading}</span>
      </div>
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : showNoAddress ? (
        <p style={ns.noAddressMsg}>
          Complete your profile address to see hyperlocal pharmacy &amp; FDA news here.
        </p>
      ) : articles.length === 0 ? (
        <p style={ns.emptyMsg}>No updates right now — check back later.</p>
      ) : (
        articles.map((a, i) => <ArticleCard key={a.link + i} article={a} />)
      )}
    </div>
  )
}

export default function PharmaNewsFeed({ address }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pharma-news?address=' + encodeURIComponent(address || ''))
      const json = await res.json()
      setData(json)
    } catch {
      setData({ local: [], national: [], international: [], localAvailable: false })
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { fetchNews() }, [fetchNews])

  return (
    <div style={ns.wrap}>
      <div style={ns.sectionHeader}>
        <h3 style={ns.sectionTitle}>📰 Pharma News</h3>
        <button style={ns.refreshBtn} onClick={fetchNews} disabled={loading}>
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>
      <div style={ns.grid} className="pnf-grid">
        <Column
          icon="📍" heading="Near You"
          articles={data?.local || []}
          localAvailable={data?.localAvailable ?? false}
          isLocal={true}
          loading={loading}
        />
        <Column
          icon="🇮🇳" heading="India"
          articles={data?.national || []}
          localAvailable={true}
          isLocal={false}
          loading={loading}
        />
        <Column
          icon="🌍" heading="Global"
          articles={data?.international || []}
          localAvailable={true}
          isLocal={false}
          loading={loading}
        />
      </div>
      <style>{`
        @media (max-width: 768px) {
          .pnf-grid { flex-direction: column !important; }
        }
      `}</style>
    </div>
  )
}

const ns = {
  wrap: {
    padding: '0 16px 48px',
    maxWidth: 1100,
    margin: '0 auto',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: '#0f3460',
    margin: 0,
  },
  refreshBtn: {
    padding: '6px 14px',
    background: '#f0fdfd',
    color: '#0e9090',
    border: '1.5px solid #99f6e4',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  grid: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    minWidth: 0,
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  colHeader: {
    marginBottom: 10,
    borderBottom: '2px solid #f0fdfd',
    paddingBottom: 8,
  },
  colHeading: {
    fontSize: 14,
    fontWeight: 900,
    color: '#0f3460',
  },
  articleCard: {
    display: 'block',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  articleTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.45,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    marginBottom: 5,
  },
  articleMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  articleSource: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0e9090',
  },
  dot: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  articleTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 600,
  },
  noAddressMsg: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.5,
    fontWeight: 600,
    padding: '12px 0',
  },
  emptyMsg: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    padding: '12px 0',
  },
  skeletonCard: {
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  skeletonLine: {
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    borderRadius: 6,
    animation: 'skeleton-pulse 1.4s ease infinite',
  },
}
