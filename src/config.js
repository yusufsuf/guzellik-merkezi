// İşletme yapılandırması — .env'den okunan değerler
const config = {
    businessName: import.meta.env.VITE_BUSINESS_NAME || 'Randevu Sistemi',
    businessSubtitle: import.meta.env.VITE_BUSINESS_SUBTITLE || 'Online Randevu Sistemi',
    businessDescription: import.meta.env.VITE_BUSINESS_DESCRIPTION || 'Online randevu sistemi',
    themeColor: import.meta.env.VITE_THEME_COLOR || '#e65100',
    themeBg: import.meta.env.VITE_THEME_BG || '#faf6f1',
}

export default config
