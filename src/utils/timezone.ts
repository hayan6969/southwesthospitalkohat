import { format as formatDate } from "date-fns";
import { toZonedTime, fromZonedTime, format } from "date-fns-tz";

// Pakistani timezone
export const PAKISTAN_TIMEZONE = "Asia/Karachi";

/**
 * Converts a date to Pakistani timezone
 */
export const toPakistanTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, PAKISTAN_TIMEZONE);
};

/**
 * Converts a date from Pakistani timezone to UTC
 */
export const fromPakistanTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return fromZonedTime(dateObj, PAKISTAN_TIMEZONE);
};

/**
 * Formats a date in Pakistani timezone
 */
export const formatInPakistanTime = (date: Date | string, formatString: string = "PPP p"): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatString, { timeZone: PAKISTAN_TIMEZONE });
};

/**
 * Gets current time in Pakistani timezone
 */
export const getCurrentPakistanTime = (): Date => {
  return toPakistanTime(new Date());
};

/**
 * Formats time for display in 12-hour format with Pakistani timezone
 */
export const formatTimeForDisplay = (date: Date | string): string => {
  return formatInPakistanTime(date, "h:mm a");
};

/**
 * Formats date for display in Pakistani timezone
 */
export const formatDateForDisplay = (date: Date | string): string => {
  return formatInPakistanTime(date, "PPP");
};

/**
 * Formats datetime for display in Pakistani timezone
 */
export const formatDateTimeForDisplay = (date: Date | string): string => {
  return formatInPakistanTime(date, "PPP 'at' h:mm a");
};

/**
 * Checks if a time is within hospital working hours
 */
export const isWithinHospitalHours = (
  date: Date,
  openingTime: string,
  closingTime: string
): boolean => {
  const pakistanTime = toPakistanTime(date);
  const currentTimeStr = format(pakistanTime, "HH:mm");
  
  return currentTimeStr >= openingTime && currentTimeStr <= closingTime;
};