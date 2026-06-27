# Super Admin Role + Invoice Audit Trail — Plan

**Status:** Planning / not yet implemented
**Goal:**
1. Add a new **`super_admin`** role that has **every admin feature** plus one extra page.
2. That extra page is an **Invoice Audit Trail** (a.k.a. *Invoice Change Log*) — it shows every invoice that was **created, edited, cancelled/voided, or deleted**, defaulting to **today**, with **date filters** to browse history and see exactly *what changed*.

> Recommended page name: **"Invoice Audit Trail"** (clearer than "edit log" since it also covers create/cancel/delete). Route: `/dashboard/admin/invoice-audit`.

---

## 1. Current state (grounded in the code)

### Roles & routing
- Roles are **plain text** on `profiles.role` (`role: string` in [types.ts](../src/integrations/supabase/types.ts)) — **no Postgres enum**, so adding a role value needs **no DB migration** for the value itself.
- The app's role union is hard-typed in [useAuth.tsx](../src/hooks/useAuth.tsx):
  `'admin' | 'doctor' | 'staff' | 'ota' | 'ipd' | 'head_pharmacist' | 'assistant_pharmacist' | 'salesman_pharmacist' | 'patient' | 'finance' | 'nursing' | 'inventory_manager' | 'store' | 'lab'` — **no `super_admin`**.
- Access control is per-route via [ProtectedRoute.tsx](../src/components/ProtectedRoute.tsx) `allowedRoles={[...]}`. Admin pages use `allowedRoles={['admin']}`.
- Login redirect: [useAuth.tsx](../src/hooks/useAuth.tsx) `signIn` sends users to `/dashboard/${role}` (pharmacist roles → `/dashboard/pharmacy`).
- Admin pages are routed in [App.tsx](../src/App.tsx) under `/dashboard/admin/*` (`DashboardAdmin`, `AdminStaff`, `AdminDoctors`, `AdminAuditLogs`, `AdminSettings`, …).
- Role dropdowns that create/edit accounts: [AccountManagementDialog.tsx](../src/components/dialogs/AccountManagementDialog.tsx) and [EditUserDialog.tsx](../src/components/dialogs/EditUserDialog.tsx). Account creation goes through the `create_user_account` RPC (stores `role` from metadata via the `handle_new_user` trigger).

### Existing audit infrastructure
- A generic `audit_logs` table (action, details, user_id, ip_address, created_at) + [AdminAuditLogs.tsx](../src/pages/dashboard/admin/AdminAuditLogs.tsx) page + `useAuditLogger`. This is **app-level and free-text** — good for "X did Y", **not** structured enough for "invoice #123 amount 9000→5800". So the invoice trail gets its **own structured table**.

### The invoice "flow" — every place invoices change (13 paths)
All are **INSERT or UPDATE**; **no hard `DELETE`** exists in the app (voids set `status = 'cancelled'`). Capturing these one-by-one in app code would be fragile and miss future paths — so we capture them centrally with a **DB trigger** (§3). The paths, for reference/coverage:

| Path | File | What it does to `invoices` |
|---|---|---|
| Consultation booking | [EnhancedAppointmentDialog.tsx](../src/components/dialogs/EnhancedAppointmentDialog.tsx), [useDatabase.ts](../src/hooks/useDatabase.ts) | INSERT (status paid) |
| Counter / staff billing | [StaffCounter.tsx](../src/components/staff/StaffCounter.tsx), [StaffInvoices.tsx](../src/components/staff/StaffInvoices.tsx) | INSERT / UPDATE |
| Pathology billing | [StaffPathologyBilling.tsx](../src/components/staff/StaffPathologyBilling.tsx) | INSERT (`PATH-INV-…`) |
| Lab order | [EnhancedLabDialog.tsx](../src/components/dialogs/EnhancedLabDialog.tsx), [useDatabase.ts](../src/hooks/useDatabase.ts) | INSERT (`LAB-…`) |
| X-ray | [XrayDialog.tsx](../src/components/dialogs/XrayDialog.tsx) | INSERT |
| OT scheduling | [OTScheduleDialog.tsx](../src/components/dialogs/OTScheduleDialog.tsx) | INSERT |
| Emergency consult | [EmergencyConsultationDialog.tsx](../src/components/dialogs/EmergencyConsultationDialog.tsx) | INSERT |
| **Retroactive discount** | [PreviousBillDiscountDialog.tsx](../src/components/dialogs/PreviousBillDiscountDialog.tsx) | **UPDATE `amount`** (+ description) |
| **Refund / void** | [FinanceRefunds.tsx](../src/pages/dashboard/finance/FinanceRefunds.tsx) | **UPDATE `status='cancelled'`** |
| Doctor schedule billing | [DoctorSchedule.tsx](../src/pages/dashboard/doctor/DoctorSchedule.tsx) | INSERT |
| Offline sync | [OfflineMode.tsx](../src/pages/OfflineMode.tsx), [useOfflineDataSync.ts](../src/hooks/useOfflineDataSync.ts) | INSERT |
| Patient appt | [MyAppointments.tsx](../src/components/MyAppointments.tsx) | INSERT |

**Key takeaway:** a single trigger on `invoices` covers all of these (and anything added later) without editing 13 files.

---

## 2. Part A — the `super_admin` role

### A1. Make the role exist (app-level, no enum migration)
- Add `'super_admin'` to the role union in [useAuth.tsx](../src/hooks/useAuth.tsx) (the `UserProfile.role` type **and** the cast inside `fetchUserProfile`).
- Add a `super_admin` option to the role `<Select>` in [AccountManagementDialog.tsx](../src/components/dialogs/AccountManagementDialog.tsx) and [EditUserDialog.tsx](../src/components/dialogs/EditUserDialog.tsx) so admins can assign it.

### A2. Give super_admin *all* admin features — one clean change, not 60 route edits
**Recommended:** in [ProtectedRoute.tsx](../src/components/ProtectedRoute.tsx), treat `super_admin` as a wildcard:
```tsx
const role = profile?.role;
if (allowedRoles && role && role !== 'super_admin' && !allowedRoles.includes(role)) {
  return <AccessDenied/>;
}
```
This grants super_admin access to **every** route in one place, instead of appending `'super_admin'` to each of the ~60 `allowedRoles` arrays. (Admin already appears in most arrays; super_admin simply bypasses the check.)

### A3. Login landing + dashboard
- `signIn` builds `/dashboard/${role}` → `super_admin` has no dashboard. Map it: in [useAuth.tsx](../src/hooks/useAuth.tsx) `signIn`, send `super_admin` to `/dashboard/admin` (reuse the admin dashboard) — like the pharmacist mapping already there.
- **Reuse the admin dashboard** and surface the extra page as a menu item visible only when `role === 'super_admin'` (see A4). No separate dashboard needed.

### A4. Surface the Invoice Audit Trail menu item
- In the admin layout/sidebar (the nav used by `DashboardAdmin` / admin pages), add an **"Invoice Audit Trail"** link to `/dashboard/admin/invoice-audit`, rendered only if `profile.role === 'super_admin'`.
- Add the route in [App.tsx](../src/App.tsx):
```tsx
<Route path="/dashboard/admin/invoice-audit" element={
  <ProtectedRoute allowedRoles={['super_admin']}>
    <InvoiceAuditTrail />
  </ProtectedRoute>
} />
```
(`super_admin` passes via the wildcard anyway; the explicit array documents intent and blocks plain `admin`.)

### A5. RLS consideration
- DB Row-Level Security policies that currently key on `role = 'admin'` will **not** automatically include `super_admin`. Audit which tables' RLS must also accept `super_admin` (at minimum the new audit table in Part B). Search migrations for `'admin'` in policies and extend the ones super_admin needs. Safest: a SQL helper `is_admin(uid)` returning true for `admin` **or** `super_admin`, used by policies going forward.

---

## 3. Part B — Invoice Audit Trail (the extra page)

### B1. New table `invoice_audit_log` (migration)
```sql
CREATE TABLE public.invoice_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid,                       -- not FK: survives a hard delete
  invoice_number text,
  operation    text NOT NULL,              -- 'created' | 'updated' | 'deleted'
  changed_by   uuid REFERENCES public.profiles(id),
  changed_at   timestamptz NOT NULL DEFAULT now(),
  -- what changed (nulls where N/A)
  old_amount   numeric,  new_amount  numeric,
  old_status   text,     new_status  text,
  old_row      jsonb,    new_row     jsonb,  -- full snapshots for full detail
  changed_fields text[]                      -- e.g. {amount,status,description}
);
CREATE INDEX invoice_audit_changed_at ON public.invoice_audit_log (changed_at DESC);
CREATE INDEX invoice_audit_invoice     ON public.invoice_audit_log (invoice_id);
```

### B2. Trigger on `invoices` — captures every create/edit/void/delete
```sql
CREATE OR REPLACE FUNCTION public.log_invoice_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE changed text[] := '{}';
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN changed := changed || 'amount'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN changed := changed || 'status'; END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN changed := changed || 'description'; END IF;
    IF array_length(changed,1) IS NULL THEN RETURN NEW; END IF;   -- no meaningful change
    INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
      old_amount, new_amount, old_status, new_status, old_row, new_row, changed_fields)
    VALUES (NEW.id, NEW.invoice_number, 'updated', auth.uid(),
      OLD.amount, NEW.amount, OLD.status, NEW.status, to_jsonb(OLD), to_jsonb(NEW), changed);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
      new_amount, new_status, new_row)
    VALUES (NEW.id, NEW.invoice_number, 'created', auth.uid(), NEW.amount, NEW.status, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
      old_amount, old_status, old_row)
    VALUES (OLD.id, OLD.invoice_number, 'deleted', auth.uid(), OLD.amount, OLD.status, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_invoice_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_invoice_change();
```
**Why a trigger (not app code):** it captures all 13 paths + future ones + any direct DB edit, atomically, with zero call-site changes. The app already labels voids (`status='cancelled'`) and discounts (`amount` change + `[Adjusted: …]` description), so the log reads cleanly: *created → edited (amount 9000→5800) → cancelled*.

### B3. `changed_by` caveat (important)
`auth.uid()` is the logged-in user for normal app writes (RLS context) — so discounts/voids done in the UI record the real user. **But** writes made through a `SECURITY DEFINER` RPC or the service role can have `auth.uid() = NULL`. The booking RPCs and offline sync may show a null actor. Options: accept null ("system"), or pass the actor explicitly into those RPCs. Note it; don't block on it.

### B4. RLS
```sql
ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin reads invoice audit" ON public.invoice_audit_log
  FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin'));  -- add 'admin' if desired
-- No INSERT/UPDATE/DELETE policy: only the SECURITY DEFINER trigger writes.
```

### B5. The page `InvoiceAuditTrail.tsx`
- Route `/dashboard/admin/invoice-audit`, super_admin only.
- **Default = today** (Pakistan time via `getCurrentPakistanDate`, like the Lab Register).
- **Filters:** date (daily) + a from/to range for history; quick presets (Today / Yesterday / This week / This month); search by invoice number; filter by operation (Created/Edited/Cancelled/Deleted).
- **Columns:** Time · Invoice # · Operation (badge) · Changed By · Amount (old → new) · Status (old → new) · Details (expand to show `changed_fields` / full old↔new diff).
- Summary cards: # edited today, # cancelled today, total amount reduced by discounts today.
- Reuse existing patterns: the filtering/pagination/CSV/print structure from [LabReportsTracking.tsx](../src/components/lab/LabReportsTracking.tsx) and [FinanceRefunds.tsx](../src/pages/dashboard/finance/FinanceRefunds.tsx).
- Optionally a "View invoice" link and CSV export (reuse `exportUtils`).

---

## 4. Decisions to confirm

1. **Page name:** "Invoice Audit Trail" (recommended) vs "Invoice Change Log" vs "Invoice Edit Log"?
2. **Who can view it:** super_admin only, or super_admin **and** admin?
3. **Backfill:** the trigger only logs changes from when it's installed forward — historical edits before that won't appear. Acceptable, or attempt a partial backfill from `refunds` + `patient_discounts` + existing `audit_logs`?
4. **`changed_by` for RPC/offline writes:** accept "system"/null, or thread the real user through those paths (more work)?
5. **Scope of "all flow":** just `invoices`, or also pharmacy (`pharmacy_invoices`) and IPD bills? (This plan covers `invoices`; the same trigger pattern extends to those tables if wanted.)

---

## 5. Phased delivery checklist

**Phase 1 — super_admin role**
- [ ] Add `super_admin` to the role union + cast in [useAuth.tsx](../src/hooks/useAuth.tsx).
- [ ] `super_admin` wildcard in [ProtectedRoute.tsx](../src/components/ProtectedRoute.tsx).
- [ ] `signIn` maps `super_admin` → `/dashboard/admin`.
- [ ] Add `super_admin` to role dropdowns ([AccountManagementDialog](../src/components/dialogs/AccountManagementDialog.tsx), [EditUserDialog](../src/components/dialogs/EditUserDialog.tsx)).
- [ ] Audit RLS policies keyed on `'admin'`; add `super_admin` where needed (or an `is_admin()` helper).

**Phase 2 — audit table + trigger (migration)**
- [ ] `invoice_audit_log` table + indexes + RLS.
- [ ] `log_invoice_change()` trigger function + `AFTER INSERT/UPDATE/DELETE` trigger on `invoices`.
- [ ] Regenerate `src/integrations/supabase/types.ts`.

**Phase 3 — the page**
- [ ] `InvoiceAuditTrail.tsx` (default today, date/range filters, operation filter, search, old→new diff, summary cards).
- [ ] Route in [App.tsx](../src/App.tsx) + super_admin-only menu item in the admin nav.
- [ ] CSV/print (optional, reuse `exportUtils`).

**Phase 4 — verify the whole flow**
- [ ] Create an invoice → row logged as `created`.
- [ ] Apply a retroactive discount → `updated` with amount old→new.
- [ ] Cancel/void via refund → `updated` with status `paid→cancelled`.
- [ ] Confirm actor (`changed_by`) is correct for UI actions; note any null-actor RPC paths.
- [ ] Confirm a plain `admin` cannot open the page; `super_admin` can, and still has all admin features.

---

## 6. Hard rules
1. `super_admin` = **all admin features** + the audit page; plain `admin` must **not** see the audit page.
2. The audit trail must capture **created / edited / cancelled / deleted** — the trigger guarantees coverage across every billing path.
3. Default view is **today**; history is reachable via date filters.
4. Show **what changed** (old → new), not just that something changed.
