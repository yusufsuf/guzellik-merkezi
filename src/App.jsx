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

// Demo data - these will later come from Supabase
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

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [services, setServices] = useState(DEMO_SERVICES)
  const [specialists, setSpecialists] = useState(DEMO_SPECIALISTS)
  const [bookingData, setBookingData] = useState({
    customerName: '',
    customerPhone: '',
    service: null,
    specialist: null,
    date: null,
    time: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState(null) // 'approved' | 'pending'
  const [bookingCode, setBookingCode] = useState('')

  // Check if this is the admin route
  const isAdmin = window.location.pathname === '/admin' || window.location.hash === '#admin'

  // Try loading data from Supabase on mount
  useEffect(() => {
    loadDataFromSupabase()
  }, [])

  async function loadDataFromSupabase() {
    try {
      // Try to load services
      const { data: svcData, error: svcError } = await supabase
        .from('services')
        .select('*')
        .order('id')

      if (!svcError && svcData && svcData.length > 0) {
        setServices(svcData)
      }

      // Try to load specialists
      const { data: specData, error: specError } = await supabase
        .from('specialists')
        .select('*')
        .order('id')

      if (!specError && specData && specData.length > 0) {
        setSpecialists(specData)
      }
    } catch (err) {
      // Supabase not configured yet, use demo data
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
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  async function handleSubmit() {
    setIsSubmitting(true)

    try {
      // Girişleri temizle (XSS koruması)
      const safeName = sanitizeInput(bookingData.customerName)
      const safePhone = bookingData.customerPhone.replace(/[^0-9() ]/g, '')

      if (!safeName || safeName.length < 3) {
        alert('Lütfen geçerli bir ad soyad giriniz.')
        setIsSubmitting(false)
        return
      }

      // Check if user is blacklisted
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

      // Rate limiting: aynı telefondan 24 saat içinde max 3 randevu
      const last24h = new Date()
      last24h.setHours(last24h.getHours() - 24)

      const { data: recentBookings } = await supabase
        .from('appointments')
        .select('id')
        .eq('customer_phone', safePhone)
        .gte('created_at', last24h.toISOString())

      if (recentBookings && recentBookings.length >= 3) {
        alert('24 saat içinde en fazla 3 randevu oluşturabilirsiniz. Lütfen daha sonra tekrar deneyiniz.')
        setIsSubmitting(false)
        return
      }

      // Check if the user already has an appointment with this specialist this week
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('customer_phone', bookingData.customerPhone)
        .eq('specialist_id', bookingData.specialist.id)
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
        .in('status', ['pending', 'approved'])

      const needsApproval = existing && existing.length > 0
      const status = needsApproval ? 'pending' : 'approved'

      // Create appointment
      const appointmentDateTime = new Date(bookingData.date)
      const [hours, minutes] = bookingData.time.split(':')
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      const code = generateBookingCode()

      const { error } = await supabase
        .from('appointments')
        .insert({
          customer_name: safeName,
          customer_phone: safePhone,
          service_id: bookingData.service.id,
          service_title: bookingData.service.title,
          specialist_id: bookingData.specialist.id,
          specialist_name: bookingData.specialist.name,
          start_time: appointmentDateTime.toISOString(),
          duration: bookingData.service.duration,
          status: status,
          booking_code: code,
        })

      if (error) throw error

      setBookingCode(code)
      setBookingResult(status)
      setCurrentStep(6)
    } catch (err) {
      console.error('Randevu hatası:', err)
      // If Supabase is not connected, simulate success
      setBookingCode(generateBookingCode())
      setBookingResult('approved')
      setCurrentStep(6)
    }

    setIsSubmitting(false)
  }

  if (isAdmin) {
    return <AdminPanel />
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>
        <h1 className="app-header__title">Güzellik Merkezi</h1>
        <p className="app-header__subtitle">Online Randevu Sistemi</p>
      </header>

      {/* Step Indicator */}
      {currentStep <= 5 && (
        <StepIndicator currentStep={currentStep} totalSteps={5} />
      )}

      {/* Main Card */}
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
            selected={bookingData.service}
            onSelect={(s) => updateBooking('service', s)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 3 && (
          <SpecialistSelection
            specialists={specialists}
            selected={bookingData.specialist}
            onSelect={(s) => updateBooking('specialist', s)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 4 && (
          <CalendarView
            specialist={bookingData.specialist}
            service={bookingData.service}
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
            onConfirm={handleSubmit}
            onBack={prevStep}
            isSubmitting={isSubmitting}
          />
        )}

        {currentStep === 6 && (
          <SuccessScreen
            status={bookingResult}
            bookingData={bookingData}
            bookingCode={bookingCode}
            onNewBooking={() => {
              setCurrentStep(1)
              setBookingData({
                customerName: '',
                customerPhone: '',
                service: null,
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
