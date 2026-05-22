export interface DashboardKPIs {
  pendingInvoices: number;
  totalPendingInvoices: number;
  totalRevenue: number;
  totalReceived: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  clients: MonthlyClientRevenue[];
  grandTotal: number;
}

export interface MonthlyClientRevenue {
  clientId: number;
  clientName: string;
  totalRevenue: number;
  contractCount: number;
}

export interface AlertItem {
  id: number;
  status: string;
  event: string;
  alert_severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  payload: { entityId: number; entityType: string };
  createdAt: string;
  updatedAt: string;
}

export interface AlertData {
  critical: AlertItem[];
  warning: AlertItem[];
  info: AlertItem[];
}

export interface ManagerTimesheet {
  id: number;
  consultantId: number;
  missionId: number;
  month: string;
  days: number;
  totalHours: number;
  status: string;
  clientValidation: boolean;
  submittedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  mission: { id: number; title: string; contractId: number };
  consultant: { id: number; name: string; email: string; profile: string };
}

export interface ManagerTimesheetDetail extends ManagerTimesheet {
  dailyEntries: { day: number; hours: number }[];
  attachments: { id: number; filename: string; url: string; type: string; uploadedAt: string }[];
}

export interface ReviewPayload {
  status: 'VALIDE' | 'REJETE';
  reason?: string;
}

export interface Invoice {
  id: number;
  ref: string;
  timesheetId: number;
  clientId: number;
  consultantId: number;
  amount: number;
  vatRate: number;
  vat: number;
  total: number;
  status: string;
  issueDate: string;
  dueDate: string;
  paymentDate: string | null;
  reminderFrequency: number | null;
  lastReminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  payments?: PaymentRecord[];
  paid?: number | null;
  rest?: number | null;
  documents?: string[];
  timesheet?: { id: number; month: string; days: number; status: string; mission: { id: number; title: string; contractId: number } };
  client?: { id: number; raison_sociale: string; email: string };
  consultant?: { id: number; name: string; email: string };
}

export interface PaymentRecord {
  id: number;
  invoiceId: number;
  consultantId: number;
  ref: string;
  amount: number;
  status: string;
  type: string;
  date: string;
}

export interface PaymentPayload {
  amount: number;
  date: string;
}

export interface MarkPaidPayload {
  invoiceId: number;
  paymentDate: string;
}

export interface GenerateInvoicePayload {
  timesheetId: number;
  vatRate?: number;
}

export interface PayoutPayload {
  invoiceId: number;
  payoutPercentage?: number;
}

export interface PayoutHistoryTotals {
  total_to_be_payed: number;
  total_payed: number;
}

export interface PayoutHistoryEntry {
  id: number;
  invoiceRef: string;
  amount: number;
  date: string;
  status: string;
}

export interface PayoutHistory {
  totals: PayoutHistoryTotals;
  history: PayoutHistoryEntry[];
}

export interface TrackingRow {
  id: number;
  ref: string;
  client: string;
  consultant: string;
  amount: number;
  vat: number;
  total: number;
  status: string;
  issueDate: string;
  dueDate: string;
  paymentDate: string | null;
  totalPaid: number;
  cabinet_margin: number;
  timesheet: { month: string; mission: string };
  days: number;
  dailyRate: number;
  invoiceRef: string;
  consultantStatus: string;
  clientStatus: string;
  consultantPaymentDate: string | null;
}

export interface TurnoverForecast {
  forecastMonths: number;
  totalEstimatedRevenue: number;
  avgMonthlyRevenue: number;
  activeMissionsCount: number;
  missions: {
    missionId: number;
    missionTitle: string;
    clientName: string;
    consultantName: string;
    dailyRate: number;
    estimatedDaysPerMonth: number;
    estimatedRevenuePerMonth: number;
    monthsRemaining: number;
    totalEstimatedRevenue: number;
    startDate: string;
    endDate: string;
  }[];
}

export interface MarginForecast {
  period: number;
  summary: {
    totalRevenue: number;
    totalPayouts: number;
    cabinet_margin: number;
    marginPercentage: number;
  };
  byClient: { clientId: number; clientName: string; totalRevenue: number; invoiceCount: number }[];
  byConsultant: { consultantId: number; consultantName: string; totalPayout: number }[];
}

export interface ReminderPayload {
  frequency: 7 | 15 | 30;
}

export interface ReminderResponse {
  invoiceId: number;
  frequency: number;
  status: string;
}
