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

// Admin telefon numarası Supabase'de saklanır (admin_settings tablosu)

// Varsayılan şifre hash'i: 'GuzellikAdmin2026!'
const DEFAULT_ADMIN_HASH = 'ba1c62ac26d48607bdce9364a6911f33854c68e557cd4dbc95da600c6ba8152b'
// Tatil günleri yönetim bileşeni
function ClosedDaysTab() {
    const [closedDays, setClosedDays] = useState([])
    const [newDate, setNewDate] = useState('')
    const [newReason, setNewReason] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadClosedDays() }, [])

    async function loadClosedDays() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('closed_days')
                .select('*')
                .order('date', { ascending: true })
            if (!error && data) setClosedDays(data)
        } catch { }
        setLoading(false)
    }

    async function addClosedDay() {
        if (!newDate) return
        try {
            const { error } = await supabase
                .from('closed_days')
                .insert({ date: newDate, reason: newReason || 'Kapalı' })
            if (!error) {
                setNewDate('')
                setNewReason('')
                loadClosedDays()
            }
        } catch { }
    }

    async function removeClosedDay(id) {
        try {
            await supabase.from('closed_days').delete().eq('id', id)
            setClosedDays(prev => prev.filter(d => d.id !== id))
        } catch { }
    }

    const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00')
        return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    }

    // Bugünden önceki tarihleri filtrele
    const today = new Date().toISOString().split('T')[0]
    const futureDays = closedDays.filter(d => d.date >= today)
    const pastDays = closedDays.filter(d => d.date < today)

    return (
        <div className="animate-fade-in-up">
            <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>Tatil / Kapalı Günler</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                Kapalı olduğunuz günleri ekleyin. Bu günlerde müşteriler randevu alamaz.
            </p>

            {/* Yeni tatil ekle */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
                <input
                    className="form-input"
                    type="date"
                    min={today}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    style={{ flex: 1, minWidth: 150 }}
                />
                <input
                    className="form-input"
                    type="text"
                    placeholder="Sebep (isteğe bağlı)"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    style={{ flex: 2, minWidth: 150 }}
                />
                <button className="btn btn-primary" onClick={addClosedDay}>
                    Ekle
                </button>
            </div>

            {loading ? (
                <div className="loading-spinner" />
            ) : futureDays.length === 0 ? (
                <div className="empty-state">
                    <p className="empty-state__text">Tanımlı tatil günü bulunmuyor</p>
                </div>
            ) : (
                futureDays.map((day) => (
                    <div key={day.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--color-cream)', borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-2)',
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                📅 {formatDate(day.date)}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                {day.reason}
                            </div>
                        </div>
                        <button
                            className="btn-remove"
                            onClick={() => removeClosedDay(day.id)}
                            style={{ fontSize: 'var(--font-size-xs)' }}
                        >
                            Kaldır
                        </button>
                    </div>
                ))
            )}

            {pastDays.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    Geçmiş {pastDays.length} tatil günü gizlendi.
                </div>
            )}
        </div>
    )
}

export default function AdminPanel() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [password, setPassword] = useState('')
    const [loginError, setLoginError] = useState('')
    const [loginAttempts, setLoginAttempts] = useState(0)
    const [lockUntil, setLockUntil] = useState(null)
    const [activeTab, setActiveTab] = useState('pending')
    const [appointments, setAppointments] = useState([])
    const [blacklist, setBlacklist] = useState([])
    const [specialistsList, setSpecialistsList] = useState([])
    const [loading, setLoading] = useState(false)
    const [sessionStart, setSessionStart] = useState(null)

    // Şifre yönetimi
    const [adminHash, setAdminHash] = useState(() => {
        return localStorage.getItem('admin_hash') || DEFAULT_ADMIN_HASH
    })

    // Şifre değiştirme formu
    const [currentPwd, setCurrentPwd] = useState('')
    const [newPwd, setNewPwd] = useState('')
    const [confirmPwd, setConfirmPwd] = useState('')
    const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' })

    // Şifre sıfırlama (WhatsApp OTP ile)
    const [showRecovery, setShowRecovery] = useState(false)
    const [recoveryStep, setRecoveryStep] = useState('send') // 'send' | 'verify' | 'newpwd'
    const [recoveryOtp, setRecoveryOtp] = useState('')
    const [recoveryNewPwd, setRecoveryNewPwd] = useState('')
    const [recoveryConfirmPwd, setRecoveryConfirmPwd] = useState('')
    const [recoveryMessage, setRecoveryMessage] = useState({ type: '', text: '' })
    const [recoveryLoading, setRecoveryLoading] = useState(false)
    const [recoveryCountdown, setRecoveryCountdown] = useState(0)

    // Silme onayı
    const [deleteConfirmId, setDeleteConfirmId] = useState(null)

    // Blacklist form
    const [blName, setBlName] = useState('')
    const [blPhone, setBlPhone] = useState('')

    // SHA-256 hash fonksiyonu
    async function hashPassword(pwd) {
        const encoder = new TextEncoder()
        const data = encoder.encode(pwd)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // Oturum zaman aşımı kontrolü (30 dakika)
    useEffect(() => {
        if (!isLoggedIn || !sessionStart) return
        const timer = setInterval(() => {
            const elapsed = Date.now() - sessionStart
            if (elapsed > 30 * 60 * 1000) {
                setIsLoggedIn(false)
                setSessionStart(null)
                alert('Oturum süresi doldu. Lütfen tekrar giriş yapınız.')
            }
        }, 60000)
        return () => clearInterval(timer)
    }, [isLoggedIn, sessionStart])

    async function handleLogin(e) {
        e.preventDefault()

        if (lockUntil && Date.now() < lockUntil) {
            const remaining = Math.ceil((lockUntil - Date.now()) / 60000)
            setLoginError(`Çok fazla hatalı deneme. ${remaining} dakika sonra tekrar deneyiniz.`)
            return
        }

        const hashedInput = await hashPassword(password)
        if (hashedInput === adminHash) {
            setIsLoggedIn(true)
            setLoginError('')
            setLoginAttempts(0)
            setLockUntil(null)
            setSessionStart(Date.now())
            loadAppointments()
            loadBlacklist()
            loadSpecialists()
        } else {
            const newAttempts = loginAttempts + 1
            setLoginAttempts(newAttempts)
            if (newAttempts >= 5) {
                setLockUntil(Date.now() + 5 * 60 * 1000)
                setLoginError('5 hatalı deneme! 5 dakika boyunca giriş yapılamaz.')
                setLoginAttempts(0)
            } else {
                setLoginError(`Yanlış şifre! (${5 - newAttempts} deneme hakkınız kaldı)`)
            }
        }
    }

    // Şifre değiştirme
    async function handleChangePassword(e) {
        e.preventDefault()
        setPwdMessage({ type: '', text: '' })

        if (!currentPwd || !newPwd || !confirmPwd) {
            setPwdMessage({ type: 'error', text: 'Tüm alanları doldurunuz.' })
            return
        }

        const currentHash = await hashPassword(currentPwd)
        if (currentHash !== adminHash) {
            setPwdMessage({ type: 'error', text: 'Mevcut şifre yanlış!' })
            return
        }

        if (newPwd.length < 8) {
            setPwdMessage({ type: 'error', text: 'Yeni şifre en az 8 karakter olmalıdır.' })
            return
        }

        if (newPwd !== confirmPwd) {
            setPwdMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor!' })
            return
        }

        const newHash = await hashPassword(newPwd)
        setAdminHash(newHash)
        localStorage.setItem('admin_hash', newHash)

        // Supabase'e de kaydet (varsa)
        try {
            await supabase.from('admin_settings')
                .upsert({ key: 'admin_hash', value: newHash }, { onConflict: 'key' })
        } catch {
            // Supabase yoksa sadece localStorage'da kalır
        }

        setPwdMessage({ type: 'success', text: 'Şifre başarıyla değiştirildi!' })
        setCurrentPwd('')
        setNewPwd('')
        setConfirmPwd('')
    }

    // WhatsApp OTP geri sayım
    useEffect(() => {
        if (recoveryCountdown <= 0) return
        const timer = setTimeout(() => setRecoveryCountdown(c => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [recoveryCountdown])

    // WhatsApp ile şifre sıfırlama kodu gönder
    async function handleSendRecoveryOtp() {
        setRecoveryLoading(true)
        setRecoveryMessage({ type: '', text: '' })
        try {
            const { data, error } = await supabase.rpc('send_admin_reset_otp')
            if (error) throw error
            if (data?.success) {
                setRecoveryStep('verify')
                setRecoveryCountdown(120)
                setRecoveryMessage({ type: 'success', text: 'Doğrulama kodu WhatsApp ile gönderildi!' })
            } else {
                setRecoveryMessage({ type: 'error', text: data?.message || 'Kod gönderilemedi.' })
            }
        } catch {
            setRecoveryMessage({ type: 'error', text: 'Kod gönderilemedi. Tekrar deneyin.' })
        }
        setRecoveryLoading(false)
    }

    // OTP doğrula
    async function handleVerifyRecoveryOtp() {
        if (recoveryOtp.length !== 6) {
            setRecoveryMessage({ type: 'error', text: '6 haneli kodu giriniz.' })
            return
        }
        setRecoveryLoading(true)
        setRecoveryMessage({ type: '', text: '' })
        try {
            const { data, error } = await supabase.rpc('verify_admin_reset_otp', {
                code_input: recoveryOtp
            })
            if (error) throw error
            if (data?.success) {
                setRecoveryStep('newpwd')
                setRecoveryMessage({ type: 'success', text: 'Doğrulama başarılı! Yeni şifrenizi belirleyin.' })
            } else {
                setRecoveryMessage({ type: 'error', text: data?.message || 'Geçersiz kod.' })
            }
        } catch {
            setRecoveryMessage({ type: 'error', text: 'Doğrulama başarısız.' })
        }
        setRecoveryLoading(false)
    }

    // Yeni şifre kaydet
    async function handleRecoveryReset(e) {
        e.preventDefault()
        setRecoveryMessage({ type: '', text: '' })

        if (recoveryNewPwd.length < 8) {
            setRecoveryMessage({ type: 'error', text: 'Yeni şifre en az 8 karakter olmalıdır.' })
            return
        }

        if (recoveryNewPwd !== recoveryConfirmPwd) {
            setRecoveryMessage({ type: 'error', text: 'Şifreler eşleşmiyor!' })
            return
        }

        const newHash = await hashPassword(recoveryNewPwd)
        setAdminHash(newHash)
        localStorage.setItem('admin_hash', newHash)

        try {
            await supabase.from('admin_settings')
                .upsert({ key: 'admin_hash', value: newHash }, { onConflict: 'key' })
        } catch { }

        setRecoveryMessage({ type: 'success', text: 'Şifre başarıyla sıfırlandı! Yeni şifrenizle giriş yapabilirsiniz.' })
        setRecoveryOtp('')
        setRecoveryNewPwd('')
        setRecoveryConfirmPwd('')

        setTimeout(() => {
            setShowRecovery(false)
            setRecoveryStep('send')
            setRecoveryMessage({ type: '', text: '' })
        }, 3000)
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
        } catch { }
    }

    async function loadSpecialists() {
        try {
            const { data, error } = await supabase
                .from('specialists')
                .select('*')
                .order('id')

            if (!error && data) {
                setSpecialistsList(data)
            }
        } catch { }
    }

    async function toggleSpecialistActive(id, currentStatus) {
        const newStatus = !currentStatus
        try {
            const { error } = await supabase
                .from('specialists')
                .update({ is_active: newStatus })
                .eq('id', id)

            if (!error) {
                setSpecialistsList(prev =>
                    prev.map(s => s.id === id ? { ...s, is_active: newStatus } : s)
                )
            }
        } catch {
            setSpecialistsList(prev =>
                prev.map(s => s.id === id ? { ...s, is_active: newStatus } : s)
            )
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
            setAppointments(prev =>
                prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
            )
        }
    }

    // Randevu silme
    async function deleteAppointment(id) {
        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id)

            if (!error) {
                setAppointments(prev => prev.filter(a => a.id !== id))
            }
        } catch {
            setAppointments(prev => prev.filter(a => a.id !== id))
        }
        setDeleteConfirmId(null)
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
        } catch { }
        setBlacklist(prev => prev.filter(b => b.id !== id))
    }

    function formatDate(isoStr) {
        const d = new Date(isoStr)
        return `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
    }

    const filteredAppointments = appointments.filter(a => {
        if (activeTab === 'all') return true
        return a.status === activeTab
    })

    // ===== LOGIN SCREEN =====
    if (!isLoggedIn) {
        return (
            <div className="admin-login">
                {showRecovery ? (
                    // Kurtarma kodu ile şifre sıfırlama
                    <form className="admin-login__card glass-card-solid" onSubmit={handleRecoveryReset}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: 48, height: 48, margin: '0 auto 1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#fff3e0', borderRadius: 'var(--radius-md)',
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="admin-login__title">Şifre Sıfırlama</h2>

                        {recoveryMessage.text && (
                            <div className={recoveryMessage.type === 'error' ? 'error-message' : 'success-message'}>
                                {recoveryMessage.text}
                            </div>
                        )}

                        {recoveryStep === 'send' && (
                            <>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                                    Admin telefonuna WhatsApp ile doğrulama kodu gönderilecektir.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-full"
                                    onClick={handleSendRecoveryOtp}
                                    disabled={recoveryLoading}
                                    style={{ background: '#25D366' }}
                                >
                                    {recoveryLoading ? 'Gönderiliyor...' : (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                            </svg>
                                            WhatsApp ile Kod Gönder
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        {recoveryStep === 'verify' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Doğrulama Kodu</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="6 haneli kod"
                                        value={recoveryOtp}
                                        onChange={(e) => setRecoveryOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                        autoFocus
                                        style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', letterSpacing: '0.3em', fontFamily: 'monospace', fontWeight: 700 }}
                                    />
                                </div>
                                {recoveryCountdown > 0 && (
                                    <div style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                                        Kalan süre: <strong style={{ color: 'var(--color-accent)' }}>{Math.floor(recoveryCountdown / 60)}:{String(recoveryCountdown % 60).padStart(2, '0')}</strong>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-primary btn-full"
                                    onClick={handleVerifyRecoveryOtp}
                                    disabled={recoveryLoading || recoveryOtp.length !== 6}
                                >
                                    {recoveryLoading ? 'Doğrulanıyor...' : 'Doğrula'}
                                </button>
                            </>
                        )}

                        {recoveryStep === 'newpwd' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Yeni Şifre</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        placeholder="Yeni şifre (min. 8 karakter)"
                                        value={recoveryNewPwd}
                                        onChange={(e) => setRecoveryNewPwd(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Yeni Şifre (Tekrar)</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        placeholder="Yeni şifreyi tekrar giriniz"
                                        value={recoveryConfirmPwd}
                                        onChange={(e) => setRecoveryConfirmPwd(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-full">
                                    Şifreyi Sıfırla
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            className="btn btn-secondary btn-full"
                            style={{ marginTop: 'var(--space-3)' }}
                            onClick={() => { setShowRecovery(false); setRecoveryStep('send'); setRecoveryOtp(''); setRecoveryMessage({ type: '', text: '' }) }}
                        >
                            Giriş Ekranına Dön
                        </button>
                    </form>
                ) : (
                    // Normal giriş
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
                        <button
                            type="button"
                            style={{
                                background: 'none', border: 'none', color: 'var(--color-accent)',
                                fontSize: 'var(--font-size-sm)', cursor: 'pointer',
                                marginTop: 'var(--space-4)', width: '100%', textAlign: 'center',
                            }}
                            onClick={() => setShowRecovery(true)}
                        >
                            Şifremi Unuttum
                        </button>
                    </form>
                )}
            </div>
        )
    }

    // ===== ADMIN DASHBOARD =====
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
                    { key: 'stats', label: '📊 İstatistik' },
                    { key: 'closeddays', label: '📅 Tatil' },
                    { key: 'blacklist', label: 'Kara Liste' },
                    { key: 'specialists', label: 'Uzmanlar' },
                    { key: 'settings', label: '⚙ Ayarlar' },
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

            {/* ===== AYARLAR TAB ===== */}
            {activeTab === 'settings' ? (
                <div className="animate-fade-in-up">
                    <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>Şifre Değiştir</h3>

                    {pwdMessage.text && (
                        <div className={pwdMessage.type === 'error' ? 'error-message' : 'success-message'}
                            style={{ marginBottom: 'var(--space-4)' }}>
                            {pwdMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label className="form-label">Mevcut Şifre</label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Mevcut şifrenizi giriniz"
                                value={currentPwd}
                                onChange={(e) => setCurrentPwd(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Yeni Şifre</label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Yeni şifre (min. 8 karakter)"
                                value={newPwd}
                                onChange={(e) => setNewPwd(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Yeni Şifre (Tekrar)</label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Yeni şifreyi tekrar giriniz"
                                value={confirmPwd}
                                onChange={(e) => setConfirmPwd(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-2)' }}>
                            Şifreyi Değiştir
                        </button>
                    </form>

                    <div style={{
                        marginTop: 'var(--space-6)',
                        padding: 'var(--space-4)',
                        background: '#e8f5e9',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '4px solid #25D366',
                    }}>
                        <strong style={{ fontSize: 'var(--font-size-sm)', color: '#2d6a32' }}>
                            Şifre Kurtarma
                        </strong>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: '#2d6a32', margin: '8px 0 0' }}>
                            Şifrenizi unuttuğunuzda giriş ekranındaki "Şifremi Unuttum" bağlantısını kullanarak
                            WhatsApp üzerinden doğrulama kodu ile sıfırlayabilirsiniz.
                        </p>
                    </div>
                </div>

            ) : activeTab === 'stats' ? (
                /* ===== İSTATİSTİK TAB ===== */
                (() => {
                    const now = new Date()
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                    const weekAgo = new Date(now.getTime() - 7 * 86400000)
                    const monthAgo = new Date(now.getTime() - 30 * 86400000)

                    const todayApts = appointments.filter(a => a.start_time && a.start_time.startsWith(todayStr))
                    const weekApts = appointments.filter(a => a.start_time && new Date(a.start_time) >= weekAgo)
                    const monthApts = appointments.filter(a => a.start_time && new Date(a.start_time) >= monthAgo)

                    const approved = appointments.filter(a => a.status === 'approved').length
                    const pending = appointments.filter(a => a.status === 'pending').length
                    const rejected = appointments.filter(a => a.status === 'rejected').length

                    // En popüler hizmetler
                    const serviceCounts = {}
                    appointments.forEach(a => {
                        if (a.service_title) {
                            serviceCounts[a.service_title] = (serviceCounts[a.service_title] || 0) + 1
                        }
                    })
                    const topServices = Object.entries(serviceCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)

                    // En çok randevu alan uzmanlar
                    const specCounts = {}
                    appointments.forEach(a => {
                        if (a.specialist_name) {
                            specCounts[a.specialist_name] = (specCounts[a.specialist_name] || 0) + 1
                        }
                    })
                    const topSpecs = Object.entries(specCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)

                    const statCardStyle = {
                        padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                        textAlign: 'center', flex: 1, minWidth: 100,
                    }

                    return (
                        <div className="animate-fade-in-up">
                            <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>İstatistikler</h3>

                            {/* Özet Kartları */}
                            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
                                <div style={{ ...statCardStyle, background: '#e3f2fd' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1565c0' }}>{todayApts.length}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#1565c0', fontWeight: 500 }}>Bugün</div>
                                </div>
                                <div style={{ ...statCardStyle, background: '#f3e5f5' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#7b1fa2' }}>{weekApts.length}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#7b1fa2', fontWeight: 500 }}>Bu Hafta</div>
                                </div>
                                <div style={{ ...statCardStyle, background: '#fff3e0' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#e65100' }}>{monthApts.length}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#e65100', fontWeight: 500 }}>Bu Ay</div>
                                </div>
                                <div style={{ ...statCardStyle, background: '#e8f5e9' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#2d6a32' }}>{appointments.length}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#2d6a32', fontWeight: 500 }}>Toplam</div>
                                </div>
                            </div>

                            {/* Durum Dağılımı */}
                            <div style={{
                                background: 'var(--color-cream)', borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-4)', marginBottom: 'var(--space-4)',
                            }}>
                                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Durum Dağılımı</h4>
                                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>✅ Onaylanan: <strong>{approved}</strong></span>
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>⏳ Bekleyen: <strong>{pending}</strong></span>
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>❌ Reddedilen: <strong>{rejected}</strong></span>
                                </div>
                                {appointments.length > 0 && (
                                    <div style={{ marginTop: 'var(--space-3)', height: 8, borderRadius: 4, background: '#e5e7eb', display: 'flex', overflow: 'hidden' }}>
                                        <div style={{ width: `${(approved / appointments.length * 100)}%`, background: '#22c55e', transition: 'width 0.5s' }} />
                                        <div style={{ width: `${(pending / appointments.length * 100)}%`, background: '#f59e0b', transition: 'width 0.5s' }} />
                                        <div style={{ width: `${(rejected / appointments.length * 100)}%`, background: '#ef4444', transition: 'width 0.5s' }} />
                                    </div>
                                )}
                            </div>

                            {/* En Popüler Hizmetler */}
                            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 200, background: 'var(--color-cream)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>🏆 En Popüler Hizmetler</h4>
                                    {topServices.length === 0 ? (
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Henüz veri yok</p>
                                    ) : topServices.map(([name, count], i) => (
                                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < topServices.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{i + 1}. {name}</span>
                                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-accent)' }}>{count}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ flex: 1, minWidth: 200, background: 'var(--color-cream)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>👩 En Çok Tercih Edilen Uzmanlar</h4>
                                    {topSpecs.length === 0 ? (
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Henüz veri yok</p>
                                    ) : topSpecs.map(([name, count], i) => (
                                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < topSpecs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{i + 1}. {name}</span>
                                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-accent)' }}>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                })()

            ) : activeTab === 'closeddays' ? (
                /* ===== TATİL GÜNLERİ TAB ===== */
                <ClosedDaysTab />

            ) : activeTab === 'specialists' ? (
                /* ===== UZMANLAR TAB ===== */
                <div className="animate-fade-in-up">
                    <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>Uzman Yönetimi</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                        Pasif olan uzmanlar randevu ekranında görünmez.
                    </p>

                    {specialistsList.length === 0 ? (
                        <div className="empty-state">
                            <p className="empty-state__text">Uzman bulunamadı</p>
                        </div>
                    ) : (
                        specialistsList.map((spec) => (
                            <div key={spec.id} className="admin-card" style={{ marginBottom: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>
                                            {spec.name}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                            {spec.role}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            fontSize: 'var(--font-size-xs)', fontWeight: 600,
                                            color: spec.is_active !== false ? '#16a34a' : '#dc2626',
                                        }}>
                                            <span style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: spec.is_active !== false ? '#16a34a' : '#dc2626',
                                                display: 'inline-block',
                                            }} />
                                            {spec.is_active !== false ? 'Aktif' : 'Pasif'}
                                        </span>
                                        <button
                                            className={spec.is_active !== false ? 'btn-reject' : 'btn-approve'}
                                            onClick={() => toggleSpecialistActive(spec.id, spec.is_active !== false)}
                                            style={{ fontSize: 'var(--font-size-xs)', padding: '6px 14px' }}
                                        >
                                            {spec.is_active !== false ? 'Pasife Al' : 'Aktif Et'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            ) : activeTab === 'blacklist' ? (
                /* ===== KARA LISTE TAB ===== */
                <div className="animate-fade-in-up">
                    <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>Engellenen Kullanıcılar</h3>

                    <div className="blacklist-form">
                        <input className="form-input" placeholder="Ad Soyad"
                            value={blName} onChange={(e) => setBlName(e.target.value)} />
                        <input className="form-input" placeholder="Telefon"
                            value={blPhone} onChange={(e) => setBlPhone(e.target.value)} />
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
                                <button className="btn-remove" onClick={() => removeFromBlacklist(item.id)}>
                                    Kaldır
                                </button>
                            </div>
                        ))
                    )}
                </div>

            ) : (
                /* ===== RANDEVULAR LİSTESİ ===== */
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

                                    <span className="admin-card__detail-label">Tarih</span>
                                    <span className="admin-card__detail-value">{formatDate(apt.start_time)}</span>

                                    <span className="admin-card__detail-label">Saat</span>
                                    <span className="admin-card__detail-value">{apt.appointment_time || '—'}</span>

                                    <span className="admin-card__detail-label">Süre</span>
                                    <span className="admin-card__detail-value">{apt.duration} dk</span>

                                    {apt.booking_code && (
                                        <>
                                            <span className="admin-card__detail-label">Randevu Kodu</span>
                                            <span className="admin-card__detail-value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                                {apt.booking_code}
                                            </span>
                                        </>
                                    )}
                                </div>

                                <div className="admin-card__actions">
                                    {/* Onay/Red: sadece bekleyenler için */}
                                    {apt.status === 'pending' && (
                                        <>
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
                                        </>
                                    )}

                                    {/* Silme butonu: tüm durumlar için */}
                                    {deleteConfirmId === apt.id ? (
                                        <div style={{
                                            display: 'flex', gap: 'var(--space-2)', alignItems: 'center',
                                            background: '#fef2f2', padding: '6px 10px', borderRadius: '6px',
                                        }}>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: '#dc2626', fontWeight: 500 }}>
                                                Silmek istediğinizden emin misiniz?
                                            </span>
                                            <button
                                                style={{
                                                    background: '#dc2626', color: 'white', border: 'none',
                                                    padding: '4px 10px', borderRadius: '4px', fontSize: 'var(--font-size-xs)',
                                                    cursor: 'pointer', fontWeight: 600,
                                                }}
                                                onClick={() => deleteAppointment(apt.id)}
                                            >
                                                Evet, Sil
                                            </button>
                                            <button
                                                style={{
                                                    background: '#e5e7eb', color: '#374151', border: 'none',
                                                    padding: '4px 10px', borderRadius: '4px', fontSize: 'var(--font-size-xs)',
                                                    cursor: 'pointer', fontWeight: 500,
                                                }}
                                                onClick={() => setDeleteConfirmId(null)}
                                            >
                                                İptal
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            style={{
                                                background: 'none', border: '1px solid #fecaca', color: '#dc2626',
                                                padding: '4px 12px', borderRadius: '6px', fontSize: 'var(--font-size-xs)',
                                                cursor: 'pointer', fontWeight: 500,
                                                transition: 'all 0.2s',
                                            }}
                                            onClick={() => setDeleteConfirmId(apt.id)}
                                            onMouseOver={(e) => { e.target.style.background = '#fef2f2' }}
                                            onMouseOut={(e) => { e.target.style.background = 'none' }}
                                        >
                                            🗑 Sil
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
