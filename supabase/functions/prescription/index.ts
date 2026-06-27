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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Missing Authorization header" }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userRes, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId");
  if (!patientId) return json({ error: "Missing patientId query param" }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  const [{ data: profile }, { data: patient }, { data: hospital }] = await Promise.all([
    db.from("profiles").select("first_name,last_name,email,phone").eq("id", patientId).maybeSingle(),
    db.from("patients").select("patient_number,date_of_birth,gender,address,cnic,city,province").eq("id", patientId).maybeSingle(),
    db.from("hospital_settings").select("hospital_name,contact_number,hospital_address,logo_url").limit(1).maybeSingle(),
  ]);

  if (!profile && !patient) return json({ error: "Patient not found" }, 404);

  const { data: rx } = await db
    .from("prescriptions")
    .select("id, prescription_text, created_at, appointment_id, doctor_id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let appointmentData: any = null;
  let doctorProfile: any = null;
  let doctorRow: any = null;

  if (rx?.appointment_id) {
    const { data } = await db
      .from("appointments")
      .select("id, appointment_date, type, notes, consultation_fee_at_time, booking_type")
      .eq("id", rx.appointment_id)
      .maybeSingle();
    appointmentData = data;
  }

  if (rx?.doctor_id) {
    const [{ data: dp }, { data: dr }] = await Promise.all([
      db.from("profiles").select("first_name,last_name,phone,email").eq("id", rx.doctor_id).maybeSingle(),
      db.from("doctors").select(
        "specialization,license_number,consultation_fee,avatar_url,prescription_template"
      ).eq("id", rx.doctor_id).maybeSingle(),
    ]);
    doctorProfile = dp;
    doctorRow = dr;
  }

  const age = (() => {
    if (!patient?.date_of_birth) return null;
    const dob = new Date(patient.date_of_birth);
    const diff = Date.now() - dob.getTime();
    return String(Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
  })();

  const doctorFullName = doctorProfile
    ? `Dr. ${doctorProfile.first_name ?? ""} ${doctorProfile.last_name ?? ""}`.trim()
    : null;

  const tpl = (doctorRow?.prescription_template ?? {}) as Record<string, any>;

  const result = {
    hospital: {
      name: hospital?.hospital_name ?? null,
      address: hospital?.hospital_address ?? null,
      phone: hospital?.contact_number ?? null,
      email: null,
      website: null,
      logoUrl: hospital?.logo_url ?? null,
      footerText: null,
    },
    doctor: {
      id: rx?.doctor_id ?? null,
      fullName: doctorFullName,
      firstName: doctorProfile?.first_name ?? null,
      lastName: doctorProfile?.last_name ?? null,
      specialization: doctorRow?.specialization ?? null,
      licenseNumber: doctorRow?.license_number ?? null,
      phone: doctorProfile?.phone ?? null,
      email: doctorProfile?.email ?? null,
      avatarUrl: doctorRow?.avatar_url ?? null,
      clinicName: tpl.clinic_name ?? null,
      clinicShortName: tpl.clinic_short_name ?? null,
      address: tpl.address ?? null,
      qualifications: tpl.degrees ?? tpl.qualifications ?? null,
      title: tpl.title_prefix ?? tpl.title ?? null,
      doctorDetails: tpl.credentials ?? tpl.doctor_details ?? null,
      urduDoctorName: tpl.urdu_name ?? tpl.urdu_doctor_name ?? null,
      urduDetails: tpl.urdu_lines ?? tpl.urdu_details ?? null,
      signatureUrl: tpl.signature_url ?? null,
      stampUrl: tpl.stamp_url ?? null,
      headerLogo: tpl.header_logo ?? null,
      consultationFee: doctorRow?.consultation_fee ?? null,
      prescriptionTemplate: doctorRow?.prescription_template ?? null,
    },
    patient: {
      id: patientId,
      name: profile
        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || null
        : null,
      patientNumber: patient?.patient_number ?? null,
      dateOfBirth: patient?.date_of_birth ?? null,
      age,
      gender: patient?.gender ?? null,
      cnic: patient?.cnic ?? null,
      phone: profile?.phone ?? null,
      email: profile?.email ?? null,
      address: patient?.address ?? null,
      city: patient?.city ?? null,
      province: patient?.province ?? null,
    },
    appointment: {
      id: appointmentData?.id ?? null,
      date: appointmentData?.appointment_date ?? rx?.created_at ?? null,
      type: appointmentData?.type ?? null,
      bookingType: appointmentData?.booking_type ?? null,
      notes: appointmentData?.notes ?? null,
      consultationFee: appointmentData?.consultation_fee_at_time ?? null,
    },
    prescription: {
      id: rx?.id ?? null,
      text: rx?.prescription_text ?? null,
      createdAt: rx?.created_at ?? null,
      appointmentId: rx?.appointment_id ?? null,
      doctorId: rx?.doctor_id ?? null,
    },
  };

  return json(result, 200);
});
