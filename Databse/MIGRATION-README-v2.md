# South West HIMS — full migration pack (schema + data)

**Snapshot taken: 8 September 2026, 05:08 UTC (10:08 Pakistan time).**
Anything entered in the system after that time will not be in this snapshot — re-export before the final cut-over.

---

## 1. What is in this pack

| File | What it is |
|---|---|
| `southwest-schema-v2.sql` | **Use this one.** Complete structure as of 8 Sep 2026: 1 enum, 76 tables, all constraints, 169 indexes, 38 functions, 55 triggers, grants, RLS on all tables, 215 policies, 6 storage buckets, the `on_auth_user_created` auth trigger, plus the September update block (eye-specialist flag, speed indexes, live patient-name sync). |
| `southwest-schema.sql` | Old 29 July version. Kept only for reference — do not run it. |
| `southwest-auth-users.sql` | User accounts **as of 29 July 2026** (1,599 accounts with their original password hashes). Accounts created after that date are not in it — see step 3. |
| `MIGRATION-README-v2.md` | This guide. |

Table data itself is **not** in this pack — it is exported from the product UI (step 4), which always gives you the live rows at the moment you press the button.

---

## 2. Create the new project

Create the Supabase project. Same region as the current one (`ap-northeast-1`) if latency matters.

---

## 3. Run the structure

1. SQL Editor → paste `southwest-schema-v2.sql` → run top to bottom.
2. Then run `southwest-auth-users.sql` (must run **before** table data — many tables point at `auth.users`).
   - It is wrapped in `BEGIN;`/`COMMIT;`. If the editor times out, split it into chunks of ~500 inserts.
   - **Important:** this file is from 29 July. Accounts registered since then (roughly 1,800 more patients) come across with the rest of the data export in step 4 — export the auth users again from Cloud → Advanced settings → Export data at cut-over time, and load that file here instead, so nobody loses their login.
   - Password hashes are bcrypt and portable: no one has to reset a password.

---

## 4. Export the data

In Lovable: **Cloud → Advanced settings → Export data.** You get one CSV per table with the live contents.
Note the date and time you press the button — that is your true cut-over point.

Row counts at the 8 Sep 2026 05:08 UTC snapshot (**90,067 rows total**):

| Table | Rows |
|---|---|
| lab_pathology_report_results | 42871 |
| lab_pathology_order_items | 7842 |
| lab_pathology_report_test_types | 7555 |
| invoice_audit_log | 4691 |
| invoices | 4546 |
| audit_logs | 4173 |
| lab_pathology_orders | 3485 |
| profiles | 3422 |
| patients | 3397 |
| lab_pathology_reports | 3328 |
| medicines | 817 |
| lab_tests | 590 |
| appointments | 583 |
| queue_positions | 583 |
| hospital_services | 562 |
| pharmacy_invoice_items | 268 |
| refunds | 199 |
| xray_reports | 181 |
| lab_test_parameters | 143 |
| patient_discounts | 129 |
| lab_test_types | 94 |
| xray_tests | 79 |
| pharmacy_invoices | 76 |
| lab_parameter_subranges | 74 |
| staff_shift_closings | 73 |
| daily_closings | 71 |
| hospital_closing_balance | 54 |
| lab_stock_consumption | 41 |
| ot_expenses | 29 |
| doctors | 11 |
| emergency_expenses | 11 |
| client_error_logs | 10 |
| ipd_charges | 9 |
| ot_operations | 8 |
| departments | 6 |
| ipd_treatment_chart | 5 |
| lab_reports | 4 |
| lab_stock_batches | 4 |
| ot_schedules | 3 |
| payroll | 3 |
| hospital_settings | 3 |
| wards | 3 |
| ipd_admissions | 3 |
| lab_inventory_items | 3 |
| lab_test_consumables | 3 |
| ipd_invoices | 3 |
| shifts | 3 |
| inventory_requests | 2 |
| inventory_items | 2 |
| overtime_records | 2 |
| lab_store_batches | 1 |
| prescriptions | 1 |
| finance_settings | 1 |
| anesthesia_notes | 1 |
| beds | 1 |
| ipd_medicine_orders | 1 |
| payroll_templates | 1 |
| ot_rooms | 1 |
| doctor_daily_status | 1 |
| doctor_availability | 1 |

All other tables were empty at snapshot time.

---

## 5. Load the data

In the new project's SQL Editor, turn triggers and FK checks off for the load so audit-log, queue and bed triggers do not fire and renumber things:

```sql
SET session_replication_role = replica;
-- import every CSV here (any order — FK checks are off)
SET session_replication_role = origin;
```

Then re-sync the sequences and refresh planner stats:

```sql
ANALYZE;
```

### Verify
Run this in both projects and compare — the numbers must match:

```sql
SELECT c.relname,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', c.relname), false, true, '')))[1]::text::bigint AS rows
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY 2 DESC;
```

---

## 6. Storage files

The 6 buckets (doctor avatars, patient documents, lab results, finance proofs, hospital logos, doctor assets) are created by the schema file, but the **files inside them are not**. Copy those bucket by bucket with the Supabase CLI or the Storage API.

---

## 7. Point the app at the new project

In your own copy of the code set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Re-deploy the edge functions (`prescription`, `update-user-password`) and re-add their secrets in the new project.

---

## 8. Cut-over checklist

1. Tell staff to stop entering data.
2. Export data (step 4) — write down the exact date and time.
3. Load structure → auth users → data.
4. Compare row counts.
5. Log in as one user of each role and check: an invoice, a lab report, a daily closing, a prescription print.
6. Switch the app over.

This project keeps running on Lovable Cloud throughout — nothing here disconnects or deletes anything.
