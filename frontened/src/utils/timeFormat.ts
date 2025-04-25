
// Function to format time in format HH:MM:SS.S with Los Angeles timezone
export const formatTime = (time: number | Date): string => {
  // Convert to object Date if it's a timestamp
  const date = typeof time === 'number' ? new Date(time) : time;
  
  // First convert to Los Angeles time
  const laDate = getLosAngelesTime(date);
  
  // Extract hours, minutes, seconds and milliseconds
  const hours = laDate.getHours().toString().padStart(2, '0');
  const minutes = laDate.getMinutes().toString().padStart(2, '0');
  const seconds = laDate.getSeconds().toString().padStart(2, '0');
  const milliseconds = Math.floor(laDate.getMilliseconds() / 100); // Only first digit of milliseconds
  
  // Format as HH:MM:SS.S (06:55:51.0)
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

// Function to get time in LA
export const getLosAngelesTime = (date: Date): Date => {
  // Create a formatter with LA timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  // Format the date to get the parts
  const parts = formatter.formatToParts(date);
  
  // Extract the parts into a new date
  const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
  const month = parseInt(parts.find(part => part.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(part => part.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(part => part.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(part => part.type === 'second')?.value || '0');
  
  // Create a new date with the LA time
  const laDate = new Date(year, month, day, hour, minute, second);
  laDate.setMilliseconds(date.getMilliseconds());
  
  return laDate;
};
