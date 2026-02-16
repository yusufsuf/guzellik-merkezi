export default function ServiceSelection({ services, selected, onSelect, onNext, onBack }) {
    // selected is now an array of services
    const selectedServices = selected || []

    function toggleService(service) {
        const isSelected = selectedServices.some(s => s.id === service.id)
        if (isSelected) {
            onSelect(selectedServices.filter(s => s.id !== service.id))
        } else {
            onSelect([...selectedServices, service])
        }
    }

    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0)
    const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0)

    return (
        <div className="animate-fade-in-up">
            <h2 className="step-title">Hizmet Seçiniz</h2>
            <p className="step-description">
                Bir veya birden fazla hizmet seçebilirsiniz.
            </p>

            <div className="selection-grid stagger-children">
                {services.map((service) => {
                    const isSelected = selectedServices.some(s => s.id === service.id)
                    return (
                        <div
                            key={service.id}
                            className={`selection-card ${isSelected ? 'selection-card--selected' : ''}`}
                            onClick={() => toggleService(service)}
                            id={`service-card-${service.id}`}
                        >
                            <div className="selection-card__content">
                                <div className="selection-card__title">{service.title}</div>
                                <div className="selection-card__subtitle">
                                    {service.duration} dk  •  {service.price}₺
                                </div>
                            </div>
                            <div className="selection-card__check">
                                {isSelected && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Seçim özeti */}
            {selectedServices.length > 0 && (
                <div style={{
                    background: 'var(--color-cream)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    marginTop: 'var(--space-4)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 'var(--font-size-sm)',
                }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                        {selectedServices.length} hizmet seçildi • {totalDuration} dk
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent-dark)' }}>
                        Toplam: {totalPrice}₺
                    </span>
                </div>
            )}

            <div className="nav-row">
                <button className="btn btn-secondary" onClick={onBack} id="service-back-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Geri
                </button>
                <button
                    className="btn btn-primary"
                    onClick={onNext}
                    disabled={selectedServices.length === 0}
                    id="service-next-btn"
                >
                    Devam Et
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
