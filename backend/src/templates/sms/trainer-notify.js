export function getTrainerNotifyText(data) {
  return `You are assigned to interview: ${data.studentName}, ${data.company}, ${data.date} ${data.timeSlot}.`;
}
