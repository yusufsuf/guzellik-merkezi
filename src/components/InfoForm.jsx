import { useState } from 'react'

export default function InfoForm({ data, onUpdate, onNext }) {
    const [errors, setErrors] = useState({})

    function validate() {
        const newErrors = {}
        if (!data.customerName.trim()) {
            newErrors.name = 'Ad Soyad gereklidir'
        } else if (data.customerName.trim().split(' ').length < 2) {
            newErrors.name = 'Lütfen ad ve soyadınızı giriniz'
        } else if (data.customerName.trim().length < 5) {
            newErrors.name = 'Ad Soyad en az 5 karakter olmalıdır'
        }

        const phone = data.customerPhone.replace(/\D/g, '')
        if (!phone) {
            newErrors.phone = 'Telefon numarası gereklidir'
        } else if (phone.length !== 11) {
            newErrors.phone = 'Telefon numarası 11 haneli olmalıdır'
        } else if (!phone.startsWith('05')) {
            newErrors.phone = 'Geçerli bir cep telefonu numarası giriniz (05XX ile başlamalı)'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    function handleSubmit(e) {
        e.preventDefault()
        if (validate()) {
            onNext()
        }
    }

    function formatPhone(value) {
        // Remove non-digits
        let digits = value.replace(/\D/g, '')

        // Start with 0
        if (digits.length > 0 && digits[0] !== '0') {
            digits = '0' + digits
        }

        // Format: 0(5XX) XXX XX XX
        if (digits.length <= 1) return digits
        if (digits.length <= 4) return `${digits[0]}(${digits.slice(1)}`
        if (digits.length <= 7) return `${digits[0]}(${digits.slice(1, 4)}) ${digits.slice(4)}`
        if (digits.length <= 9) return `${digits[0]}(${digits.slice(1, 4)}) ${digits.slice(4, 7)} ${digits.slice(7)}`
        return `${digits[0]}(${digits.slice(1, 4)}) ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`
    }

    return (
        <form onSubmit={handleSubmit} className="animate-fade-in-up">
            <h2 className="step-title">Bilgilerinizi Giriniz</h2>
            <p className="step-description">
                Randevunuzu oluşturmak için aşağıdaki bilgileri doldurunuz.
            </p>

            <div className="form-group">
                <label className="form-label" htmlFor="customer-name">Ad Soyad</label>
                <input
                    id="customer-name"
                    className="form-input"
                    type="text"
                    placeholder="Adınız ve soyadınız"
                    value={data.customerName}
                    onChange={(e) => onUpdate('customerName', e.target.value)}
                    autoComplete="name"
                />
                {errors.name && (
                    <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: '4px', display: 'block' }}>
                        {errors.name}
                    </span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="customer-phone">Telefon Numarası</label>
                <input
                    id="customer-phone"
                    className="form-input"
                    type="tel"
                    placeholder="0(5XX) XXX XX XX"
                    value={data.customerPhone}
                    onChange={(e) => {
                        const formatted = formatPhone(e.target.value)
                        onUpdate('customerPhone', formatted)
                    }}
                    autoComplete="tel"
                    maxLength={16}
                />
                {errors.phone && (
                    <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: '4px', display: 'block' }}>
                        {errors.phone}
                    </span>
                )}
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" id="info-next-btn">
                Devam Et
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </button>
        </form>
    )
}
