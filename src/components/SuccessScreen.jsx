const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

export default function SuccessScreen({ status, bookingData, bookingCode, onNewBooking }) {
    const isPending = status === 'pending'

    const dateStr = bookingData?.date
        ? `${bookingData.date.getDate()} ${TURKISH_MONTHS[bookingData.date.getMonth()]} ${bookingData.date.getFullYear()}`
        : ''

    return (
        <div className="success-screen">
            {/* Icon */}
            <div className="success-icon" style={isPending ? { background: '#fff8e6', color: '#c5a047' } : {}}>
                {isPending ? (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </div>

            {/* Title */}
            <h2 className="success-title">
                {isPending ? 'Randevunuz Bekleniyor' : 'Randevunuz Oluşturuldu'}
            </h2>

            {/* Message */}
            <p className="success-message">
                {isPending
                    ? 'Bu hafta aynı uzmandan daha önce randevu aldığınız için randevunuz yönetici onayına gönderildi. En kısa sürede bilgilendirileceksiniz.'
                    : 'Randevunuz başarıyla oluşturuldu. Belirlenen saatte sizi güzellik merkezimizde ağırlamaktan memnuniyet duyarız. İyi günler dileriz.'
                }
            </p>

            {/* Booking Code */}
            {bookingCode && (
                <div style={{
                    background: 'var(--color-cream)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-4) var(--space-5)',
                    marginBottom: 'var(--space-5)',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--space-2)',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                    }}>
                        Randevu Kodu
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        letterSpacing: '0.15em',
                        fontFamily: 'monospace, var(--font-family)',
                    }}>
                        {bookingCode}
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        marginTop: 'var(--space-2)',
                    }}>
                        WhatsApp üzerinden bu kodu göndererek randevunuzu sorgulayabilirsiniz.
                    </div>
                </div>
            )}

            {/* Booking Details */}
            {bookingData && (
                <div className="confirmation-block" style={{ textAlign: 'left', marginBottom: 'var(--space-6)' }}>
                    <div className="confirmation-row">
                        <span className="confirmation-label">Ad Soyad</span>
                        <span className="confirmation-value">{bookingData.customerName}</span>
                    </div>
                    <div className="confirmation-row">
                        <span className="confirmation-label">Telefon</span>
                        <span className="confirmation-value">{bookingData.customerPhone}</span>
                    </div>
                    <div className="confirmation-row">
                        <span className="confirmation-label">Hizmet</span>
                        <span className="confirmation-value">{bookingData.service?.title}</span>
                    </div>
                    <div className="confirmation-row">
                        <span className="confirmation-label">Uzman</span>
                        <span className="confirmation-value">{bookingData.specialist?.name}</span>
                    </div>
                    <div className="confirmation-row">
                        <span className="confirmation-label">Tarih</span>
                        <span className="confirmation-value">{dateStr}</span>
                    </div>
                    <div className="confirmation-row">
                        <span className="confirmation-label">Saat</span>
                        <span className="confirmation-value">{bookingData.time}</span>
                    </div>
                    {isPending && (
                        <div className="confirmation-row">
                            <span className="confirmation-label">Durum</span>
                            <span className="status-badge status-badge--pending">Onay Bekleniyor</span>
                        </div>
                    )}
                </div>
            )}

            <button
                className="btn btn-primary btn-lg"
                onClick={onNewBooking}
                id="new-booking-btn"
            >
                Yeni Randevu Oluştur
            </button>
        </div>
    )
}
