
// MANUAL FORMATTER - BYPASSING ALL BROWSER DATE LOGIC
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DAYS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

export function formatArgentinaDateLiteral(dateInput: string | Date, options: any = {}): string {
    if (!dateInput) return '';
    if (dateInput instanceof Date && isNaN(dateInput.valueOf())) return '';
    const isoString = dateInput instanceof Date ? dateInput.toISOString() : String(dateInput);
    if (!isoString) return '';

    try {
        const [datePart, timePartFull] = isoString.split('T');
        if (!datePart || !timePartFull) return isoString;

        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePartFull.split(':').map(Number);

        // Calculate Weekday
        const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        const dayOfWeekIndex = utcDate.getUTCDay();

        const dayName = DAYS[dayOfWeekIndex];
        const monthName = MONTHS[month - 1];
        const dayNum = day;

        const dayStr = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
        const monthStr = monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();

        const formatted = `${dayStr}, ${dayNum} ${monthStr}`;
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        return `${formatted}, ${timeStr} hs`;

    } catch (e) {
        console.error("Error manual formatting", e);
        return String(dateInput);
    }
}

export function formatArgentinaTimeLiteral(dateInput: string | Date): string {
    if (!dateInput) return '';
    if (dateInput instanceof Date && isNaN(dateInput.valueOf())) return '';
    const isoString = dateInput instanceof Date ? dateInput.toISOString() : String(dateInput);
    if (!isoString) return '';
    const parts = isoString.split('T');
    if (parts.length < 2) return '';
    return parts[1].substring(0, 5);
}

export function getArgentinaDayLiteral(dateInput: string | Date): string {
    if (!dateInput) return '';
    if (dateInput instanceof Date && isNaN(dateInput.valueOf())) return '';
    const isoString = dateInput instanceof Date ? dateInput.toISOString() : String(dateInput);
    if (!isoString) return '';
    return isoString.split('T')[0].split('-')[2];
}

export function getArgentinaMonthLiteral(dateInput: string | Date): string {
    if (!dateInput) return '';
    if (dateInput instanceof Date && isNaN(dateInput.valueOf())) return '';
    const isoString = dateInput instanceof Date ? dateInput.toISOString() : String(dateInput);
    if (!isoString) return '';
    const m = parseInt(isoString.split('T')[0].split('-')[1]);
    return MONTHS[m - 1] || '';
}
