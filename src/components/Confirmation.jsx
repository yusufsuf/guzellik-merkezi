const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

export default function Confirmation({ data, onConfirm, onBack, isSubmitting }) {
    const dateStr = data.date
        ? `${data.date.getDate()} ${TURKISH_MONTHS[data.date.getMonth()]} ${data.date.getFullYear()}`
        : ''

    return (
        <div className="animate-fade-in-up">
            <h2 className="step-title">Randevu Özeti</h2>
            <p className="step-description">
                Lütfen bilgilerinizi kontrol edip onaylayınız.
            </p>

            <div className="confirmation-block">
                <div className="confirmation-row">
                    <span className="confirmation-label">Ad Soyad</span>
                    <span className="confirmation-value">{data.customerName}</span>
                </div>
                <div className="confirmation-row">
                    <span className="confirmation-label">Telefon</span>
                    <span className="confirmation-value">{data.customerPhone}</span>
                </div>
                <div className="confirmation-row">
                    <span className="confirmation-label">Hizmet</span>
                    <span className="confirmation-value">{data.service?.title}</span>
                </div>
                <div className="confirmation-row">
                    <span className="confirmation-label">Uzman</span>
                    <span className="confirmation-value">{data.specialist?.name}</span>
                </div>
                <div className="confirmation-row">
                    <span className="confirmation-label">Tarih</span>
                    <span className="confirmation-value">{dateStr}</span>
                </div>
                <div className="confirmation-row">
                    <span className="confirmation-label">Saat</span>
                    <span className="confirmation-value">{data.time}</span>
                </div>
                <div className="confirmation-row">
                    <span className="confirmation-label">Süre</span>
                    <span className="confirmation-value">{data.service?.duration} dk</span>
                </div>
                <div className="confirmation-row">
                    <span className="confirmation-label">Ücret</span>
                    <span className="confirmation-value" style={{ color: 'var(--color-accent-dark)', fontWeight: 700 }}>
                        {data.service?.price}₺
                    </span>
                </div>
            </div>

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
