import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function PhoneVerification({ phone, onVerified, onBack }) {
    const [step, setStep] = useState('send') // 'send' | 'verify'
    const [otpCode, setOtpCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [countdown, setCountdown] = useState(0)
    const [canResend, setCanResend] = useState(false)

    // Geri sayım
    useEffect(() => {
        if (countdown <= 0) {
            setCanResend(true)
            return
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [countdown])

    async function handleSendOtp() {
        if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
            setMessage({ type: 'error', text: 'Geçerli bir telefon numarası giriniz.' })
            return
        }

        setLoading(true)
        setMessage({ type: '', text: '' })

        try {
            const { data, error } = await supabase.rpc('send_otp', {
                phone_input: phone
            })

            if (error) throw error

            if (data?.success) {
                setStep('verify')
                setCountdown(120) // 2 dakika geri sayım
                setCanResend(false)
                setMessage({ type: 'success', text: 'Doğrulama kodu WhatsApp ile gönderildi!' })
            } else {
                setMessage({ type: 'error', text: data?.message || 'Kod gönderilemedi.' })
            }
        } catch (err) {
            console.error('OTP gönderme hatası:', err)
            setMessage({ type: 'error', text: 'Kod gönderilemedi. Lütfen tekrar deneyin.' })
        }

        setLoading(false)
    }

    async function handleVerifyOtp() {
        if (otpCode.length !== 6) {
            setMessage({ type: 'error', text: '6 haneli kodu giriniz.' })
            return
        }

        setLoading(true)
        setMessage({ type: '', text: '' })

        try {
            const { data, error } = await supabase.rpc('verify_otp', {
                phone_input: phone,
                code_input: otpCode
            })

            if (error) throw error

            if (data?.success) {
                setMessage({ type: 'success', text: 'Doğrulama başarılı!' })
                setTimeout(() => onVerified(), 500)
            } else {
                setMessage({ type: 'error', text: data?.message || 'Geçersiz kod.' })
            }
        } catch (err) {
            console.error('OTP doğrulama hatası:', err)
            setMessage({ type: 'error', text: 'Doğrulama başarısız. Tekrar deneyin.' })
        }

        setLoading(false)
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${String(s).padStart(2, '0')}`
    }

    return (
        <div className="animate-fade-in-up">
            <h2 className="step-title">Telefon Doğrulama</h2>
            <p className="step-description">
                {step === 'send'
                    ? 'Randevu oluşturmak için telefonunuzu doğrulayınız.'
                    : `${phone} numarasına WhatsApp ile gönderilen 6 haneli kodu giriniz.`
                }
            </p>

            {message.text && (
                <div className={message.type === 'error' ? 'error-message' : 'success-message'}
                    style={{ marginBottom: 'var(--space-4)' }}>
                    {message.text}
                </div>
            )}

            {step === 'send' ? (
                <>
                    {/* Telefon numarası gösterimi */}
                    <div className="confirmation-block" style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                background: '#25D366', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', flexShrink: 0,
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>
                                    {phone}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                    Bu numaraya WhatsApp ile kod gönderilecek
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary btn-full btn-lg"
                        onClick={handleSendOtp}
                        disabled={loading}
                        style={{ background: '#25D366', marginBottom: 'var(--space-3)' }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="loading-spinner" style={{ width: 18, height: 18, padding: 0 }} />
                                Gönderiliyor...
                            </span>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                </svg>
                                WhatsApp ile Kod Gönder
                            </>
                        )}
                    </button>
                </>
            ) : (
                <>
                    {/* OTP Giriş */}
                    <div className="form-group">
                        <label className="form-label">Doğrulama Kodu</label>
                        <input
                            className="form-input"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6 haneli kod"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            autoFocus
                            style={{
                                textAlign: 'center',
                                fontSize: 'var(--font-size-xl)',
                                letterSpacing: '0.3em',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                            }}
                        />
                    </div>

                    {/* Geri sayım */}
                    {countdown > 0 && (
                        <div style={{
                            textAlign: 'center', fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)',
                        }}>
                            Kodun geçerlilik süresi: <strong style={{ color: 'var(--color-accent)' }}>{formatTime(countdown)}</strong>
                        </div>
                    )}

                    <button
                        className="btn btn-primary btn-full"
                        onClick={handleVerifyOtp}
                        disabled={loading || otpCode.length !== 6}
                    >
                        {loading ? 'Doğrulanıyor...' : 'Doğrula ve Devam Et'}
                    </button>

                    {/* Tekrar gönder */}
                    {canResend && (
                        <button
                            className="btn btn-secondary btn-full"
                            style={{ marginTop: 'var(--space-3)' }}
                            onClick={() => {
                                setOtpCode('')
                                setMessage({ type: '', text: '' })
                                handleSendOtp()
                            }}
                        >
                            Yeni Kod Gönder
                        </button>
                    )}
                </>
            )}

            <div className="nav-row" style={{ marginTop: 'var(--space-4)' }}>
                <button className="btn btn-secondary" onClick={onBack}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Geri
                </button>
            </div>
        </div>
    )
}
