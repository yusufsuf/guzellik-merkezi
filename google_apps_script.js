// ============================================
// GOOGLE CALENDAR WEBHOOK - Google Apps Script
// Bu kodu Google Apps Script'e yapıştırınız.
// ============================================
//
// KURULUM:
// 1. https://script.google.com adresine gidin
// 2. Yeni proje oluşturun
// 3. Bu kodu yapıştırın
// 4. "Dağıt" > "Web uygulaması olarak dağıt" seçin
// 5. Erişim: "Herkes" olarak ayarlayın
// 6. Dağıtılan URL'yi kopyalayın
// 7. Bu URL'yi Supabase'deki fonksiyona yapıştırın
//
// NOT: Her uzmanın Google Calendar'ını bu Apps Script sahibi
// Google hesabıyla paylaşın (düzenleme izni verin)
// ============================================

function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);

        var calendarId = data.calendar_id;
        var title = data.title || 'Randevu';
        var startTime = data.start_time; // ISO format: 2026-02-24T14:00:00
        var duration = data.duration || 30; // dakika
        var description = data.description || '';
        var customerName = data.customer_name || '';
        var customerPhone = data.customer_phone || '';
        var serviceName = data.service_title || '';
        var specialistName = data.specialist_name || '';
        var bookingCode = data.booking_code || '';
        var action = data.action || 'create'; // 'create' veya 'delete'

        if (!calendarId) {
            return ContentService.createTextOutput(
                JSON.stringify({ success: false, error: 'calendar_id gerekli' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        var calendar = CalendarApp.getCalendarById(calendarId);

        if (!calendar) {
            return ContentService.createTextOutput(
                JSON.stringify({ success: false, error: 'Takvim bulunamadı: ' + calendarId })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        if (action === 'delete') {
            // Randevu kodu ile etkinliği bul ve sil
            if (bookingCode) {
                var events = calendar.getEvents(
                    new Date(new Date(startTime).getTime() - 86400000),
                    new Date(new Date(startTime).getTime() + 86400000)
                );
                for (var i = 0; i < events.length; i++) {
                    if (events[i].getDescription().indexOf(bookingCode) > -1) {
                        events[i].deleteEvent();
                    }
                }
            }
            return ContentService.createTextOutput(
                JSON.stringify({ success: true, action: 'deleted' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Etkinlik oluştur
        var startDate = new Date(startTime);
        var endDate = new Date(startDate.getTime() + duration * 60000);

        var eventTitle = '💇 ' + serviceName + ' - ' + customerName;

        var eventDescription = '📋 Hizmet: ' + serviceName + '\n'
            + '👤 Müşteri: ' + customerName + '\n'
            + '📞 Telefon: ' + customerPhone + '\n'
            + '👩 Uzman: ' + specialistName + '\n'
            + '🔑 Randevu Kodu: ' + bookingCode + '\n\n'
            + 'Güzellik Merkezi Online Randevu Sistemi';

        var event = calendar.createEvent(eventTitle, startDate, endDate, {
            description: eventDescription,
        });

        // Alarmı kapat (bildirimsiz etkinlik)
        event.removeAllReminders();

        return ContentService.createTextOutput(
            JSON.stringify({
                success: true,
                event_id: event.getId(),
                action: 'created'
            })
        ).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(
            JSON.stringify({ success: false, error: err.message })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

// GET isteği için test endpoint
function doGet(e) {
    return ContentService.createTextOutput(
        JSON.stringify({ status: 'ok', message: 'Google Calendar Webhook aktif' })
    ).setMimeType(ContentService.MimeType.JSON);
}
