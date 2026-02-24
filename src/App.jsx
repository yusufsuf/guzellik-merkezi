import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import InfoForm from './components/InfoForm'
import ServiceSelection from './components/ServiceSelection'
import SpecialistSelection from './components/SpecialistSelection'
import CalendarView from './components/CalendarView'
import Confirmation from './components/Confirmation'
import SuccessScreen from './components/SuccessScreen'
import AdminPanel from './components/AdminPanel'
import StepIndicator from './components/StepIndicator'
import PhoneVerification from './components/PhoneVerification'
import AppointmentLookup from './components/AppointmentLookup'

// XSS koruması
function sanitizeInput(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

// Türkiye saati formatı (UTC+3, toISOString() yerine)
function toLocalISOString(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// Booking code üretici
function generateBookingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Demo data
const DEMO_SERVICES = [
  { id: 1, title: 'Saç Kesimi', duration: 45, price: 250, icon: 'scissors' },
  { id: 2, title: 'Saç Boyama', duration: 90, price: 500, icon: 'palette' },
  { id: 3, title: 'Manikür', duration: 30, price: 150, icon: 'hand' },
  { id: 4, title: 'Pedikür', duration: 40, price: 180, icon: 'foot' },
  { id: 5, title: 'Cilt Bakımı', duration: 60, price: 350, icon: 'sparkles' },
  { id: 6, title: 'Kaş Dizaynı', duration: 20, price: 100, icon: 'eye' },
  { id: 7, title: 'Lazer Epilasyon', duration: 30, price: 400, icon: 'zap' },
  { id: 8, title: 'Masaj', duration: 60, price: 300, icon: 'heart' },
]

const DEMO_SPECIALISTS = [
  { id: 1, name: 'Ayşe Yılmaz', role: 'Saç Uzmanı', calendar_id: '' },
  { id: 2, name: 'Fatma Demir', role: 'Cilt Bakım Uzmanı', calendar_id: '' },
  { id: 3, name: 'Zeynep Kaya', role: 'Tırnak Bakım Uzmanı', calendar_id: '' },
  { id: 4, name: 'Elif Şahin', role: 'Masaj Terapisti', calendar_id: '' },
]

const DEMO_SPECIALIST_SERVICES = [
  { specialist_id: 1, service_id: 1 },
  { specialist_id: 1, service_id: 2 },
  { specialist_id: 2, service_id: 5 },
  { specialist_id: 2, service_id: 6 },
  { specialist_id: 2, service_id: 7 },
  { specialist_id: 3, service_id: 3 },
  { specialist_id: 3, service_id: 4 },
  { specialist_id: 4, service_id: 8 },
]

// Hizmetleri uzman uyumluluğuna göre grupla
function createAppointmentGroups(selectedServices, specialistServicesMap, allSpecialists) {
  const groups = []
  const remaining = [...selectedServices]

  while (remaining.length > 0) {
    let bestMatchedServiceIds = []
    let bestMatchCount = 0

    // En çok hizmeti yapabilen uzmanı bul
    for (const spec of allSpecialists) {
      const canDoServiceIds = specialistServicesMap
        .filter(ss => ss.specialist_id === spec.id)
        .map(ss => ss.service_id)

      const matched = remaining.filter(s => canDoServiceIds.includes(s.id))

      if (matched.length > bestMatchCount) {
        bestMatchCount = matched.length
        bestMatchedServiceIds = matched.map(s => s.id)
      }
    }

    if (bestMatchCount === 0) {
      // Hiçbir uzman bulunamadı, hepsini tek grupta göster
      groups.push({
        services: [...remaining],
        possibleSpecialists: allSpecialists,
        specialist: null,
        date: null,
        time: null,
      })
      break
    }

    const groupServices = remaining.filter(s => bestMatchedServiceIds.includes(s.id))
    const groupServiceIds = groupServices.map(s => s.id)

    // Bu gruptaki TÜM hizmetleri yapabilen uzmanları bul
    const possibleSpecialists = allSpecialists.filter(spec => {
      const canDoIds = specialistServicesMap
        .filter(ss => ss.specialist_id === spec.id)
        .map(ss => ss.service_id)
      return groupServiceIds.every(sid => canDoIds.includes(sid))
    })

    groups.push({
      services: groupServices,
      possibleSpecialists: possibleSpecialists.length > 0 ? possibleSpecialists : allSpecialists,
      specialist: null,
      date: null,
      time: null,
    })

    // Atanan hizmetleri kaldır
    const assignedIds = new Set(bestMatchedServiceIds)
    remaining.splice(0, remaining.length, ...remaining.filter(s => !assignedIds.has(s.id)))
  }

  return groups
}

function App() {
  // Aşama yönetimi
  const [phase, setPhase] = useState('info') // 'info' | 'verify' | 'services' | 'specialist' | 'calendar' | 'confirm' | 'success'

  // Veriler
  const [services, setServices] = useState(DEMO_SERVICES)
  const [specialists, setSpecialists] = useState(DEMO_SPECIALISTS)
  const [specialistServices, setSpecialistServices] = useState(DEMO_SPECIALIST_SERVICES)

  // Müşteri bilgisi
  const [customerInfo, setCustomerInfo] = useState({ customerName: '', customerPhone: '' })
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [showLookup, setShowLookup] = useState(false)

  // Seçilen hizmetler
  const [selectedServices, setSelectedServices] = useState([])

  // Randevu grupları
  const [groups, setGroups] = useState([])
  const [groupIndex, setGroupIndex] = useState(0)

  // Gönderim
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingResults, setBookingResults] = useState([]) // [{code, status, group}]

  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOSBanner, setIsIOSBanner] = useState(false)

  const isAdmin = window.location.pathname === '/admin' || window.location.hash === '#admin'

  // PWA install prompt'u yakala (Android/Desktop) + iOS tespiti
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_banner_dismissed')
    if (dismissed) return

    // Zaten standalone modda mı? (PWA olarak açılmış)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (isStandalone) return

    // iOS tespiti
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIOS) {
      setIsIOSBanner(true)
      setShowInstallBanner(true)
      return
    }

    // Android/Desktop
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallBanner(false)
    }
    setDeferredPrompt(null)
  }

  const dismissInstallBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem('pwa_banner_dismissed', 'true')
  }

  useEffect(() => {
    loadDataFromSupabase()
  }, [])

  async function loadDataFromSupabase() {
    try {
      const { data: svcData, error: svcError } = await supabase
        .from('services').select('*').order('id')
      if (!svcError && svcData && svcData.length > 0) setServices(svcData)

      const { data: specData, error: specError } = await supabase
        .from('specialists').select('*').order('id')
      if (!specError && specData && specData.length > 0) {
        // Sadece aktif uzmanları göster
        setSpecialists(specData.filter(s => s.is_active !== false))
      }

      const { data: ssData, error: ssError } = await supabase
        .from('specialist_services').select('*')
      if (!ssError && ssData && ssData.length > 0) setSpecialistServices(ssData)
    } catch (err) {
      console.log('Supabase bağlantısı bulunamadı, demo veriler kullanılıyor.')
    }
  }

  function updateCustomerInfo(field, value) {
    setCustomerInfo(prev => ({ ...prev, [field]: value }))
  }

  function updateGroup(field, value) {
    setGroups(prev => {
      const updated = [...prev]
      updated[groupIndex] = { ...updated[groupIndex], [field]: value }
      return updated
    })
  }

  // Adım göstergesi hesaplama
  function getStepInfo() {
    const numGroups = groups.length || 1
    // info(1) + verify(1) + services(1) + her grup için (specialist+calendar)(2*N) + confirm(1)
    const totalSteps = 4 + 2 * numGroups

    let currentStep = 1
    switch (phase) {
      case 'info': currentStep = 1; break
      case 'verify': currentStep = 2; break
      case 'services': currentStep = 3; break
      case 'specialist': currentStep = 4 + groupIndex * 2; break
      case 'calendar': currentStep = 5 + groupIndex * 2; break
      case 'confirm': currentStep = 4 + numGroups * 2; break
      default: currentStep = 1
    }

    return { currentStep, totalSteps }
  }

  // Grup hizmet etiketi
  function getGroupServiceLabel(group) {
    if (!group || !group.services) return ''
    return group.services.map(s => s.title).join(' ve ')
  }

  // --- NAVİGASYON ---
  const [blacklistError, setBlacklistError] = useState('')

  async function handleInfoNext() {
    setBlacklistError('')
    const cleanPhone = customerInfo.customerPhone.replace(/\D/g, '')

    // Kara liste kontrolü
    try {
      const { data } = await supabase
        .from('blacklist')
        .select('phone')

      if (data && data.length > 0) {
        const isBlocked = data.some(item => {
          const blPhone = (item.phone || '').replace(/\D/g, '')
          return blPhone === cleanPhone || blPhone === cleanPhone.slice(1) || ('0' + blPhone) === cleanPhone
        })
        if (isBlocked) {
          setBlacklistError('Randevu işleminize devam edilemiyor. Detaylı bilgi için işletme ile iletişime geçiniz.')
          return
        }
      }
    } catch { }

    // Daha önce doğrulanmış mı kontrol et
    if (!isPhoneVerified) {
      try {
        const { data } = await supabase
          .from('verified_phones')
          .select('phone')

        if (data && data.length > 0) {
          const isVerified = data.some(item => {
            const vPhone = (item.phone || '').replace(/\D/g, '')
            return vPhone === cleanPhone || vPhone === cleanPhone.slice(1) || ('0' + vPhone) === cleanPhone
          })
          if (isVerified) {
            setIsPhoneVerified(true)
            setPhase('services')
            return
          }
        }
      } catch { }
    }

    if (isPhoneVerified) {
      setPhase('services')
    } else {
      setPhase('verify')
    }
  }

  async function handlePhoneVerified() {
    setIsPhoneVerified(true)

    // Doğrulanan numarayı kaydet
    try {
      const phone = customerInfo.customerPhone.replace(/\D/g, '')
      await supabase.from('verified_phones')
        .upsert({ phone }, { onConflict: 'phone' })
    } catch { }

    setPhase('services')
  }

  function handleServicesNext() {
    const newGroups = createAppointmentGroups(selectedServices, specialistServices, specialists)
    setGroups(newGroups)
    setGroupIndex(0)
    setPhase('specialist')
  }

  function handleSpecialistNext() {
    setPhase('calendar')
  }

  function handleCalendarNext() {
    if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1)
      setPhase('specialist')
    } else {
      setPhase('confirm')
    }
  }

  function handleBack() {
    switch (phase) {
      case 'verify':
        setPhase('info')
        break
      case 'services':
        if (isPhoneVerified) {
          setPhase('info')
        } else {
          setPhase('verify')
        }
        break
      case 'specialist':
        if (groupIndex === 0) {
          setPhase('services')
        } else {
          setGroupIndex(groupIndex - 1)
          setPhase('calendar')
        }
        break
      case 'calendar':
        setPhase('specialist')
        break
      case 'confirm':
        setGroupIndex(groups.length - 1)
        setPhase('calendar')
        break
    }
  }

  // --- RANDEVU GÖNDER ---
  async function handleSubmit() {
    setIsSubmitting(true)
    const results = []

    try {
      const safeName = sanitizeInput(customerInfo.customerName)
      const safePhone = customerInfo.customerPhone.replace(/[^0-9() ]/g, '')

      if (!safeName || safeName.length < 3) {
        alert('Lütfen geçerli bir ad soyad giriniz.')
        setIsSubmitting(false)
        return
      }

      // Kara liste kontrolü
      const { data: blocked } = await supabase
        .from('blacklist')
        .select('id')
        .eq('phone', safePhone)
        .maybeSingle()

      if (blocked) {
        alert('Bu telefon numarası ile randevu oluşturulamaz. Lütfen salonu arayınız.')
        setIsSubmitting(false)
        return
      }

      // Rate limiting
      const last24h = new Date()
      last24h.setHours(last24h.getHours() - 24)
      const { data: recentBookings } = await supabase
        .from('appointments')
        .select('id')
        .eq('customer_phone', safePhone)
        .gte('created_at', last24h.toISOString())

      if (recentBookings && recentBookings.length >= 5) {
        alert('24 saat içinde en fazla 5 randevu oluşturabilirsiniz.')
        setIsSubmitting(false)
        return
      }

      // Her grup için ayrı randevu oluştur
      for (const group of groups) {
        const code = generateBookingCode()
        const serviceTitles = group.services.map(s => s.title).join(', ')
        const totalDuration = group.services.reduce((sum, s) => sum + s.duration, 0)

        const appointmentDateTime = new Date(group.date)
        const timeStr = group.time || '09:00'
        const [hours, minutes] = timeStr.split(':')
        appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        // Aynı hafta aynı uzman kontrolü
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay() + 1)
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        const { data: existing } = await supabase
          .from('appointments')
          .select('id')
          .eq('customer_phone', safePhone)
          .eq('specialist_id', group.specialist.id)
          .gte('start_time', toLocalISOString(startOfWeek))
          .lte('start_time', toLocalISOString(endOfWeek))
          .in('status', ['pending', 'approved'])

        const needsApproval = existing && existing.length > 0
        const status = needsApproval ? 'pending' : 'approved'

        const insertData = {
          customer_name: safeName,
          customer_phone: safePhone,
          service_id: group.services[0]?.id || null,
          service_title: serviceTitles,
          specialist_id: group.specialist.id,
          specialist_name: group.specialist.name,
          start_time: toLocalISOString(appointmentDateTime),
          appointment_time: timeStr,
          duration: totalDuration,
          status: status,
          booking_code: code,
        }

        const { error } = await supabase
          .from('appointments')
          .insert(insertData)

        if (error) {
          console.error('Supabase insert hatası:', error)
          throw error
        }

        results.push({ code, status, group })
      }

      setBookingResults(results)
      setPhase('success')
    } catch (err) {
      console.error('Randevu hatası:', err)
      // Demo mode
      for (const group of groups) {
        results.push({
          code: generateBookingCode(),
          status: 'approved',
          group,
        })
      }
      setBookingResults(results)
      setPhase('success')
    }

    setIsSubmitting(false)
  }

  // --- RENDER ---
  if (isAdmin) return <AdminPanel />

  const { currentStep, totalSteps } = getStepInfo()
  const currentGroup = groups[groupIndex]

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>
        <h1 className="app-header__title">Güzellik Merkezi</h1>
        <p className="app-header__subtitle">Online Randevu Sistemi</p>
        <button
          className="btn btn-secondary"
          onClick={() => setShowLookup(true)}
          style={{
            marginTop: 'var(--space-3)', fontSize: 'var(--font-size-xs)',
            padding: '6px 14px', borderRadius: 'var(--radius-full)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Randevu Sorgula
        </button>
      </header>

      {phase !== 'success' && (
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
      )}

      <div className="main-card glass-card">
        {phase === 'info' && (
          <InfoForm
            data={customerInfo}
            onUpdate={updateCustomerInfo}
            onNext={handleInfoNext}
            blacklistError={blacklistError}
          />
        )}

        {phase === 'verify' && (
          <PhoneVerification
            phone={customerInfo.customerPhone}
            onVerified={handlePhoneVerified}
            onBack={handleBack}
          />
        )}

        {phase === 'services' && (
          <ServiceSelection
            services={services}
            selected={selectedServices}
            onSelect={setSelectedServices}
            onNext={handleServicesNext}
            onBack={handleBack}
          />
        )}

        {phase === 'specialist' && currentGroup && (
          <SpecialistSelection
            specialists={currentGroup.possibleSpecialists}
            selected={currentGroup.specialist}
            onSelect={(s) => updateGroup('specialist', s)}
            onNext={handleSpecialistNext}
            onBack={handleBack}
            serviceLabel={getGroupServiceLabel(currentGroup)}
            groupNumber={groups.length > 1 ? groupIndex + 1 : null}
            totalGroups={groups.length}
          />
        )}

        {phase === 'calendar' && currentGroup && (
          <CalendarView
            specialist={currentGroup.specialist}
            service={currentGroup.services[0]}
            totalDuration={currentGroup.services.reduce((sum, s) => sum + s.duration, 0)}
            selectedDate={currentGroup.date}
            selectedTime={currentGroup.time}
            onSelectDate={(d) => updateGroup('date', d)}
            onSelectTime={(t) => updateGroup('time', t)}
            onNext={handleCalendarNext}
            onBack={handleBack}
            serviceLabel={getGroupServiceLabel(currentGroup)}
            groupNumber={groups.length > 1 ? groupIndex + 1 : null}
            totalGroups={groups.length}
          />
        )}

        {phase === 'confirm' && (
          <Confirmation
            customerInfo={customerInfo}
            groups={groups}
            onConfirm={handleSubmit}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        )}

        {phase === 'success' && (
          <SuccessScreen
            bookingResults={bookingResults}
            customerInfo={customerInfo}
            onNewBooking={() => {
              setPhase('info')
              setCustomerInfo({ customerName: '', customerPhone: '' })
              setSelectedServices([])
              setGroups([])
              setGroupIndex(0)
              setBookingResults([])
            }}
          />
        )}
      </div>

      {showLookup && <AppointmentLookup onClose={() => setShowLookup(false)} />}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(135deg, #e65100, #bf360c)',
          color: '#fff', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, zIndex: 9999,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          animation: 'slideUp 0.4s ease-out',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 2 }}>
              📱 {isIOSBanner ? 'Ana Ekrana Ekle' : 'Uygulamayı Yükle'}
            </div>
            <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
              {isIOSBanner ? (
                <span>
                  Safari'de <span style={{ fontSize: '1.1rem', verticalAlign: 'middle' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', display: 'inline' }}>
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </span> butonuna, sonra <strong>"Ana Ekrana Ekle"</strong>'ye dokunun
                </span>
              ) : 'Ana ekrana ekleyerek hızlı erişim sağlayın'}
            </div>
          </div>
          {!isIOSBanner && (
            <button
              onClick={handleInstallClick}
              style={{
                background: '#fff', color: '#e65100', border: 'none',
                padding: '8px 18px', borderRadius: 8, fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Yükle
            </button>
          )}
          <button
            onClick={dismissInstallBanner}
            style={{
              background: 'none', border: 'none', color: '#fff',
              fontSize: '1.3rem', cursor: 'pointer', padding: 4, opacity: 0.7,
            }}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default App
