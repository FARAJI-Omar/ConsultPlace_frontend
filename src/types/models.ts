export interface User {
  id: number;
  email: string;
  consultantId: number | null;
}

export interface Client {
  id: number;
  raison_sociale: string;
  rc: string;
  identifiant_commun: string;
  identifiant_fiscal: string | null;
  contact: string;
  email: string;
  address: string;
  phone_n?: string;
  total_contracts: number;
  createdAt: string;
  updatedAt: string;
}

export interface Consultant {
  id: number;
  name: string;
  email: string;
  profile: string;
  dailyRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: number;
  ref: string;
  clientId: number;
  startDate: string;
  endDate: string;
  profile: string;
  dailyRate: number;
  createdAt: string;
  updatedAt: string;
  documents?: DocumentFile[];
  attachments?: DocumentFile[];
  client?: Partial<Client>;
}

export interface DocumentFile {
  id: number;
  timesheetId?: number | null;
  contractId?: number | null;
  filename: string;
  url: string;
  type: 'CONTRACT_DOC' | 'PROOF' | 'CRA' | 'INVOICE' | 'MISSION_DOC';
  uploadedAt?: string;
}

export interface Mission {
  id: number;
  contractId: number;
  consultantId: number;
  title: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  contract?: Partial<Contract>;
  consultant?: Partial<Consultant>;
}

export interface DailyEntry {
  day: number;
  hours: number;
}

export type TimesheetStatus =
  | 'BROUILLON'
  | 'SOUMIS'
  | 'VALIDE'
  | 'REJETE'
  | 'FACTURE'
  | 'PAYE';

export interface Timesheet {
  id: number;
  consultantId: number;
  missionId: number;
  month: string;
  dailyEntries?: DailyEntry[];
  days: number;
  totalHours: number;
  status: TimesheetStatus;
  clientValidation: boolean;
  submittedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  mission?: Partial<Mission>;
  consultant?: Partial<Consultant>;
  attachments?: DocumentFile[];
  contractDocuments?: DocumentFile[];
}

export type InvoiceStatus =
  | 'PENDING'
  | 'PARTIAL_PAID'
  | 'PAID'
  | 'CANCELED';

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
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  reminderFrequency?: number;
  lastReminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
  timesheet?: Partial<Timesheet>;
  client?: Partial<Client>;
  consultant?: Partial<Consultant>;
  payments?: PaymentRecord[];
  documents?: string[];
}

export interface PaymentRecord {
  invoiceId: number;
  amount: number;
  newStatus: InvoiceStatus;
  remainingBalance: number;
}

export type PayoutStatus = 'COMPLETED' | 'PENDING';
export type PayoutType = 'CONSULTANT';

export interface Payout {
  id: number;
  invoiceId: number;
  consultantId: number;
  ref: string;
  amount: number;
  status: PayoutStatus;
  type: PayoutType;
  date: string;
}

export type AlertType = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertEvent =
  | 'LATE_INVOICE'
  | 'LATE_PAYOUT'
  | 'UNBILLED_CRA'
  | 'PENDING_CRA'
  | 'UPCOMING_BILL';

export interface AlertRule {
  id: number;
  type: AlertType;
  event: AlertEvent;
  threshold: number;
  isActive: boolean;
  titleTemplate: string | null;
  messageTemplate: string | null;
}

export interface Gestionnaire {
  id: number;
  email: string;
  role: 'GESTIONNAIRE';
  consultantId: null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  userRole: string;
  action: string;
  entityType: string;
  entityId: number;
  details?: Record<string, unknown>;
  ipAddress: string;
  timestamp: string;
}

export interface DashboardKPIs {
  pendingInvoices: number;
  totalPendingInvoices: number;
  cabinet_margin: number;
}

export interface TrackingRow {
  id: number;
  ref: string;
  client: string;
  consultant: string;
  amount: number;
  vat: number;
  total: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  totalPaid: number;
  cabinet_margin: number;
  timesheet: { month: string; mission: string };
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
  status: PayoutStatus;
}

export interface PayoutHistory {
  totals: PayoutHistoryTotals;
  history: PayoutHistoryEntry[];
}

export interface MonthlyPayoutSummary {
  year: number;
  month: number;
  consultants: MonthlyConsultantPayout[];
  grandTotal: number;
}

export interface MonthlyConsultantPayout {
  consultantId: number;
  consultantName: string;
  consultantEmail: string;
  totalPayout: number;
}

export interface TurnoverForecast {
  forecastMonths: number;
  totalEstimatedRevenue: number;
  avgMonthlyRevenue: number;
  activeMissionsCount: number;
  missions: ForecastMission[];
}

export interface ForecastMission {
  missionId: number;
  missionTitle: string;
  clientName: string;
  consultantName: string;
  dailyRate: number;
  estimatedDaysPerMonth: number;
  estimatedRevenuePerMonth: number;
  monthsRemaining: number;
  totalEstimatedRevenue: number;
}
