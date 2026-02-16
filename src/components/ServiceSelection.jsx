export default function ServiceSelection({ services, selected, onSelect, onNext, onBack }) {
    return (
        <div className="animate-fade-in-up">
            <h2 className="step-title">Hizmet Seçiniz</h2>
            <p className="step-description">
                Size uygun hizmeti seçerek devam ediniz.
            </p>

            <div className="selection-grid stagger-children">
                {services.map((service) => (
                    <div
                        key={service.id}
                        className={`selection-card ${selected?.id === service.id ? 'selection-card--selected' : ''}`}
                        onClick={() => onSelect(service)}
                        id={`service-card-${service.id}`}
                    >
                        <div className="selection-card__content">
                            <div className="selection-card__title">{service.title}</div>
                            <div className="selection-card__subtitle">
                                {service.duration} dk  •  {service.price}₺
                            </div>
                        </div>
                        <div className="selection-card__check">
                            {selected?.id === service.id && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                    </div>
                ))}
            </div>

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
                    disabled={!selected}
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
