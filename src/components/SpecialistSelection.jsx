export default function SpecialistSelection({ specialists, selected, onSelect, onNext, onBack, serviceLabel, groupNumber, totalGroups }) {
    return (
        <div className="animate-fade-in-up">
            <h2 className="step-title">Uzman Seçiniz</h2>
            <p className="step-description">
                {serviceLabel ? (
                    <>
                        <strong>{serviceLabel}</strong> için tercih ettiğiniz uzmanı seçiniz.
                        {groupNumber && totalGroups > 1 && (
                            <span style={{
                                display: 'block',
                                marginTop: '6px',
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-accent)',
                                fontWeight: 600,
                            }}>
                                Randevu {groupNumber} / {totalGroups}
                            </span>
                        )}
                    </>
                ) : (
                    'Randevunuz için tercih ettiğiniz uzmanı seçiniz.'
                )}
            </p>

            <div className="selection-grid stagger-children">
                {specialists.map((specialist) => (
                    <div
                        key={specialist.id}
                        className={`selection-card ${selected?.id === specialist.id ? 'selection-card--selected' : ''}`}
                        onClick={() => onSelect(specialist)}
                        id={`specialist-card-${specialist.id}`}
                    >
                        <div className="selection-card__content">
                            <div className="selection-card__title">{specialist.name}</div>
                            <div className="selection-card__subtitle">{specialist.role}</div>
                        </div>
                        <div className="selection-card__check">
                            {selected?.id === specialist.id && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {specialists.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: 'var(--space-6)',
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--font-size-sm)',
                }}>
                    Seçilen hizmetler için uygun uzman bulunamadı.
                </div>
            )}

            <div className="nav-row">
                <button className="btn btn-secondary" onClick={onBack} id="specialist-back-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Geri
                </button>
                <button
                    className="btn btn-primary"
                    onClick={onNext}
                    disabled={!selected}
                    id="specialist-next-btn"
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
