import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

// Demo data for when Supabase is not connected
const DEMO_APPOINTMENTS = [
    {
        id: 1,
        customer_name: 'Merve Aktaş',
        customer_phone: '0(532) 123 45 67',
        service_title: 'Saç Kesimi',
        specialist_name: 'Ayşe Yılmaz',
        start_time: new Date().toISOString(),
        duration: 45,
        status: 'pending',
    },
    {
        id: 2,
        customer_name: 'Selin Yıldız',
        customer_phone: '0(555) 987 65 43',
        service_title: 'Cilt Bakımı',
        specialist_name: 'Fatma Demir',
        start_time: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        status: 'approved',
    },
]

export default function AdminPanel() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [password, setPassword] = useState('')
    const [loginError, setLoginError] = useState('')
    const [activeTab, setActiveTab] = useState('pending')
    const [appointments, setAppointments] = useState([])
    const [blacklist, setBlacklist] = useState([])
    const [loading, setLoading] = useState(false)

    // Blacklist form
    const [blName, setBlName] = useState('')
    const [blPhone, setBlPhone] = useState('')

    // Simple admin password (in production, use Supabase Auth)
    const ADMIN_PASSWORD = 'admin123'

    function handleLogin(e) {
        e.preventDefault()
        if (password === ADMIN_PASSWORD) {
            setIsLoggedIn(true)
            setLoginError('')
            loadAppointments()
            loadBlacklist()
        } else {
            setLoginError('Yanlış şifre!')
        }
    }

    async function loadAppointments() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .order('start_time', { ascending: false })

            if (!error && data && data.length > 0) {
                setAppointments(data)
            } else {
                setAppointments(DEMO_APPOINTMENTS)
            }
        } catch {
            setAppointments(DEMO_APPOINTMENTS)
        }
        setLoading(false)
    }

    async function loadBlacklist() {
        try {
            const { data, error } = await supabase
                .from('blacklist')
                .select('*')
                .order('created_at', { ascending: false })

            if (!error && data) {
                setBlacklist(data)
            }
        } catch {
            // No blacklist data
        }
    }

    async function updateStatus(id, newStatus) {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id)

            if (!error) {
                setAppointments(prev =>
                    prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
                )
            }
        } catch {
            // Update locally for demo
            setAppointments(prev =>
                prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
            )
        }
    }

    async function addToBlacklist() {
        if (!blName.trim() || !blPhone.trim()) return

        try {
            const { data, error } = await supabase
                .from('blacklist')
                .insert({ name: blName.trim(), phone: blPhone.trim() })
                .select()
                .single()

            if (!error && data) {
                setBlacklist(prev => [data, ...prev])
            } else {
                // Demo mode
                setBlacklist(prev => [{ id: Date.now(), name: blName.trim(), phone: blPhone.trim() }, ...prev])
            }
        } catch {
            setBlacklist(prev => [{ id: Date.now(), name: blName.trim(), phone: blPhone.trim() }, ...prev])
        }

        setBlName('')
        setBlPhone('')
    }

    async function removeFromBlacklist(id) {
        try {
            await supabase.from('blacklist').delete().eq('id', id)
        } catch {
            // Demo mode
        }
        setBlacklist(prev => prev.filter(b => b.id !== id))
    }

    function formatDate(isoStr) {
        const d = new Date(isoStr)
        return `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]} ${d.getFullYear()} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    const filteredAppointments = appointments.filter(a => {
        if (activeTab === 'all') return true
        return a.status === activeTab
    })

    // Login Screen
    if (!isLoggedIn) {
        return (
            <div className="admin-login">
                <form className="admin-login__card glass-card-solid" onSubmit={handleLogin}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: 48, height: 48, margin: '0 auto 1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--color-cream)', borderRadius: 'var(--radius-md)',
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="admin-login__title">Yönetici Girişi</h2>

                    {loginError && <div className="error-message">{loginError}</div>}

                    <div className="form-group">
                        <label className="form-label" htmlFor="admin-password">Şifre</label>
                        <input
                            id="admin-password"
                            className="form-input"
                            type="password"
                            placeholder="Yönetici şifresi"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" id="admin-login-btn">
                        Giriş Yap
                    </button>
                </form>
            </div>
        )
    }

    // Admin Dashboard
    return (
        <div className="admin-container animate-fade-in">
            <div className="admin-header">
                <h1 className="admin-title">Yönetici Paneli</h1>
                <button
                    className="btn btn-secondary"
                    onClick={() => setIsLoggedIn(false)}
                    id="admin-logout-btn"
                >
                    Çıkış Yap
                </button>
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
                {[
                    { key: 'pending', label: 'Bekleyenler' },
                    { key: 'approved', label: 'Onaylananlar' },
                    { key: 'rejected', label: 'Reddedilenler' },
                    { key: 'all', label: 'Tümü' },
                    { key: 'blacklist', label: 'Kara Liste' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        className={`admin-tab ${activeTab === tab.key ? 'admin-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                        id={`admin-tab-${tab.key}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Blacklist Tab */}
            {activeTab === 'blacklist' ? (
                <div className="animate-fade-in-up">
                    <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>Engellenen Kullanıcılar</h3>

                    <div className="blacklist-form">
                        <input
                            className="form-input"
                            placeholder="Ad Soyad"
                            value={blName}
                            onChange={(e) => setBlName(e.target.value)}
                        />
                        <input
                            className="form-input"
                            placeholder="Telefon"
                            value={blPhone}
                            onChange={(e) => setBlPhone(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={addToBlacklist} id="blacklist-add-btn">
                            Ekle
                        </button>
                    </div>

                    {blacklist.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state__icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <p className="empty-state__text">Engellenen kullanıcı bulunmuyor</p>
                        </div>
                    ) : (
                        blacklist.map((item) => (
                            <div key={item.id} className="blacklist-item">
                                <div className="blacklist-item__info">
                                    <div className="blacklist-item__name">{item.name}</div>
                                    <div className="blacklist-item__phone">{item.phone}</div>
                                </div>
                                <button
                                    className="btn-remove"
                                    onClick={() => removeFromBlacklist(item.id)}
                                >
                                    Kaldır
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Appointments List */
                <div className="animate-fade-in-up">
                    {loading ? (
                        <div className="loading-spinner" />
                    ) : filteredAppointments.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state__icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                                </svg>
                            </div>
                            <p className="empty-state__text">Bu kategoride randevu bulunmuyor</p>
                        </div>
                    ) : (
                        filteredAppointments.map((apt) => (
                            <div key={apt.id} className="admin-card">
                                <div className="admin-card__header">
                                    <span className="admin-card__name">{apt.customer_name}</span>
                                    <span className={`status-badge status-badge--${apt.status}`}>
                                        {apt.status === 'pending' && 'Bekliyor'}
                                        {apt.status === 'approved' && 'Onaylandı'}
                                        {apt.status === 'rejected' && 'Reddedildi'}
                                    </span>
                                </div>

                                <div className="admin-card__details">
                                    <span className="admin-card__detail-label">Telefon</span>
                                    <span className="admin-card__detail-value">{apt.customer_phone}</span>

                                    <span className="admin-card__detail-label">Hizmet</span>
                                    <span className="admin-card__detail-value">{apt.service_title}</span>

                                    <span className="admin-card__detail-label">Uzman</span>
                                    <span className="admin-card__detail-value">{apt.specialist_name}</span>

                                    <span className="admin-card__detail-label">Tarih & Saat</span>
                                    <span className="admin-card__detail-value">{formatDate(apt.start_time)}</span>

                                    <span className="admin-card__detail-label">Süre</span>
                                    <span className="admin-card__detail-value">{apt.duration} dk</span>
                                </div>

                                {apt.status === 'pending' && (
                                    <div className="admin-card__actions">
                                        <button
                                            className="btn-approve"
                                            onClick={() => updateStatus(apt.id, 'approved')}
                                            id={`approve-${apt.id}`}
                                        >
                                            Onayla
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => updateStatus(apt.id, 'rejected')}
                                            id={`reject-${apt.id}`}
                                        >
                                            Reddet
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
