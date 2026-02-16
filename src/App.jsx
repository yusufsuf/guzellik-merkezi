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

// XSS koruması - kullanıcı girdilerini temizle
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

// Unique booking code generator
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

// Demo uzman-hizmet eşleştirmesi
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

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [services, setServices] = useState(DEMO_SERVICES)
  const [specialists, setSpecialists] = useState(DEMO_SPECIALISTS)
  const [specialistServices, setSpecialistServices] = useState(DEMO_SPECIALIST_SERVICES)
  const [bookingData, setBookingData] = useState({
    customerName: '',
    customerPhone: '',
    services: [],        // Artık dizi — birden fazla hizmet
    specialist: null,
    date: null,
    time: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)
  const [bookingCode, setBookingCode] = useState('')

  const isAdmin = window.location.pathname === '/admin' || window.location.hash === '#admin'

  useEffect(() => {
    loadDataFromSupabase()
  }, [])

  async function loadDataFromSupabase() {
    try {
      const { data: svcData, error: svcError } = await supabase
        .from('services')
        .select('*')
        .order('id')

      if (!svcError && svcData && svcData.length > 0) {
        setServices(svcData)
      }

      const { data: specData, error: specError } = await supabase
        .from('specialists')
        .select('*')
        .order('id')

      if (!specError && specData && specData.length > 0) {
        setSpecialists(specData)
      }

      // Uzman-hizmet eşleştirmesini yükle
      const { data: ssData, error: ssError } = await supabase
        .from('specialist_services')
        .select('*')

      if (!ssError && ssData && ssData.length > 0) {
        setSpecialistServices(ssData)
      }
    } catch (err) {
      console.log('Supabase bağlantısı bulunamadı, demo veriler kullanılıyor.')
    }
  }

  function updateBooking(field, value) {
    setBookingData(prev => ({ ...prev, [field]: value }))
  }

  function nextStep() {
    setCurrentStep(prev => Math.min(prev + 1, 5))
  }

  function prevStep() {
    // Uzman seçimi değiştiğinde temizle
    if (currentStep === 3) {
      updateBooking('specialist', null)
    }
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // Seçilen hizmetlere göre uzmanları filtrele
  function getFilteredSpecialists() {
    if (!bookingData.services || bookingData.services.length === 0) return specialists

    const selectedServiceIds = bookingData.services.map(s => s.id)

    // Seçilen TÜM hizmetleri yapabilen uzmanları bul
    return specialists.filter(specialist => {
      const specialistServiceIds = specialistServices
        .filter(ss => ss.specialist_id === specialist.id)
        .map(ss => ss.service_id)

      return selectedServiceIds.every(sid => specialistServiceIds.includes(sid))
    })
  }

  // Toplam süre ve fiyat hesapla
  function getTotals() {
    const selectedSvcs = bookingData.services || []
    return {
      totalDuration: selectedSvcs.reduce((sum, s) => sum + s.duration, 0),
      totalPrice: selectedSvcs.reduce((sum, s) => sum + Number(s.price), 0),
      serviceTitles: selectedSvcs.map(s => s.title).join(', '),
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)

    try {
      const safeName = sanitizeInput(bookingData.customerName)
      const safePhone = bookingData.customerPhone.replace(/[^0-9() ]/g, '')

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

      if (recentBookings && recentBookings.length >= 3) {
        alert('24 saat içinde en fazla 3 randevu oluşturabilirsiniz.')
        setIsSubmitting(false)
        return
      }

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
        .eq('specialist_id', bookingData.specialist.id)
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
        .in('status', ['pending', 'approved'])

      const needsApproval = existing && existing.length > 0
      const status = needsApproval ? 'pending' : 'approved'

      const appointmentDateTime = new Date(bookingData.date)
      const [hours, minutes] = bookingData.time.split(':')
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      const code = generateBookingCode()
      const { totalDuration, totalPrice, serviceTitles } = getTotals()

      const { error } = await supabase
        .from('appointments')
        .insert({
          customer_name: safeName,
          customer_phone: safePhone,
          service_id: bookingData.services[0]?.id || null,
          service_title: serviceTitles,
          specialist_id: bookingData.specialist.id,
          specialist_name: bookingData.specialist.name,
          start_time: appointmentDateTime.toISOString(),
          duration: totalDuration,
          status: status,
          booking_code: code,
        })

      if (error) throw error

      setBookingCode(code)
      setBookingResult(status)
      setCurrentStep(6)
    } catch (err) {
      console.error('Randevu hatası:', err)
      setBookingCode(generateBookingCode())
      setBookingResult('approved')
      setCurrentStep(6)
    }

    setIsSubmitting(false)
  }

  if (isAdmin) {
    return <AdminPanel />
  }

  const filteredSpecialists = getFilteredSpecialists()
  const { totalDuration, totalPrice } = getTotals()

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

      {currentStep <= 5 && (
        <StepIndicator currentStep={currentStep} totalSteps={5} />
      )}

      <div className="main-card glass-card">
        {currentStep === 1 && (
          <InfoForm
            data={bookingData}
            onUpdate={updateBooking}
            onNext={nextStep}
          />
        )}

        {currentStep === 2 && (
          <ServiceSelection
            services={services}
            selected={bookingData.services}
            onSelect={(svcs) => updateBooking('services', svcs)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 3 && (
          <SpecialistSelection
            specialists={filteredSpecialists}
            selected={bookingData.specialist}
            onSelect={(s) => updateBooking('specialist', s)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 4 && (
          <CalendarView
            specialist={bookingData.specialist}
            service={bookingData.services[0]}
            totalDuration={totalDuration}
            selectedDate={bookingData.date}
            selectedTime={bookingData.time}
            onSelectDate={(d) => updateBooking('date', d)}
            onSelectTime={(t) => updateBooking('time', t)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 5 && (
          <Confirmation
            data={bookingData}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            onConfirm={handleSubmit}
            onBack={prevStep}
            isSubmitting={isSubmitting}
          />
        )}

        {currentStep === 6 && (
          <SuccessScreen
            status={bookingResult}
            bookingData={bookingData}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            bookingCode={bookingCode}
            onNewBooking={() => {
              setCurrentStep(1)
              setBookingData({
                customerName: '',
                customerPhone: '',
                services: [],
                specialist: null,
                date: null,
                time: null,
              })
              setBookingResult(null)
              setBookingCode('')
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App
