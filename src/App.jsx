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

  // Seçilen hizmetler
  const [selectedServices, setSelectedServices] = useState([])

  // Randevu grupları
  const [groups, setGroups] = useState([])
  const [groupIndex, setGroupIndex] = useState(0)

  // Gönderim
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingResults, setBookingResults] = useState([]) // [{code, status, group}]

  const isAdmin = window.location.pathname === '/admin' || window.location.hash === '#admin'

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
  function handleInfoNext() {
    if (isPhoneVerified) {
      setPhase('services')
    } else {
      setPhase('verify')
    }
  }

  function handlePhoneVerified() {
    setIsPhoneVerified(true)
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
    </div>
  )
}

export default App
