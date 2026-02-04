export interface CalendarEvent {
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    organizer?: { name: string; email: string };
}

export function generateICSFile(events: CalendarEvent[]): string {
    const formatDate = (date: Date): string => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Federacion Voley Ushuaia//V1.0//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ];

    events.forEach(event => {
        lines.push(
            'BEGIN:VEVENT',
            `UID:${crypto.randomUUID()}@federacionvoleyushuaia.com`,
            `DTSTAMP:${formatDate(new Date())}`,
            `DTSTART:${formatDate(event.startTime)}`,
            `DTEND:${formatDate(event.endTime)}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description || ''}`,
            `LOCATION:${event.location || ''}`,
            'STATUS:CONFIRMED',
            'END:VEVENT'
        );
    });

    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
}

export function downloadICS(filename: string, events: CalendarEvent[]) {
    const icsContent = generateICSFile(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

    // Create download link programmatically
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
