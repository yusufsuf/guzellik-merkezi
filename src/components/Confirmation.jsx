const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

export default function Confirmation({ customerInfo, groups, onConfirm, onBack, isSubmitting }) {
    const totalPrice = groups.reduce((sum, g) =>
        sum + g.services.reduce((s, svc) => s + Number(svc.price), 0), 0
    )
    const totalDuration = groups.reduce((sum, g) =>
        sum + g.services.reduce((s, svc) => s + svc.duration, 0), 0
    )

    return (
        <div className="animate-fade-in-up">
            <h2 className="step-title">Randevu Özeti</h2>
            <p className="step-description">
                Lütfen bilgilerinizi kontrol edip onaylayınız.
            </p>

            {/* Müşteri bilgileri */}
            <div className="confirmation-block">
                <div className="confirmation-row">
                    <span className="confirmation-label">Ad Soyad</span>
                    <span className="confirmation-value">{customerInfo.customerName}</span>
                </div>
                <div className="confirmation-row">
                    <span className="confirmation-label">Telefon</span>
                    <span className="confirmation-value">{customerInfo.customerPhone}</span>
                </div>
            </div>

            {/* Her randevu grubu */}
            {groups.map((group, index) => {
                const dateStr = group.date
                    ? `${group.date.getDate()} ${TURKISH_MONTHS[group.date.getMonth()]} ${group.date.getFullYear()}`
                    : ''
                const groupDuration = group.services.reduce((s, svc) => s + svc.duration, 0)
                const groupPrice = group.services.reduce((s, svc) => s + Number(svc.price), 0)

                return (
                    <div key={index} className="confirmation-block" style={{ marginTop: 'var(--space-4)' }}>
                        {groups.length > 1 && (
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 700,
                                color: 'var(--color-accent)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                marginBottom: 'var(--space-2)',
                                paddingBottom: 'var(--space-2)',
                                borderBottom: '1px solid var(--color-border)',
                            }}>
                                Randevu {index + 1}
                            </div>
                        )}
                        <div className="confirmation-row" style={{ alignItems: 'flex-start' }}>
                            <span className="confirmation-label">Hizmetler</span>
                            <span className="confirmation-value" style={{ textAlign: 'right' }}>
                                {group.services.map((s, i) => (
                                    <div key={s.id} style={{ marginBottom: i < group.services.length - 1 ? '4px' : 0 }}>
                                        {s.title}
                                        <span style={{
                                            color: 'var(--color-text-muted)',
                                            fontSize: 'var(--font-size-xs)',
                                            marginLeft: '6px'
                                        }}>
                                            {s.duration}dk • {s.price}₺
                                        </span>
                                    </div>
                                ))}
                            </span>
                        </div>
                        <div className="confirmation-row">
                            <span className="confirmation-label">Uzman</span>
                            <span className="confirmation-value">{group.specialist?.name}</span>
                        </div>
                        <div className="confirmation-row">
                            <span className="confirmation-label">Tarih</span>
                            <span className="confirmation-value">{dateStr}</span>
                        </div>
                        <div className="confirmation-row">
                            <span className="confirmation-label">Saat</span>
                            <span className="confirmation-value">{group.time}</span>
                        </div>
                        <div className="confirmation-row">
                            <span className="confirmation-label">Süre</span>
                            <span className="confirmation-value">{groupDuration} dk</span>
                        </div>
                        <div className="confirmation-row">
                            <span className="confirmation-label">Ücret</span>
                            <span className="confirmation-value" style={{ color: 'var(--color-accent-dark)', fontWeight: 700 }}>
                                {groupPrice}₺
                            </span>
                        </div>
                    </div>
                )
            })}

            {/* Genel toplam (birden fazla grup varsa) */}
            {groups.length > 1 && (
                <div style={{
                    background: 'var(--color-cream)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    marginTop: 'var(--space-4)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        Genel Toplam ({totalDuration} dk)
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-accent-dark)' }}>
                        {totalPrice}₺
                    </span>
                </div>
            )}

            <div className="nav-row">
                <button
                    className="btn btn-secondary"
                    onClick={onBack}
                    disabled={isSubmitting}
                    id="confirm-back-btn"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Geri
                </button>
                <button
                    className="btn btn-primary"
                    onClick={onConfirm}
                    disabled={isSubmitting}
                    id="confirm-submit-btn"
                >
                    {isSubmitting ? (
                        <>
                            <span className="loading-spinner" style={{ width: 20, height: 20, padding: 0 }} />
                            Gönderiliyor...
                        </>
                    ) : (
                        <>
                            Randevuyu Onayla
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
