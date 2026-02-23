// Google Calendar & ICS link oluşturucu

/**
 * Google Calendar'a etkinlik eklemek için URL oluşturur
 * @param {Object} params
 * @param {string} params.title - Etkinlik başlığı
 * @param {string} params.startTime - Başlangıç zamanı (ISO: 2026-02-24T14:00:00)
 * @param {number} params.duration - Süre (dakika)
 * @param {string} params.description - Açıklama
 * @param {string} params.location - Konum (opsiyonel)
 * @returns {string} Google Calendar URL
 */
export function createGoogleCalendarUrl({
    title,
    startTime,
    duration = 30,
    description = '',
    location = '',
}) {
    // startTime formatı: "2026-02-24T14:00:00"
    const start = startTime.replace(/[-:]/g, '').replace('T', 'T')

    // End time hesapla
    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + duration * 60000)
    const pad = (n) => String(n).padStart(2, '0')
    const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}${pad(endDate.getSeconds())}`

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${start}/${end}`,
        details: description,
        location: location,
        ctz: 'Europe/Istanbul',
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * ICS dosyası içeriği oluşturur (Apple Calendar, Outlook vb. için)
 */
export function createICSContent({
    title,
    startTime,
    duration = 30,
    description = '',
    location = '',
}) {
    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + duration * 60000)

    const formatICS = (d) => {
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    }

    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@guzellikmerkezi`

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Güzellik Merkezi//Randevu//TR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `DTSTART;TZID=Europe/Istanbul:${formatICS(startDate)}`,
        `DTEND;TZID=Europe/Istanbul:${formatICS(endDate)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
        `LOCATION:${location}`,
        `UID:${uid}`,
        `STATUS:CONFIRMED`,
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'ACTION:DISPLAY',
        'DESCRIPTION:Randevu hatırlatma',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n')
}

/**
 * ICS dosyasını indirme
 */
export function downloadICS(params) {
    const content = createICSContent(params)
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'randevu.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Randevu bilgilerinden takvim parametreleri oluşturur
 */
export function getCalendarParams(appointment) {
    return {
        title: `💇 ${appointment.service_title || 'Randevu'} - ${appointment.specialist_name || ''}`,
        startTime: appointment.start_time,
        duration: appointment.duration || 30,
        description: [
            `Hizmet: ${appointment.service_title || '-'}`,
            `Uzman: ${appointment.specialist_name || '-'}`,
            `Saat: ${appointment.appointment_time || '-'}`,
            appointment.booking_code ? `Randevu Kodu: ${appointment.booking_code}` : '',
            '',
            'Güzellik Merkezi Online Randevu',
        ].filter(Boolean).join('\n'),
        location: 'Güzellik Merkezi',
    }
}
