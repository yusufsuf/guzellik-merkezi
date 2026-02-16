export default function StepIndicator({ currentStep, totalSteps }) {
    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)

    return (
        <div className="step-indicator">
            {steps.map((step, index) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                        className={`step-indicator__dot ${step === currentStep
                                ? 'step-indicator__dot--active'
                                : step < currentStep
                                    ? 'step-indicator__dot--completed'
                                    : ''
                            }`}
                    />
                    {index < totalSteps - 1 && (
                        <div
                            className={`step-indicator__line ${step < currentStep ? 'step-indicator__line--completed' : ''
                                }`}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}
