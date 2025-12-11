export interface AttendanceWebhookPayload {
  sn: string;
  user_id: string;
  timestamp: string;
  status: number;
  verify: number;
  workcode: number;
}
