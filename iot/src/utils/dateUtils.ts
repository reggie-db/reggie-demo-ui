import { format as formatDate, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Format a Date object to relative time (e.g., "2 minutes ago")
 */
export function formatTimestamp(date: Date): string {
    return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Detect if a value is a timestamp string
 */
export function isTimestamp(value: any): boolean {
    if (!value) return false;
    const str = String(value);

    // Check for ISO 8601 format (2025-10-02T13:52:48.735000 or with timezone)
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
    if (isoPattern.test(str)) return true;

    // Check if it's a valid date string
    const date = new Date(str);
    return !isNaN(date.getTime()) && str.length > 10;
}

/**
 * Format a timestamp value to human-readable format with timezone
 */
export function formatTimestampValue(value: any): string {
    if (!value) return '-';

    try {
        const valueStr = String(value);
        const date = parseISO(valueStr);
        if (!isValid(date)) return String(value);

        // Extract timezone from the string if present
        const tzMatch = valueStr.match(/([+-])(\d{2}):?(\d{2})$/);
        const hasZ = valueStr.includes('Z');

        let timezoneAbbr = '';

        if (hasZ) {
            // UTC timezone
            timezoneAbbr = 'UTC';
        } else if (tzMatch) {
            // Extract offset and try to get timezone abbreviation using Intl API
            const sign = tzMatch[1];
            const hours = tzMatch[2];
            const minutes = tzMatch[3] || '00';

            // Try common US timezones to find one that matches this offset
            const timezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];
            const offsetStr = `${sign}${hours}:${minutes}`;

            for (const tz of timezones) {
                try {
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: tz,
                        timeZoneName: 'short',
                    });
                    const parts = formatter.formatToParts(date);
                    const tzPart = parts.find(part => part.type === 'timeZoneName');

                    // Check if this timezone's offset matches (simplified - just use first match)
                    if (tzPart) {
                        // Get offset for comparison
                        const offsetFormatter = new Intl.DateTimeFormat('en', {
                            timeZone: tz,
                            timeZoneName: 'longOffset',
                        });
                        const offsetParts = offsetFormatter.formatToParts(date);
                        const offsetPart = offsetParts.find(part => part.type === 'timeZoneName');

                        if (offsetPart?.value.includes(offsetStr)) {
                            timezoneAbbr = tzPart.value;
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Fallback to showing offset
            if (!timezoneAbbr) {
                timezoneAbbr = `UTC${sign}${hours}:${minutes}`;
            }
        }

        // Format date and time with AM/PM
        const formatted = formatDate(date, 'MMM d, yyyy h:mm:ss a');

        return timezoneAbbr ? `${formatted} ${timezoneAbbr}` : formatted;
    } catch (error) {
        return String(value);
    }
}

