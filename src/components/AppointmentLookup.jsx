import { useState } from 'react'
import { supabase } from '../supabaseClient'

const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

export default function AppointmentLookup({ onClose }) {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    async function handleSearch(e) {
        e.preventDefault()
        if (!code.trim() || code.trim().length < 5) {
            setError('Geçerli bir randevu kodu giriniz.')
            return
        }

        setLoading(true)
        setError('')
        setResult(null)

        try {
            const { data, error: dbError } = await supabase
                .from('appointments')
                .select('*')
                .eq('booking_code', code.trim().toUpperCase())
                .single()

            if (dbError || !data) {
                setError('Bu kodla randevu bulunamadı.')
            } else {
                setResult(data)
            }
        } catch {
            setError('Sorgulama yapılamadı. Lütfen tekrar deneyin.')
        }

        setLoading(false)
    }

    function formatDate(isoStr) {
        if (!isoStr) return '—'
        const d = new Date(isoStr)
        return `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
    }

    function getStatusInfo(status) {
        switch (status) {
            case 'pending': return { label: 'Onay Bekliyor', color: '#856404', bg: '#fff3cd', icon: '⏳' }
            case 'approved': return { label: 'Onaylandı', color: '#2d6a32', bg: '#d4edda', icon: '✅' }
            case 'rejected': return { label: 'Reddedildi', color: '#a53030', bg: '#f8d7da', icon: '❌' }
            default: return { label: status, color: '#666', bg: '#eee', icon: '❓' }
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-4)',
            animation: 'fadeIn 0.3s ease',
        }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="glass-card-solid" style={{
                width: '100%', maxWidth: 420, padding: 'var(--space-6)',
                animation: 'scaleIn 0.3s ease',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                        Randevu Sorgula
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', fontSize: '20px',
                        cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px',
                    }}>✕</button>
                </div>

                {/* Arama Formu */}
                {!result && (
                    <form onSubmit={handleSearch}>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                            Randevu kodunuzu girerek randevunuzun durumunu sorgulayabilirsiniz.
                        </p>

                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label className="form-label">Randevu Kodu</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Örn: 5NJB27K9NM"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                autoFocus
                                style={{
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    fontSize: 'var(--font-size-md)',
                                    textAlign: 'center',
                                }}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? 'Sorgulanıyor...' : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    Sorgula
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Sonuç */}
                {result && (() => {
                    const statusInfo = getStatusInfo(result.status)
                    return (
                        <div className="animate-fade-in-up">
                            {/* Durum Kartı */}
                            <div style={{
                                textAlign: 'center', padding: 'var(--space-5)',
                                background: statusInfo.bg, borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-4)',
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: 'var(--space-2)' }}>
                                    {statusInfo.icon}
                                </div>
                                <div style={{
                                    fontWeight: 700, fontSize: 'var(--font-size-md)',
                                    color: statusInfo.color,
                                }}>
                                    {statusInfo.label}
                                </div>
                            </div>

                            {/* Detaylar */}
                            <div className="confirmation-block">
                                <div className="confirmation-row">
                                    <span className="confirmation-label">Randevu Kodu</span>
                                    <span className="confirmation-value" style={{ fontFamily: 'monospace' }}>
                                        {result.booking_code}
                                    </span>
                                </div>
                                <div className="confirmation-row">
                                    <span className="confirmation-label">Ad Soyad</span>
                                    <span className="confirmation-value">{result.customer_name}</span>
                                </div>
                                <div className="confirmation-row">
                                    <span className="confirmation-label">Hizmet</span>
                                    <span className="confirmation-value">{result.service_title}</span>
                                </div>
                                <div className="confirmation-row">
                                    <span className="confirmation-label">Uzman</span>
                                    <span className="confirmation-value">{result.specialist_name}</span>
                                </div>
                                <div className="confirmation-row">
                                    <span className="confirmation-label">Tarih</span>
                                    <span className="confirmation-value">{formatDate(result.start_time)}</span>
                                </div>
                                <div className="confirmation-row">
                                    <span className="confirmation-label">Saat</span>
                                    <span className="confirmation-value">{result.appointment_time || '—'}</span>
                                </div>
                                <div className="confirmation-row">
                                    <span className="confirmation-label">Süre</span>
                                    <span className="confirmation-value">{result.duration} dk</span>
                                </div>
                            </div>

                            <button className="btn btn-secondary btn-full" onClick={() => { setResult(null); setCode('') }}
                                style={{ marginTop: 'var(--space-3)' }}>
                                Başka Randevu Sorgula
                            </button>
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}
