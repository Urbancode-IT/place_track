export function getInterviewReminderText(data) {
  return `PlaceTrack: Interview reminder - ${data.studentName} at ${data.company}, ${data.round}, ${data.date} ${data.timeSlot}.`;
}
