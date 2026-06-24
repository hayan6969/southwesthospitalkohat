// Edge Function: prescription
// GET /functions/v1/prescription?patientId=<uuid>
// Returns the latest prescription for a patient, mapped to a clinic-card shape.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, cache-control",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fmtPKR = (n: number | null | undefined) =>
  n == null
    ? "—"
    : "Rs. " + Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2 });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  // ── Auth: validate caller JWT ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Missing Authorization header" }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userRes, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

  // ── Query param ────────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId");
  if (!patientId) return json({ error: "Missing patientId query param" }, 400);

  // ── Data access via service role (this function enforces auth above) ──────
  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  const [{ data: profile }, { data: patient }, { data: hospital }] = await Promise.all([
    db.from("profiles").select("first_name,last_name,email,phone").eq("id", patientId).maybeSingle(),
    db.from("patients").select("patient_number,date_of_birth,address,cnic,city,province").eq("id", patientId).maybeSingle(),
    db.from("hospital_settings").select("hospital_name,contact_number,hospital_address,logo_url").limit(1).maybeSingle(),
  ]);

  if (!profile && !patient) return json({ error: "Patient not found" }, 404);

  // Latest prescription for this patient
  const { data: rx } = await db
    .from("prescriptions")
    .select("id, prescription_text, created_at, appointment_id, doctor_id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let appointment: any = null;
  let doctorProfile: any = null;
  let doctorRow: any = null;

  if (rx?.appointment_id) {
    const { data } = await db
      .from("appointments")
      .select("id, appointment_date, type, notes, consultation_fee_at_time")
      .eq("id", rx.appointment_id)
      .maybeSingle();
    appointment = data;
  }

  if (rx?.doctor_id) {
    const [{ data: dp }, { data: dr }] = await Promise.all([
      db.from("profiles").select("first_name,last_name,phone,email").eq("id", rx.doctor_id).maybeSingle(),
      db.from("doctors").select("specialization,license_number,consultation_fee,avatar_url").eq("id", rx.doctor_id).maybeSingle(),
    ]);
    doctorProfile = dp;
    doctorRow = dr;
  }

  const age = (() => {
    if (!patient?.date_of_birth) return "—";
    const dob = new Date(patient.date_of_birth);
    const diff = Date.now() - dob.getTime();
    return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
  })();

  const result = {
    // Clinic / hospital
    clinicName: hospital?.hospital_name ?? "—",
    phone: hospital?.contact_number ?? "—",
    address: hospital?.hospital_address ?? "—",
    logoUrl: hospital?.logo_url ?? null,

    // Doctor
    doctorName: doctorProfile
      ? `Dr. ${doctorProfile.first_name ?? ""} ${doctorProfile.last_name ?? ""}`.trim()
      : "—",
    doctorSpecialization: doctorRow?.specialization ?? "—",
    doctorLicenseNumber: doctorRow?.license_number ?? "—",
    doctorPhone: doctorProfile?.phone ?? "—",
    doctorAvatarUrl: doctorRow?.avatar_url ?? null,
    consultationFee: fmtPKR(
      appointment?.consultation_fee_at_time ?? doctorRow?.consultation_fee ?? null,
    ),

    // Patient
    patientName: profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—"
      : "—",
    patientNumber: patient?.patient_number ?? "—",
    age,
    cnic: patient?.cnic ?? "—",
    phoneNumber: profile?.phone ?? "—",
    address: patient?.address ?? "—",
    city: patient?.city ?? "—",
    province: patient?.province ?? "—",

    // Visit / prescription
    appointmentId: appointment?.id ?? null,
    visitDate: appointment?.appointment_date ?? rx?.created_at ?? null,
    appointmentType: appointment?.type ?? "—",
    visitNotes: appointment?.notes ?? "",
    prescriptionId: rx?.id ?? null,
    prescriptionText: rx?.prescription_text ?? "",
    prescriptionCreatedAt: rx?.created_at ?? null,
  };

  return json(result, 200);
});
