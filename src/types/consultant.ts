import type { Timesheet, DocumentFile, Mission, DailyEntry } from './models';

export interface ConsultantEarnings {
  year: number;
  totalEarnings: number;
}

export interface ConsultantMission extends Mission {
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
  timesheetId: number;
  date: string;
  missionTitle: string;
  missionId: number;
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
