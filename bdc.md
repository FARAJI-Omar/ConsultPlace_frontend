# Bon de Commande (BDC) — Implementation Plan

## Overview

Elevate Bon de Commande (BDC) from a free-text field on Invoice to a proper entity with day tracking, mission association, and consumption lifecycle.

**Key rules**:
- A BDC is created against a **Contract** and a **Mission** (both required at creation)
- A Mission can have **multiple** BDCs (1:many)
- Invoice generation is optional BDC — if `bdcAssignments` are provided, days are consumed **greedily** (fill oldest BDC first, ordered by `createdAt`)
- `daysLeft` tracks remaining allocation; `isActive` toggles to `false` when `daysLeft = 0`
- On invoice cancel, BDC consumption is reversed

---

## Data Model

### New Table: `BonDeCommande`

| Column       | Type            | Notes                                      |
|--------------|-----------------|--------------------------------------------|
| id           | Int (PK, auto)  |                                            |
| bdc          | String          | Free-text reference (e.g. "BDC-001")       |
| contractId   | Int (FK)        | → Contract.id                              |
| missionId    | Int (FK)        | → Mission.id                               |
| totalDays    | Float           | Total days allocated by the client         |
| daysLeft     | Float           | = totalDays at creation; decremented on consumption; restored on cancel |
| isActive     | Boolean         | `true` by default; `false` when daysLeft = 0 |
| startDate    | DateTime @db.Date |                                          |
| endDate      | DateTime @db.Date | ?optional                                |
| createdAt    | DateTime        |                                            |
| updatedAt    | DateTime        |                                            |

### New Table: `InvoiceBdcConsumption`

| Column       | Type            | Notes                                      |
|--------------|-----------------|--------------------------------------------|
| id           | Int (PK, auto)  |                                            |
| invoiceId    | Int (FK)        | → Invoice.id                               |
| timesheetId  | Int             | Which timesheet consumed from this BDC     |
| bdcId        | Int (FK)        | → BonDeCommande.id                         |
| daysConsumed | Float           | Days taken from this BDC for this timesheet|

UNIQUE(invoiceId, timesheetId, bdcId)

### Modified Tables

| Table      | Change                                                  |
|------------|---------------------------------------------------------|
| Invoice    | **Remove** `bdc String?`                                |
| Mission    | **Add** `bdcs BonDeCommande[]` relation                 |
| Attachment | **Add** `bdcId Int?` + relation to BonDeCommande        |

---

## Backend Tasks

### B1 — Prisma Schema
- [x] **B1.1** Add `BonDeCommande` model to `prisma/schema.prisma`
- [x] **B1.2** Add `InvoiceBdcConsumption` model to `prisma/schema.prisma`
- [x] **B1.3** Add `bdcs BonDeCommande[]` relation to `Mission` model
- [x] **B1.4** Remove `bdc String?` from `Invoice` model
- [x] **B1.5** Add `bdcId Int?` + `bdc BonDeCommande?` relation to `Attachment` model + `@@index([bdcId])`
- [x] **B1.6** Run `npx prisma migrate dev` with a descriptive name (e.g. `add_bon_de_commande`)

### B2 — New Module: `src/modules/bons-de-commande/`
- [x] **B2.1** Create `bons-de-commande.validation.ts`
  - `createBdcSchema` — body: `bdc`, `contractId`, `missionId`, `totalDays`, `startDate`, `endDate`
  - `updateBdcSchema` — body: partial of create (all optional)
  - `getBdcsSchema` — query: `page`, `limit`, `missionId` (optional), `contractId` (optional)
- [x] **B2.2** Create `bons-de-commande.repository.ts`
  - `createBdc(data)`, `findBdcById(id)`, `findBdcs(skip, take, where?)`, `countBdcs(where?)`, `updateBdc(id, data)`, `getBdcsByMissionId(missionId)`
- [x] **B2.3** Create `bons-de-commande.service.ts`
  - `addBdc`: set `daysLeft = totalDays`, upload attachments as `BDC_DOC`, audit log
  - `getBdcs`, `getBdcById`, `editBdc` (recalculate daysLeft if totalDays changes)
- [x] **B2.4** Create `bons-de-commande.controller.ts`
- [x] **B2.5** Create `bons-de-commande.routes.ts`
  - Auth: `authenticate` + `authorize(['GESTIONNAIRE', 'ADMIN'])`
  - `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `POST /:id/attachments`

### B3 — App Module Registration
- [x] **B3.1** Import `bonsDeCommandeRouter` in `src/modules/app.module.ts`
- [x] **B3.2** Register: `appModule.use('/bons-de-commande', bonsDeCommandeRouter)`

### B4 — Missions Changes
- [x] **B4.1** `missions.validation.ts` — add optional `bdcIds` to both create and update schemas
- [x] **B4.2** `missions.controller.ts` — parse `bdcIds` from form-data in create and update
- [x] **B4.3** `missions.service.ts` — `addMission`: validate BDC contract match, batch update `missionId` on assigned BDCs
- [x] **B4.4** `missions.service.ts` — `editMission`: same BDC handling
- [x] **B4.5** `missions.repository.ts` — `findMissionById`: include `bdcs` with attachments
- [x] **B4.6** `missions.repository.ts` — `findMissions`: include lightweight `bdcs`

### B5 — Invoice Generation Changes
- [x] **B5.1** `invoices.validation.ts` — remove `bdc`, add `bdcAssignments` to both schemas
- [x] **B5.2** `invoices.controller.ts` — extract `bdcAssignments` instead of `bdc`
- [x] **B5.3** `invoices.service.ts` — `generateInvoiceForTimesheet`: replace `bdc` param with greedy BDC consumption
- [x] **B5.4** `invoices.service.ts` — `generateGroupedInvoice`: same BDC consumption per timesheet
- [x] **B5.5** `invoices.service.ts` — `cancelInvoice`: restore BDC daysLeft, delete consumption records
- [x] **B5.6** `invoices.service.ts` — `cancelGroupedInvoice`: same restoration logic
- [x] **B5.7** `invoices.repository.ts` — add `createBdcConsumptions`, `findBdcConsumptionsByInvoiceId`, `deleteBdcConsumptionsByInvoiceId`

### B6 — Invoice PDF Changes
- [x] **B6.1** `invoice-pdf.repository.ts` — include `bdcConsumptions.bdc` in PDF queries
- [x] **B6.2** `invoice-pdf.service.ts` — replace `invoice.bdc` reads with junction table lookups (3 locations)

### B7 — Database Migration
- [x] **B7.1** Created migration file: `prisma/migrations/20260615160000_add_bon_de_commande/migration.sql`
  - Creates `BonDeCommande` and `InvoiceBdcConsumption` tables
  - Adds `bdcId` column to `Attachment`
  - Drops `bdc` column from `Invoice`
  - All indexes + foreign keys
- [x] **B7.2** Marked all baseline migrations as applied on dev DB
- [x] **B7.3** Preserved 2 existing `bdc` values (`26AWCC/001122`, `26AWCC/0444`) via data migration script

### B8 — Verification
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npm test` — 203/203 passing
- [x] `npm run build` — compiles clean
- [x] `npx prisma migrate deploy` — "No pending migrations to apply"

---

## Frontend Tasks

### F1 — BDC Management Page (`/bons-de-commande`)
- [ ] **F1.1** **BDC List View**
  - Table columns: `bdc` (ref), Contract ref, Mission title, Total Days, Days Left, Remaining %, Status (active/inactive), Start Date, End Date
  - Filters: by mission, by contract
  - Pagination via `GET /api/bons-de-commande?page=&limit=&missionId=&contractId=`
- [ ] **F1.2** **Create BDC Form** (modal or page)
  - Fields: `bdc` (text input), `contractId` (select/dropdown), `missionId` (select), `totalDays` (number), `startDate` (date picker), `endDate` (date picker)
  - Optional: file upload for BDC document attachments
  - Submit → `POST /api/bons-de-commande` (multipart if files)
- [ ] **F1.3** **Edit BDC Form**
  - Editable fields: `bdc`, `totalDays`, `startDate`, `endDate`
  - Options to upload/delete attachments
  - Submit → `PATCH /api/bons-de-commande/:id`
- [ ] **F1.4** **BDC Detail View** (`/bons-de-commande/:id`)
  - Display all BDC fields + consumption history (list of invoices with dates and days)
  - Show attached documents (BDC_DOC type)
  - Links to associated mission and contract

### F2 — Mission Form Changes
- [ ] **F2.1** **Create Mission Form** — add BDC selector
  - After selecting the contract, fetch BDCs for that contract: `GET /api/bons-de-commande?contractId=<contractId>`
  - Show multi-select of BDCs (showing `bdc` ref + `daysLeft` remaining)
  - Selected BDC IDs sent as `bdcIds` in the mission creation body
- [ ] **F2.2** **Edit Mission Form** — add BDC selector
  - Show currently assigned BDCs (pre-selected), allow adding/removing
  - Submit → `PATCH /api/missions/:id` with `bdcIds`
- [ ] **F2.3** **Mission Detail View** — show BDC info
  - Display assigned BDCs: ref, totalDays, daysLeft, isActive, links to BDC detail
  - Show BDC attachments (BDC_DOC)
  - Already present in `GET /api/missions/:id` response under `bdcs`

### F3 — Invoice Generation Form Changes
- [ ] **F3.1** **Single Invoice Generation** (`POST /api/invoices/generate`)
  - After selecting a VALIDE timesheet, fetch mission's BDCs: `GET /api/bons-de-commande?missionId=<missionId>`
  - Show active BDCs with `daysLeft` for user to select (multi-select allowed)
  - Client-side validation: `sum(selected BDCs' daysLeft) >= timesheet.days` — show warning if insufficient
  - Send `bdcAssignments: [{ timesheetId, bdcId }, ...]` in request body
  - BDC is **optional** — if none selected, invoice generates without BDC consumption
- [ ] **F3.2** **Grouped Invoice Generation** (`POST /api/invoices/generate-grouped`)
  - For each timesheet, show separate BDC selector
  - Each selector fetches BDCs for that timesheet's mission
  - Validation per timesheet: `sum(selected BDCs' daysLeft) >= timesheet.days`
  - Send `bdcAssignments: [{ timesheetId, bdcId }, ...]`
- [ ] **F3.3** **Days remaining display**
  - Show a bar or number for each BDC: "Remaining: X / Total: Y days"
  - Highlight in orange/red when daysLeft is low

### F4 — Invoice Detail / PDF
- [ ] **F4.1** **Invoice Detail View** — show consumed BDCs
  - Display: "BDC: BDC-001 (5 days), BDC-002 (3 days)"
- [ ] **F4.2** **Invoice PDF** — no frontend changes needed
  - Backend already renders BDC reference(s) from consumption records

---

## API Contract Summary

### Auth Roles

| Endpoint | Method | Roles |
|---|---|---|
| `/api/bons-de-commande` | POST, GET, PATCH | GESTIONNAIRE, ADMIN |
| `/api/bons-de-commande/:id` | GET, PATCH | GESTIONNAIRE, ADMIN |
| `/api/bons-de-commande/:id/attachments` | POST | GESTIONNAIRE, ADMIN |
| `/api/missions` | POST, PATCH | ADMIN |
| `/api/missions/:id` | GET | ADMIN |
| `/api/invoices/generate` | POST | GESTIONNAIRE, ADMIN |
| `/api/invoices/generate-grouped` | POST | GESTIONNAIRE, ADMIN |
| `/api/invoices/:id/cancel` | POST | GESTIONNAIRE, ADMIN |
| `/api/invoices/:id/cancel-grouped` | POST | GESTIONNAIRE, ADMIN |
| `/api/invoice-pdf/:id/download` | GET | GESTIONNAIRE, ADMIN |

All endpoints require a valid JWT Bearer token.

### Error Response Shape
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST|VALIDATION_ERROR|CONFLICT|NOT_FOUND|UNAUTHORIZED|FORBIDDEN",
    "message": "Human-readable French message"
  }
}
```

### New: BDC Endpoints

#### `POST /api/bons-de-commande` — Create BDC

**Request** (multipart/form-data):
```
bdc: "BDC-2026-001"
contractId: 3
missionId: 12
totalDays: 30
startDate: "2026-01-01"
endDate: "2026-06-30"
files: [optional PDF/JPG/PNG]
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 3,
    "bdc": "BDC-2026-001",
    "contractId": 3,
    "missionId": 12,
    "totalDays": 30,
    "daysLeft": 30,
    "isActive": true,
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-06-30T00:00:00.000Z",
    "contract": { "id": 3, "ref": "CIH-202606-001", "client": { "id": 2, "raison_sociale": "CIH" } },
    "mission": { "id": 12, "title": "m4" },
    "attachments": [],
    "consumedBy": [],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### `GET /api/bons-de-commande` — List BDCs

**Query params**: `?page=1&limit=20&missionId=12&contractId=3` (all optional)

**Response** (200):
```json
{
  "success": true,
  "data": [{
    "id": 3, "bdc": "BDC-2026-001", "contractId": 3, "missionId": 12,
    "totalDays": 30, "daysLeft": 10, "isActive": true,
    "startDate": "...", "endDate": "...",
    "contract": { "id": 3, "ref": "...", "client": { "id": 2, "raison_sociale": "..." } },
    "mission": { "id": 12, "title": "m4" }
  }],
  "pagination": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
}
```

#### `GET /api/bons-de-commande/:id` — BDC Detail

**Response** (200): Same as list, plus `attachments` (type=BDC_DOC) and `consumedBy` array with invoice refs.

#### `PATCH /api/bons-de-commande/:id` — Update BDC

**Request** (JSON or multipart): All fields optional. If `totalDays` changes: `daysLeft = max(0, currentDaysLeft + (newTotalDays - oldTotalDays))`.

**Response** (200): Same shape as GET detail.

#### `POST /api/bons-de-commande/:id/attachments` — Upload Documents

**Request** (multipart): `files` field (PDF/JPG/PNG, max 10, 10MB each)
**Response** (200): Same as GET detail with new attachments.

---

### Modified: Mission Endpoints

#### `POST /api/missions` — Create Mission

New optional field: `bdcIds: [3, 5]` (array of existing BDC IDs).
Validation: each BDC's `contractId` must match mission's `contractId` (400 if mismatch).
Response now includes `bdcs` array.

#### `PATCH /api/missions/:id` — Update Mission

New optional field: `bdcIds: [3, 5]`. Links BDCs to mission. Same contract validation.

#### `GET /api/missions/:id` — Mission Detail

Response now includes `bdcs: [{ id, bdc, totalDays, daysLeft, isActive, startDate, endDate, attachments[] }]`.

#### `GET /api/missions` — Missions List

Response now includes lightweight `bdcs: [{ id, bdc, totalDays, daysLeft, isActive }]`.

---

### Modified: Invoice Endpoints

#### `POST /api/invoices/generate` — Generate Single Invoice

**Removed**: `bdc` field.
**Added**: `bdcAssignments: [{ timesheetId: 5, bdcId: 3 }]` (optional array).
BDC consumption: greedy (oldest BDC first by `createdAt`). Error 400 if days insufficient.

```json
{
  "timesheetId": 5,
  "vatRate": 20,
  "delai": 30,
  "bdcAssignments": [{ "timesheetId": 5, "bdcId": 3 }, { "timesheetId": 5, "bdcId": 5 }]
}
```

#### `POST /api/invoices/generate-grouped` — Generate Grouped Invoice

Same changes: `bdc` removed, `bdcAssignments` added (optional). Per-timesheet BDC selection.

```json
{
  "timesheetIds": [5, 6, 7],
  "vatRate": 20,
  "delai": 30,
  "bdcAssignments": [
    { "timesheetId": 5, "bdcId": 3 },
    { "timesheetId": 6, "bdcId": 3 },
    { "timesheetId": 7, "bdcId": 5 }
  ]
}
```

#### `POST /api/invoices/:id/cancel` and `POST /api/invoices/:id/cancel-grouped`

On cancel, BDC consumption is automatically restored: `daysLeft` incremented, `isActive` reactivated if `daysLeft > 0`.

#### `GET /api/invoices/:id` — Invoice Detail

Response now includes `bdcConsumptions` array:
```json
{
  "success": true,
  "data": {
    "...": "...",
    "bdcConsumptions": [
      {
        "id": 1,
        "invoiceId": 7,
        "timesheetId": 12,
        "bdcId": 1,
        "daysConsumed": 21,
        "bdc": { "id": 1, "bdc": "26AWCC/001122" }
      }
    ]
  }
}
```
Frontend can display: `"BDC: 26AWCC/001122 (21 days), ..."`

#### `GET /api/invoice-pdf/:id/download`

PDF now renders BDC reference(s) from consumption records (e.g., `BDC: BDC-2026-001, BDC-2026-003`).

---

## Issues Encountered

| # | Issue | Resolution |
|---|-------|------------|
| 1 | `prisma migrate dev` blocked in non-interactive terminal | Used `prisma db push --accept-data-loss` instead |
| 2 | 2 invoices had non-null `bdc` values | Queried data first, pushed schema, then ran migration script to recreate as BonDeCommande + InvoiceBdcConsumption records |
| 3 | ESM/Windows path issues when using ts-node for data migration | Wrote temp scripts in project root with relative imports |
| 4 | `cancelInvoice` test failed: mock returned undefined for new `findBdcConsumptionsByInvoiceId` | Added null-safety: `if (!consumptions \|\| consumptions.length === 0) return;` |

---

## Files Changed

**Created (6):**
- `src/modules/bons-de-commande/bons-de-commande.validation.ts`
- `src/modules/bons-de-commande/bons-de-commande.repository.ts`
- `src/modules/bons-de-commande/bons-de-commande.service.ts`
- `src/modules/bons-de-commande/bons-de-commande.controller.ts`
- `src/modules/bons-de-commande/bons-de-commande.routes.ts`
- `prisma/migrations/20260615160000_add_bon_de_commande/migration.sql`

**Modified (14):**
- `prisma/schema.prisma`
- `src/modules/app.module.ts`
- `src/modules/missions/missions.validation.ts`
- `src/modules/missions/missions.controller.ts`
- `src/modules/missions/missions.service.ts`
- `src/modules/missions/missions.repository.ts`
- `src/modules/invoices/invoices.validation.ts`
- `src/modules/invoices/invoices.controller.ts`
- `src/modules/invoices/invoices.service.ts`
- `src/modules/invoices/invoices.repository.ts`
- `src/modules/invoice-pdf/invoice-pdf.repository.ts`
- `src/modules/invoice-pdf/invoice-pdf.service.ts`
- `src/modules/contracts/contracts.service.ts` (pre-existing TS errors fixed)

**Data migrated**: 2 existing `bdc` values → `BonDeCommande` + `InvoiceBdcConsumption` records
