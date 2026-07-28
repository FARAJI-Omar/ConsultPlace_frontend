import type { Timesheet, DocumentFile, Mission, DailyEntry } from './models';

export interface ConsultantEarnings {
  year: number;
  totalEarnings: number;
}

export interface ConsultantMission extends Mission {
  missionDailyRate: number;
  contract: {
    id: number;
    ref: string;
    profile: string;
    dailyRate: number;
    client: {
      id: number;
      raison_sociale: string;
    };
  };
  canCreateTimesheet: boolean;
}

export interface TimesheetDetail extends Timesheet {
  attachments: DocumentFile[];
}

export interface CreateTimesheetPayload {
  missionId: number;
  month: string;
  dailyEntries: DailyEntry[];
}

export interface SubmitTimesheetResponse {
  id: number;
  status: 'SOUMIS';
  submittedAt: string;
  updatedAt: string;
}

export interface TrackingEntry {
  paymentId: number;
  timesheetId: number;
  date: string;
  missionTitle: string;
  missionId: number;
  timesheetMonth: string;
  timesheetStatus: string;
  paymentRef: string;
  paymentAmount: number;
  invoices: {
    invoiceId: number;
    ref: string;
  }[];
}

export interface MissionDetailData {
  mission: ConsultantMission;
  timesheets: Timesheet[];
  payoutHistory: TrackingEntry[];
}

export interface ConsultantProfileData {
  profile: {
    id: number;
    name: string;
    email: string;
    profile: string;
    dailyRate: number;
    isActive: boolean;
    createdAt: string;
  };
  activeMissions: {
    id: number;
    title: string;
    startDate: string;
    endDate: string | null;
  }[];
  missionCounts: {
    active: number;
    closed: number;
  };
  timesheetSummary: {
    counts: Record<string, number>;
    totalHours: number;
    totalDays: number;
  };
  financialSnapshot: {
    yearToDateEarnings: number;
    unpaidInvoicesTotal: number;
  };
}
