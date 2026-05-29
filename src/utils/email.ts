export interface StoredJob {
  jobId: number;
  invoiceId: number;
  type: 'email' | 'reminder';
  invoiceRef: string;
}

const STORAGE_KEY = 'pending_email_jobs';

export function validateInvoiceEmail(email: string | null | undefined): string | null {
  if (!email) return "Aucun email client renseigné sur cette facture";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "L'email du client est invalide";
  return null;
}

export function storeJob(job: StoredJob): void {
  const jobs: StoredJob[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  jobs.push(job);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function getStoredJobs(): StoredJob[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

export function clearJob(jobId: number): void {
  const jobs = getStoredJobs().filter(j => j.jobId !== jobId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}
