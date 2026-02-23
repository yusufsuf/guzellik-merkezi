import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'

const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const TURKISH_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

// Working hours: 09:00 - 19:00, every 30 minutes
const ALL_SLOTS = []
for (let h = 9; h < 19; h++) {
    ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
    ALL_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

export default function CalendarView({
    specialist,
    service,
    totalDuration,
    selectedDate,
    selectedTime,
    onSelectDate,
    onSelectTime,
    onNext,
    onBack,
    serviceLabel,
    groupNumber,
    totalGroups,
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [busySlots, setBusySlots] = useState([])
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [closedDays, setClosedDays] = useState([])
    const [closedDayInfo, setClosedDayInfo] = useState(null) // {date, reason}

    const effectiveDuration = totalDuration || service?.duration || 30

    const today = useMemo(() => {
        const t = new Date()
        t.setHours(0, 0, 0, 0)
        return t
    }, [])

    // Tatil günlerini yükle
    useEffect(() => {
        async function loadClosedDays() {
            try {
                const { data } = await supabase
                    .from('closed_days')
                    .select('date, reason')
                if (data) setClosedDays(data)
            } catch { }
        }
        loadClosedDays()
    }, [])

    useEffect(() => {
        if (selectedDate && specialist) {
            loadBusySlots(selectedDate)
        }
    }, [selectedDate, specialist])

    async function loadBusySlots(date) {
        setLoadingSlots(true)

        // Türkiye saati formatı
        function toLocal(d) {
            const pad = n => String(n).padStart(2, '0')
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        }

        try {
            const dayStart = new Date(date)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(date)
            dayEnd.setHours(23, 59, 59, 999)

            const { data, error } = await supabase
                .from('appointments')
                .select('start_time, duration')
                .eq('specialist_id', specialist.id)
                .gte('start_time', toLocal(dayStart))
                .lte('start_time', toLocal(dayEnd))
                .in('status', ['approved', 'pending'])

            if (!error && data) {
                const busy = []
                data.forEach((apt) => {
                    const aptStart = new Date(apt.start_time)
                    const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000)

                    ALL_SLOTS.forEach((slot) => {
                        const [h, m] = slot.split(':').map(Number)
                        const slotTime = new Date(date)
                        slotTime.setHours(h, m, 0, 0)
                        const slotEnd = new Date(slotTime.getTime() + 30 * 60000)

                        if (slotTime < aptEnd && slotEnd > aptStart) {
                            busy.push(slot)
                        }
                    })
                })
                setBusySlots([...new Set(busy)])
            }
        } catch (err) {
            console.log('Meşgul saatler yüklenemedi:', err)
            const demoBusy = ['10:00', '10:30', '14:00', '14:30', '15:00', '16:30']
            setBusySlots(demoBusy)
        }
        setLoadingSlots(false)
    }

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        let startDow = firstDay.getDay() - 1
        if (startDow < 0) startDow = 6

        const days = []

        for (let i = 0; i < startDow; i++) {
            days.push({ day: null, date: null })
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d)
            date.setHours(0, 0, 0, 0)
            const isPast = date < today
            const isToday = date.getTime() === today.getTime()
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const closedInfo = closedDays.find(cd => cd.date === dateStr)

            days.push({ day: d, date, isPast, isToday, isClosed: !!closedInfo, closedReason: closedInfo?.reason })
        }

        return days
    }, [currentMonth, today])

    function isSameDay(d1, d2) {
        if (!d1 || !d2) return false
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
    }

    function prevMonth() {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    function nextMonth() {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

    const availableSlots = useMemo(() => {
        if (!selectedDate) return []
        const isToday = isSameDay(selectedDate, today)

        return ALL_SLOTS.map((slot) => {
            const isBusy = busySlots.includes(slot)
            let isPastTime = false

            if (isToday) {
                const now = new Date()
                const [h, m] = slot.split(':').map(Number)
                isPastTime = h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())
            }

            return {
                time: slot,
                available: !isBusy && !isPastTime,
                isBusy,
                isPastTime,
            }
        })
    }, [selectedDate, busySlots, today])

    return (
        <div className="calendar-container animate-fade-in-up">
            <h2 className="step-title">Tarih & Saat Seçiniz</h2>

            {/* Hizmet bilgisi etiketi */}
            {serviceLabel && (
                <div style={{
                    background: 'var(--color-cream)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    marginBottom: 'var(--space-4)',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-accent-dark)',
                        fontWeight: 600,
                    }}>
                        {serviceLabel} için randevu oluşturuyorsunuz
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        marginTop: '4px',
                    }}>
                        Uzman: {specialist?.name} • Toplam süre: {effectiveDuration} dk
                        {groupNumber && totalGroups > 1 && (
                            <span style={{ fontWeight: 600, color: 'var(--color-accent)', marginLeft: '8px' }}>
                                (Randevu {groupNumber}/{totalGroups})
                            </span>
                        )}
                    </div>
                </div>
            )}

            {!serviceLabel && (
                <p className="step-description">
                    <strong>{specialist?.name}</strong> için müsait tarih ve saatleri seçiniz.
                </p>
            )}

            {/* Month Navigation */}
            <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={prevMonth} id="cal-prev-month">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <span className="calendar-header__title">
                    {TURKISH_MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button className="calendar-nav-btn" onClick={nextMonth} id="cal-next-month">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="calendar-weekdays">
                {TURKISH_DAYS.map((day) => (
                    <div key={day} className="calendar-weekday">{day}</div>
                ))}
            </div>

            {/* Calendar Days */}
            <div className="calendar-days">
                {calendarDays.map((d, index) => (
                    <button
                        key={index}
                        className={`calendar-day ${!d.day ? 'calendar-day--empty' : ''
                            } ${d.isPast || d.isClosed ? 'calendar-day--disabled' : ''
                            } ${d.isToday ? 'calendar-day--today' : ''
                            } ${isSameDay(d.date, selectedDate) ? 'calendar-day--selected' : ''
                            }`}
                        disabled={!d.day || d.isPast}
                        onClick={() => {
                            if (d.isClosed) {
                                setClosedDayInfo({ date: d.date, reason: d.closedReason })
                            } else if (d.day && !d.isPast) {
                                setClosedDayInfo(null)
                                onSelectDate(d.date)
                                onSelectTime(null)
                            }
                        }}
                        style={d.isClosed ? {
                            background: '#e5e7eb',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            opacity: 0.7,
                        } : {}}
                    >
                        {d.day}
                    </button>
                ))}
            </div>

            {/* Kapalı gün bilgisi popup */}
            {closedDayInfo && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    marginTop: 'var(--space-3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    animation: 'fadeInUp 0.3s ease',
                }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: '#dc2626' }}>
                            🚫 {closedDayInfo.date.getDate()} {TURKISH_MONTHS[closedDayInfo.date.getMonth()]} — Kapalı
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: '#991b1b', marginTop: 2 }}>
                            {closedDayInfo.reason}
                        </div>
                    </div>
                    <button
                        onClick={() => setClosedDayInfo(null)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '18px', color: '#dc2626', padding: '4px',
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Time Slots */}
            {selectedDate && (
                <>
                    <div className="time-slots-title">
                        {selectedDate.getDate()} {TURKISH_MONTHS[selectedDate.getMonth()]} - Saatler
                    </div>

                    {loadingSlots ? (
                        <div className="loading-spinner" />
                    ) : (
                        <div className="time-slots-grid stagger-children">
                            {availableSlots.map((slot) => (
                                <button
                                    key={slot.time}
                                    className={`time-slot ${slot.available
                                        ? selectedTime === slot.time
                                            ? 'time-slot--selected'
                                            : 'time-slot--available'
                                        : 'time-slot--busy'
                                        }`}
                                    disabled={!slot.available}
                                    onClick={() => slot.available && onSelectTime(slot.time)}
                                    id={`time-slot-${slot.time.replace(':', '')}`}
                                    title={!slot.available ? 'Bu saat dolu' : 'Müsait'}
                                >
                                    {slot.time}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            <div className="nav-row">
                <button className="btn btn-secondary" onClick={onBack} id="calendar-back-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Geri
                </button>
                <button
                    className="btn btn-primary"
                    onClick={onNext}
                    disabled={!selectedDate || !selectedTime}
                    id="calendar-next-btn"
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
