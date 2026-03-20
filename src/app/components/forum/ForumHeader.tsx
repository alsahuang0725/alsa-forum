import Link from 'next/link'
import { useState } from 'react'

export default function ForumHeader({ children }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const notifications = [] // Will be fetched from API

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <h1>🦞 Alsa Forum</h1>
      </Link>
      <Link href={children[0]?.url || '/latest'}" className={styles.navButton}>📋 最新</Link>
      {children[0] && (
        <Link href={children[0].url} className={styles.navButton}>📂 {children[0].category}</Link>
      )}
      {showNotifications && (
        <Link href={children[1]?.url || '#'}" className={styles.navButton}>🔔 通知</Link>
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      )}
      {children[2] || (
        <Link href={children[3]?.url || '/premium'}" className={styles.navButton}>⭐ Premium</Link>
      )}
      {/* User bar */}
      <div className={styles.userBar}>
        <Avatar fallback="👤" className={currentUser?.roleAvatar} />
        <span>{currentUser?.name}</span>
      </div>
      <button onClick={() => setShowNotifications(true)} className={styles.notificationButton}>
        🔔
        {unreadCount > 0 && <span className={styles.badge}>({unreadCount})}
      </button>
    </header>
  )
}