const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

export default function SuccessScreen({ bookingResults, customerInfo, onNewBooking }) {
    const hasPending = bookingResults.some(r => r.status === 'pending')
    const allPending = bookingResults.every(r => r.status === 'pending')

    return (
        <div className="success-screen">
            {/* Icon */}
            <div className="success-icon" style={hasPending ? { background: '#fff8e6', color: '#c5a047' } : {}}>
                {hasPending ? (
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
                {allPending
                    ? 'Randevularınız Bekleniyor'
                    : hasPending
                        ? 'Randevularınız İşleniyor'
                        : bookingResults.length > 1
                            ? 'Randevularınız Oluşturuldu'
                            : 'Randevunuz Oluşturuldu'
                }
            </h2>

            {/* Message */}
            <p className="success-message">
                {hasPending
                    ? 'Bazı randevularınız yönetici onayına gönderildi. En kısa sürede bilgilendirileceksiniz.'
                    : 'Randevularınız başarıyla oluşturuldu. Belirlenen saatlerde sizi güzellik merkezimizde ağırlamaktan memnuniyet duyarız. İyi günler dileriz.'
                }
            </p>

            {/* Her randevu için detay ve kod */}
            {bookingResults.map((result, index) => {
                const group = result.group
                const dateStr = group?.date
                    ? `${group.date.getDate()} ${TURKISH_MONTHS[group.date.getMonth()]} ${group.date.getFullYear()}`
                    : ''
                const serviceTitles = group?.services?.map(s => s.title).join(', ') || ''

                return (
                    <div key={index} style={{ marginBottom: 'var(--space-4)' }}>
                        {/* Booking Code */}
                        <div style={{
                            background: 'var(--color-cream)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-3) var(--space-4)',
                            marginBottom: 'var(--space-3)',
                            textAlign: 'center',
                        }}>
                            {bookingResults.length > 1 && (
                                <div style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-accent)',
                                    fontWeight: 700,
                                    marginBottom: 'var(--space-1)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                }}>
                                    Randevu {index + 1} — {serviceTitles}
                                </div>
                            )}
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-muted)',
                                marginBottom: 'var(--space-1)',
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
                                {result.code}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="confirmation-block" style={{ textAlign: 'left' }}>
                            <div className="confirmation-row">
                                <span className="confirmation-label">Hizmetler</span>
                                <span className="confirmation-value">{serviceTitles}</span>
                            </div>
                            <div className="confirmation-row">
                                <span className="confirmation-label">Uzman</span>
                                <span className="confirmation-value">{group?.specialist?.name}</span>
                            </div>
                            <div className="confirmation-row">
                                <span className="confirmation-label">Tarih</span>
                                <span className="confirmation-value">{dateStr}</span>
                            </div>
                            <div className="confirmation-row">
                                <span className="confirmation-label">Saat</span>
                                <span className="confirmation-value">{group?.time}</span>
                            </div>
                            {result.status === 'pending' && (
                                <div className="confirmation-row">
                                    <span className="confirmation-label">Durum</span>
                                    <span className="status-badge status-badge--pending">Onay Bekleniyor</span>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}

            <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
                marginBottom: 'var(--space-5)',
            }}>
                WhatsApp üzerinden randevu kodunuzu göndererek randevunuzu sorgulayabilirsiniz.
            </div>

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
