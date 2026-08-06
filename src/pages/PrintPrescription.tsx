import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Print-ready prescription / clinical-record sheet (SWHC letterhead).
 * Layout matches the PRESCRIPTION TEMPLATE – SPECIFICATION reference exactly.
 * This file only owns presentation — the data-fetching logic is unchanged.
 *
 * Routes:
 *   /print/prescription/:patientId   → fetch the patient's latest prescription/appointment from the DB
 *   /print/prescription/preview      → render from localStorage("prescription_preview") for the settings preview
 */

// ---------------------------------------------------------------------------
// Types (loose — data comes from Supabase / localStorage)
// ---------------------------------------------------------------------------
interface RxData {
  hospital: {
    name: string | null;
    address: string | null;
    phone: string | null;
    email?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    footerText?: string | null;
  };
  doctor: {
    fullName: string | null;
    qualifications: string | null;
    title: string | null;
    specialization?: string | null;
    licenseNumber?: string | null;
    doctorDetails: string[];
    urduDoctorName: string | null;
    urduDetails: string[];
    clinicName?: string | null;
    clinicShortName?: string | null;
    phone?: string | null;
    signatureUrl: string | null;
    stampUrl: string | null;
    headerLogo: string | null;
    consultationFee: number | null;
    prescriptionTemplate: Record<string, any>;
    isEyeSpecialist?: boolean;
  };
  patient: {
    name: string | null;
    patientNumber: string | null;
    age: string | null;
    gender: string | null;
    cnic?: string | null;
    address?: string | null;
  };
  appointment: {
    date: string | null;
    notes: string | null;
    consultationFee: number | null;
  };
  prescription: {
    text: string | null;
    createdAt: string | null;
  };
  token: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Empty (not a placeholder) when there is no date — per spec rule 6.
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function computeAge(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (years < 0 || years > 150) return null;
  return `${years} yrs`;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) return value.split("\n").filter(Boolean);
  return [];
}

// Normalise the settings-preview localStorage payload into RxData
function normalizePreview(raw: any): RxData {
  return {
    hospital: {
      name: raw?.hospital?.name ?? null,
      address: raw?.hospital?.address ?? null,
      phone: raw?.hospital?.phone ?? null,
      logoUrl: raw?.hospital?.logoUrl ?? null,
    },
    doctor: {
      fullName: raw?.doctor?.fullName ?? null,
      qualifications: raw?.doctor?.qualifications ?? null,
      title: raw?.doctor?.title ?? null,
      doctorDetails: toStringArray(raw?.doctor?.doctorDetails),
      urduDoctorName: raw?.doctor?.urduDoctorName ?? null,
      urduDetails: toStringArray(raw?.doctor?.urduDetails),
      clinicName: raw?.doctor?.clinicName ?? null,
      clinicShortName: raw?.doctor?.clinicShortName ?? null,
      phone: raw?.doctor?.phone ?? null,
      signatureUrl: raw?.doctor?.signatureUrl ?? null,
      stampUrl: raw?.doctor?.stampUrl ?? null,
      headerLogo: raw?.doctor?.headerLogo ?? null,
      consultationFee: raw?.doctor?.consultationFee ?? null,
      prescriptionTemplate: raw?.doctor?.prescriptionTemplate ?? {},
      isEyeSpecialist: raw?.doctor?.isEyeSpecialist ?? false,
    },
    patient: {
      name: raw?.patient?.name ?? null,
      patientNumber: raw?.patient?.patientNumber ?? null,
      age: raw?.patient?.age ?? null,
      gender: raw?.patient?.gender ?? null,
    },
    appointment: {
      date: raw?.appointment?.date ?? null,
      notes: raw?.appointment?.notes ?? null,
      consultationFee: raw?.appointment?.consultationFee ?? null,
    },
    prescription: {
      text: raw?.prescription?.text ?? null,
      createdAt: raw?.prescription?.createdAt ?? null,
    },
    token: raw?.token ?? null,
  };
}

// Fetch + normalise a real patient's slip data using the live schema.
async function loadFromDb(patientId: string): Promise<RxData> {
  const [{ data: profile }, { data: patient }, { data: hospital }] = await Promise.all([
    supabase.from("profiles").select("first_name,last_name,phone,email").eq("id", patientId).maybeSingle(),
    supabase
      .from("patients")
      .select("patient_number,date_of_birth,age,cnic,address,city,province")
      .eq("id", patientId)
      .maybeSingle(),
    supabase
      .from("hospital_settings")
      .select("hospital_name,contact_number,hospital_address,logo_url,email,website,footer_text")
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile && !patient) throw new Error("Patient not found");

  // Latest prescription for this patient (may be null for booking/invoice flows).
  const { data: rx } = await supabase
    .from("prescriptions")
    .select("id, prescription_text, created_at, appointment_id, doctor_id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Resolve the appointment: prefer the prescription's appointment, else the patient's latest.
  const apptSelect = "id, appointment_date, type, notes, consultation_fee_at_time, doctor_id";
  let appointment: any = null;
  if (rx?.appointment_id) {
    appointment = (await supabase.from("appointments").select(apptSelect).eq("id", rx.appointment_id).maybeSingle()).data;
  }
  if (!appointment) {
    appointment = (
      await supabase
        .from("appointments")
        .select(apptSelect)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data;
  }

  const doctorId = rx?.doctor_id ?? appointment?.doctor_id ?? null;

  // Token from the resolved appointment's queue position.
  let token: string | null = null;
  if (appointment?.id) {
    const { data: qp } = await supabase
      .from("queue_positions")
      .select("queue_position")
      .eq("appointment_id", appointment.id)
      .maybeSingle();
    if (qp?.queue_position != null) token = `TK-${String(qp.queue_position).padStart(3, "0")}`;
  }

  // Doctor letterhead.
  let doctorProfile: any = null;
  let doctorRow: any = null;
  if (doctorId) {
    const [{ data: dp }, { data: dr }] = await Promise.all([
      supabase.from("profiles").select("first_name,last_name,phone,email").eq("id", doctorId).maybeSingle(),
      supabase
        .from("doctors")
        .select(
          "specialization,license_number,consultation_fee,avatar_url,prescription_template,is_eye_specialist," +
            "clinic_name,clinic_short_name,phone,address,qualifications,title,doctor_details," +
            "urdu_doctor_name,urdu_details,signature_url,stamp_url,header_logo"
        )
        .eq("id", doctorId)
        .maybeSingle(),
    ]);
    doctorProfile = dp;
    doctorRow = dr;
  }

  const doctorFullName = doctorProfile
    ? `Dr. ${doctorProfile.first_name ?? ""} ${doctorProfile.last_name ?? ""}`.trim()
    : null;

  return {
    hospital: {
      name: hospital?.hospital_name ?? doctorRow?.clinic_name ?? null,
      address: hospital?.hospital_address ?? doctorRow?.address ?? null,
      phone: hospital?.contact_number ?? doctorRow?.phone ?? null,
      email: hospital?.email ?? null,
      website: hospital?.website ?? null,
      logoUrl: hospital?.logo_url ?? null,
      footerText: hospital?.footer_text ?? null,
    },
    doctor: {
      fullName: doctorFullName,
      qualifications: doctorRow?.qualifications ?? null,
      title: doctorRow?.title ?? doctorRow?.specialization ?? null,
      specialization: doctorRow?.specialization ?? null,
      licenseNumber: doctorRow?.license_number ?? null,
      doctorDetails: toStringArray(doctorRow?.doctor_details),
      urduDoctorName: doctorRow?.urdu_doctor_name ?? null,
      urduDetails: toStringArray(doctorRow?.urdu_details),
      clinicName: doctorRow?.clinic_name ?? null,
      clinicShortName: doctorRow?.clinic_short_name ?? null,
      phone: doctorRow?.phone ?? doctorProfile?.phone ?? null,
      signatureUrl: doctorRow?.signature_url ?? null,
      stampUrl: doctorRow?.stamp_url ?? null,
      headerLogo: doctorRow?.header_logo ?? null,
      consultationFee: doctorRow?.consultation_fee ?? null,
      prescriptionTemplate: (doctorRow?.prescription_template as Record<string, any>) ?? {},
      isEyeSpecialist: Boolean(doctorRow?.is_eye_specialist),
    },
    patient: {
      name: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || null : null,
      patientNumber: patient?.patient_number ?? null,
      age: (patient as any)?.age != null && (patient as any)?.age !== ""
        ? String((patient as any).age)
        : computeAge(patient?.date_of_birth),
      gender: null, // not stored on the live patients table
      cnic: patient?.cnic ?? null,
      address: patient?.address ?? null,
    },
    appointment: {
      date: appointment?.appointment_date ?? rx?.created_at ?? null,
      notes: appointment?.notes ?? null,
      consultationFee: appointment?.consultation_fee_at_time ?? doctorRow?.consultation_fee ?? null,
    },
    prescription: {
      text: rx?.prescription_text ?? null,
      createdAt: rx?.created_at ?? null,
    },
    token,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PrintPrescription() {
  const { patientId } = useParams<{ patientId: string }>();
  const [data, setData] = useState<RxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPrinted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        let result: RxData;
        if (patientId === "preview") {
          const raw = localStorage.getItem("prescription_preview");
          if (!raw) throw new Error("No preview data found. Open the preview from Doctor Settings.");
          result = normalizePreview(JSON.parse(raw));
        } else if (patientId) {
          result = await loadFromDb(patientId);
        } else {
          throw new Error("Missing patient id in the URL.");
        }
        if (!cancelled) setData(result);
      } catch (err: any) {
        console.error("Failed to load prescription:", err);
        if (!cancelled) setError(err?.message || "Could not load prescription data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Auto-open the print dialog only after ALL images (logo, verification,
  // signature, stamp) have finished loading in both cache and DOM.
  useEffect(() => {
    if (!data || hasPrinted.current) return;
    hasPrinted.current = true;

    const urls = [
      data.doctor.headerLogo || data.hospital.logoUrl,
      "/verification.png",
      data.doctor.signatureUrl,
      data.doctor.stampUrl,
    ].filter((u): u is string => Boolean(u));

    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.print());
      });
    };

    const waitForDomImages = () => {
      const imgs = document.querySelectorAll<HTMLImageElement>(".rx-root img");
      const pending = Array.from(imgs).filter((img) => !img.complete);
      if (pending.length === 0) { doPrint(); return; }
      let done = 0;
      pending.forEach((img) => {
        img.onload = () => { done++; if (done >= pending.length) doPrint(); };
        img.onerror = () => { done++; if (done >= pending.length) doPrint(); };
      });
      setTimeout(() => { if (!printed) doPrint(); }, 3000);
    };

    if (urls.length === 0) {
      waitForDomImages();
      return;
    }

    let remaining = urls.length;
    const onOne = () => {
      remaining -= 1;
      if (remaining <= 0) waitForDomImages();
    };
    urls.forEach((url) => {
      const img = new Image();
      img.onload = onOne;
      img.onerror = onOne;
      img.src = url;
    });

    const fallback = setTimeout(() => { if (!printed) doPrint(); }, 6000);
    return () => clearTimeout(fallback);
  }, [data]);

  // ---- derived values (mapping table) ----
  // Every prescription uses the SAME template: all sections always render;
  // a missing value simply shows blank (doctor template toggles are intentionally
  // ignored here so the layout never changes between doctors/patients).
  const hospitalName = data?.hospital.name || data?.doctor.clinicName || "";
  const logoSrc = data?.doctor.headerLogo || data?.hospital.logoUrl || null;
  const paPhone = data?.hospital.phone || data?.doctor.phone || null;
  const designation = data?.doctor.specialization || data?.doctor.title || null;
  const visitDate = formatDate(data?.appointment.date || data?.prescription.createdAt);
  const feeNumber = data?.appointment.consultationFee ?? data?.doctor.consultationFee ?? 0;
  const feeText = `Rs. ${Number(feeNumber || 0).toLocaleString("en-PK")}`;
  const notValidText = data?.hospital.footerText || "NOT VALID FOR COURT";

  // Doctor block lines (skip empties, and drop duplicates — e.g. the clinic name
  // often already appears inside doctor_details, so we don't want it twice).
  const doctorLines = (() => {
    if (!data) return [] as string[];
    const raw = [
      data.doctor.qualifications,
      designation,
      ...data.doctor.doctorDetails,
      data.doctor.clinicName || data.hospital.name,
      data.doctor.licenseNumber ? `PMDC / Reg. No: ${data.doctor.licenseNumber}` : null,
    ]
      .filter((l): l is string => Boolean(l))
      .map((l) => l.trim());
    const seen = new Set<string>();
    return raw.filter((l) => {
      const key = l.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  return (
    <div className="rx-page">
      <style>{CSS}</style>

      {loading && (
        <div className="rx-overlay">
          <div className="rx-spinner" />
          <p>Loading prescription…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rx-overlay">
          <div className="rx-errbox">
            <h3>Failed to Load</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      )}

      {data && !error && data.doctor.isEyeSpecialist && (
        <>
          <button className="rx-print-btn" onClick={() => window.print()}>
            🖨 Print Prescription
          </button>
          <EyeSheet
            data={data}
            hospitalName={hospitalName}
            logoSrc={logoSrc}
            doctorLines={doctorLines}
            visitDate={visitDate}
            paPhone={paPhone}
            notValidText={notValidText}
          />
        </>
      )}

      {data && !error && !data.doctor.isEyeSpecialist && (
        <>
          <button className="rx-print-btn" onClick={() => window.print()}>
            🖨 Print Prescription
          </button>

          <div className="rx-sheet">

            {/* ── 2. HEADER ─────────────────────────────────────────── */}
            <h1 className="rx-hospital">{hospitalName}</h1>

            <div className="rx-head">
              {/* Doctor (left) */}
              <div className="rx-doc">
                <p className="rx-doc-name">{data.doctor.fullName || ""}</p>
                <div className="rx-doc-lines">
                  {doctorLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>

              {/* Logo (center) */}
              <div className="rx-center">
                {logoSrc && <img src={logoSrc} alt="" />}
                {hospitalName && <div className="rx-hosp-small">{hospitalName}</div>}
                {paPhone && (
                  <div className="rx-pa">
                    Phone No of PA to Clinic
                    <div className="rx-pa-phone">{paPhone}</div>
                  </div>
                )}
                <div className="rx-token">Token {data.token || ""}</div>
              </div>

              {/* Urdu (right) */}
              <div className="rx-urdu">
                {data.doctor.urduDoctorName && <div className="rx-u-name">{data.doctor.urduDoctorName}</div>}
                {data.doctor.urduDetails.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>

            <hr className="rx-head-rule" />

            {/* ── 3. PATIENT DETAIL ROW (boxed) ─────────────────────── */}
            <div className="rx-ptbox">
              <div className="rx-ptrow">
                <span className="rx-field">
                  <span className="k">Pt's Name</span>
                  <span className="v rx-v-lg">{data.patient.name || ""}</span>
                </span>
                <span className="rx-field">
                  <span className="k">Age</span>
                  <span className="v">{data.patient.age || ""}</span>
                </span>
                <span className="rx-field">
                  <span className="k">Gender</span>
                  <span className="v">{data.patient.gender || ""}</span>
                </span>
                <span className="rx-field">
                  <span className="k">Date</span>
                  <span className="v">{visitDate}</span>
                </span>
                <span className="rx-field">
                  <span className="k">MRN</span>
                  <span className="v">{data.patient.patientNumber || ""}</span>
                </span>
              </div>
            </div>

            {/* ── 4. MAIN BODY — Clinical Record 30% | Rx 70% ───────── */}
            <div className="rx-body">
              <div className="rx-col rx-col-clinical">
                <p className="rx-col-title">Clinical Record</p>
                <div className="rx-col-box rx-clinical-box">
                  <div className="rx-cr-block">
                    <div className="rx-cr-label">History</div>
                    <div className="rx-cr-dots" />
                  </div>
                  <div className="rx-cr-block">
                    <div className="rx-cr-label">Diagnosis</div>
                    <div className="rx-cr-dots" />
                  </div>
                  <div className="rx-cr-inline">
                    <span className="rx-cr-label">BP</span>
                    <span className="rx-cr-dots-inline" />
                  </div>
                  <div className="rx-cr-inline">
                    <span className="rx-cr-label">Pulse</span>
                    <span className="rx-cr-dots-inline" />
                  </div>
                  <div className="rx-cr-inline">
                    <span className="rx-cr-label">Temperature</span>
                    <span className="rx-cr-dots-inline" />
                    <span className="rx-cr-unit">°C</span>
                  </div>
                  <div className="rx-cr-inline">
                    <span className="rx-cr-label">Weight</span>
                    <span className="rx-cr-dots-inline" />
                    <span className="rx-cr-unit">kg</span>
                  </div>
                </div>
              </div>
              <div className="rx-col rx-col-rx">
                <p className="rx-col-title">
                  R<span className="rx-x">x</span>
                </p>
                <div className="rx-col-box rx-rx-box">
                  <span className="rx-rx-watermark" aria-hidden="true">
                    R<span>x</span>
                  </span>
                  {data.prescription.text && <pre className="rx-rx-text">{data.prescription.text}</pre>}
                </div>
              </div>
            </div>

            {/* ── 5. FOOTER (compact) ───────────────────────────────── */}
            <hr className="rx-foot-rule" />
            <div className="rx-foot">
              <div className="rx-fee">
                <span className="rx-fee-lbl">Consultation Fee</span>
                <span className="rx-fee-amt">{feeText}</span>
              </div>
              <div className="rx-verify">
                <img
                  src="/verification.png"
                  alt="Verification"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              {(() => {
                const tmpl = data.doctor.prescriptionTemplate || {};
                const showSig = tmpl.show_signature !== false && !!data.doctor.signatureUrl;
                const showStmp = tmpl.show_stamp !== false && !!data.doctor.stampUrl;
                if (!showSig && !showStmp) return null;
                return (
                  <div className="rx-sign">
                    <div className="rx-sign-imgs">
                      {showStmp && <img src={data.doctor.stampUrl!} alt="" className="rx-stamp" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                      {showSig && <img src={data.doctor.signatureUrl!} alt="" className="rx-sig" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                    </div>
                    <div className="rx-sign-line">Doctor's Signature</div>
                    <div className="rx-notvalid">{notValidText}</div>
                  </div>
                );
              })()}
            </div>

          </div>
        </>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Eye OPD template (used when the doctor is flagged as an eye specialist)
// ---------------------------------------------------------------------------
const EYE_INVESTIGATIONS: { label: string; sub?: string; value: string }[] = [
  { label: "Dilate", value: "Rt/Lt" },
  { label: "Fundus Photo", value: "Rt/Lt" },
  { label: "Oct", sub: "Macula", value: "Rt/Lt" },
  { label: "Oct", sub: "ONH", value: "Rt/Lt" },
  { label: "Yag Laser", value: "Rt/Lt" },
  { label: "PRP Laser", value: "Rt/Lt" },
  { label: "Blood Sugar", value: "F / R" },
  { label: "BP", value: "" },
];

function EyeSheet({
  data,
  hospitalName,
  logoSrc,
  doctorLines,
  visitDate,
  paPhone,
  notValidText,
}: {
  data: RxData;
  hospitalName: string;
  logoSrc: string | null;
  doctorLines: string[];
  visitDate: string;
  paPhone: string | null;
  notValidText: string;
}) {
  return (
    <div className="rx-sheet eye-sheet">
      {/* Header band */}
      <div className="eye-head">
        <div className="eye-head-left">
          {logoSrc && <img src={logoSrc} alt="" />}
          <span className="eye-brand">SWHC</span>
        </div>
        <div className="eye-head-right">
          <div className="eye-h1">{(hospitalName || "SOUTH WEST HEALTH COMPLEX").toUpperCase()}</div>
        </div>
      </div>

      {/* Doctor name bar */}
      <div className="eye-docbar">{data.doctor.fullName || ""}</div>

      {/* Qualifications + OPD box */}
      <div className="eye-info">
        <div className="eye-quals">
          {doctorLines.map((line, i) => (
            <div key={i}>{line.toUpperCase()}</div>
          ))}
        </div>
        <div className="eye-opd">
          <div className="eye-opd-title">EYE OPD</div>
          <div className="eye-opd-box">
            {data.token ? <span>Token {data.token}</span> : <span>&nbsp;</span>}
          </div>
          {paPhone && <div className="eye-opd-cap">{paPhone}</div>}
        </div>
      </div>

      {/* Patient line */}
      <div className="eye-ptrow">
        <span className="eye-f eye-f-lg">
          <i>Name</i>
          <u>{data.patient.name || ""}</u>
        </span>
        <span className="eye-f">
          <i>Age</i>
          <u>{data.patient.age || ""}</u>
        </span>
        <span className="eye-f">
          <i>Gender</i>
          <u>{data.patient.gender || ""}</u>
        </span>
        <span className="eye-f">
          <i>Date</i>
          <u>{visitDate}</u>
        </span>
      </div>

      {/* Body: investigation grid + writing area */}
      <div className="eye-body">
        <div className="eye-invest">
          <div className="eye-invest-title">Investigation</div>
          <table className="eye-table">
            <tbody>
              {EYE_INVESTIGATIONS.map((row, i) => (
                <tr key={i}>
                  <td className="eye-td-l">
                    {row.label}
                    {row.sub && <span className="eye-sub"> {row.sub}</span>}
                  </td>
                  <td className="eye-td-r">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="eye-write">
          {data.prescription.text && <pre className="eye-rx-text">{data.prescription.text}</pre>}
        </div>
      </div>

      {/* Footer */}
      <div className="eye-foot">
        <div className="eye-foot-note">
          <div>{notValidText}</div>
          {paPhone && (
            <div className="eye-foot-phone">
              For Contact# <b>{paPhone}</b>
            </div>
          )}
        </div>
      </div>
      <div className="eye-addr">{data.hospital.address || data.doctor.address || ""}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles — matches PRESCRIPTION TEMPLATE – SPECIFICATION
//   Red #B22222 · Blue #1A237E · Text #000000 · Georgia headings / Arial body
// ---------------------------------------------------------------------------
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@500;700&display=swap');

.rx-page{ --red:#B22222; --blue:#1A237E; --ink:#000000; }
.rx-page{ position:fixed; inset:0; overflow:auto; background:#e6e6ec;
  font-family:Arial,Calibri,'Segoe UI',sans-serif; color:var(--ink); }
.rx-page *{ box-sizing:border-box; }

/* Overlays */
.rx-overlay{ position:fixed; inset:0; background:rgba(230,230,236,.92); z-index:1000;
  display:flex; align-items:center; justify-content:center; flex-direction:column; }
.rx-spinner{ width:40px; height:40px; border:4px solid var(--blue); border-top-color:transparent;
  border-radius:50%; animation:rx-spin .7s linear infinite; }
@keyframes rx-spin{ to{ transform:rotate(360deg); } }
.rx-overlay p{ margin-top:12px; font-weight:600; color:var(--blue); }
.rx-errbox{ background:#fff; padding:24px 32px; border-radius:8px; border:1px solid var(--red);
  max-width:400px; text-align:center; }
.rx-errbox h3{ color:var(--red); margin:0 0 8px; }
.rx-errbox p{ margin:0 0 12px; font-size:14px; }
.rx-errbox button{ background:var(--blue); color:#fff; border:none; padding:8px 20px;
  border-radius:4px; cursor:pointer; font-family:inherit; font-size:13px; }

.rx-print-btn{ position:fixed; bottom:24px; right:24px; z-index:500; background:var(--blue); color:#fff;
  border:none; padding:10px 22px; border-radius:6px; font-family:inherit; font-size:14px; font-weight:600;
  cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.2); }
.rx-print-btn:hover{ opacity:.9; }

/* ── Sheet: A4 portrait, 12mm margin, single page ── */
.rx-sheet{ width:210mm; height:297mm; margin:24px auto; background:#fff; padding:12mm;
  box-shadow:0 2px 14px rgba(0,0,0,.25); display:flex; flex-direction:column; overflow:hidden; }

/* 2. Header (≈24%) */
.rx-hospital{ margin:0; font-family:Georgia,'Times New Roman',serif; font-weight:bold; color:var(--red);
  font-size:30px; line-height:1.1; letter-spacing:.3px; border-bottom:4px double var(--red);
  padding-bottom:5px; }

.rx-head{ display:grid; grid-template-columns:1.55fr .95fr 1.15fr; gap:14px; margin-top:10px;
  align-items:start; }
.rx-doc-name{ margin:0 0 4px; font-family:Georgia,'Times New Roman',serif; font-weight:bold;
  font-style:italic; color:var(--blue); font-size:20px; line-height:1.15; }
.rx-doc-lines{ font-size:12px; line-height:1.5; color:var(--ink); }
.rx-doc-lines div{ margin:0; }

.rx-center{ text-align:center; }
.rx-center img{ max-width:74px; max-height:60px; object-fit:contain; margin:0 auto 3px; display:block; }
.rx-center .rx-short{ font-weight:bold; font-size:14px; color:var(--blue); letter-spacing:.5px; }
.rx-center .rx-hosp-small{ font-weight:bold; font-size:10px; color:var(--blue); line-height:1.25; margin-top:1px; }
.rx-center .rx-pa{ font-weight:bold; font-size:10px; color:var(--blue); line-height:1.3; margin-top:3px; }
.rx-center .rx-pa-phone{ font-weight:bold; color:var(--blue); font-size:11px; }
.rx-center .rx-token{ font-weight:bold; color:var(--blue); font-size:12px; margin-top:4px; }

.rx-urdu{ direction:rtl; text-align:right; font-family:'Noto Nastaliq Urdu',serif; color:var(--blue);
  font-size:13px; line-height:2.2; }
.rx-urdu > div{ margin-bottom:5px; }
.rx-urdu .rx-u-name{ color:var(--red); font-size:18px; line-height:2; margin-bottom:8px; }

.rx-head-rule{ border:none; border-top:2px solid var(--blue); margin:10px 0 0; }

/* 3. Patient box */
.rx-ptbox{ border:1.5px solid var(--blue); padding:8px 10px; margin-top:10px; }
.rx-ptrow{ display:flex; flex-wrap:wrap; align-items:baseline; gap:6px 22px; font-size:13px; }
.rx-ptrow + .rx-ptrow{ margin-top:9px; }
.rx-field{ display:flex; align-items:baseline; gap:6px; }
.rx-field .k{ font-weight:bold; white-space:nowrap; }
.rx-field .v{ min-width:90px; border-bottom:1px solid var(--ink); padding:0 4px 1px; font-weight:400;
  display:inline-block; }
.rx-field .rx-v-lg{ min-width:150px; }

/* 4. Body — Clinical Record 30% | Rx 70% (≈48%) */
.rx-body{ display:grid; grid-template-columns:1fr 2.35fr; gap:6mm; margin-top:6px; flex:1; min-height:0; }
.rx-col{ display:flex; flex-direction:column; min-height:0; }
.rx-col-title{ margin:0 0 4px; font-family:Georgia,'Times New Roman',serif; font-weight:bold;
  font-style:italic; color:var(--blue); font-size:22px; line-height:1; }
.rx-col-title .rx-x{ font-size:14px; }
.rx-col-box{ border:1.5px solid var(--blue); flex:1; min-height:0; padding:10px 12px; overflow:hidden; }

/* Clinical Record — fixed handwriting fields, evenly distributed */
.rx-clinical-box{ display:flex; flex-direction:column; justify-content:space-between; }
.rx-cr-label{ color:var(--blue); font-weight:bold; font-size:13px; }
.rx-cr-dots{ border-bottom:2px dotted #333; margin-top:16px; }
.rx-cr-inline{ display:flex; align-items:flex-end; gap:8px; }
.rx-cr-inline .rx-cr-label{ white-space:nowrap; }
.rx-cr-dots-inline{ flex:1; border-bottom:2px dotted #333; height:15px; }
.rx-cr-unit{ font-weight:bold; font-size:12px; color:var(--ink); white-space:nowrap; }

/* Rx — faded watermark upper-left + optional typed prescription */
.rx-rx-box{ position:relative; }
.rx-rx-watermark{ position:absolute; top:6px; left:14px; font-family:Georgia,'Times New Roman',serif;
  font-style:italic; font-weight:bold; color:var(--blue); font-size:78px; line-height:1; opacity:.08;
  pointer-events:none; user-select:none; }
.rx-rx-watermark span{ font-size:42px; }
.rx-rx-text{ position:relative; margin:0; padding-top:74px; font-family:Arial,Calibri,sans-serif;
  font-size:14px; line-height:1.7; white-space:pre-wrap; word-break:break-word; color:var(--ink); }

/* 5. Footer (≈18%) — pulled up close to Rx */
.rx-foot-rule{ border:none; border-top:2px solid var(--blue); margin:5mm 0 0; }
.rx-foot{ display:grid; grid-template-columns:1fr auto 1fr; align-items:end; column-gap:12px;
  padding-top:6px; }
.rx-fee{ justify-self:start; font-size:14px; }
.rx-fee-lbl{ color:var(--red); font-weight:bold; }
.rx-fee-amt{ color:var(--ink); font-weight:bold; margin-left:8px; }
.rx-verify{ justify-self:center; display:flex; align-items:flex-end; }
.rx-verify img{ height:120px; max-width:300px; object-fit:contain; object-position:bottom;
  transform:translateY(28px); }
.rx-sign{ justify-self:end; text-align:center; min-width:200px; }
.rx-sign-imgs{ position:relative; height:80px; display:flex; align-items:center; justify-content:center; }
.rx-sign-imgs img{ object-fit:contain; }
.rx-sign-imgs .rx-sig{ max-height:80px; max-width:220px; position:relative; z-index:2; }
.rx-sign-imgs .rx-stamp{ max-height:160px; max-width:200px; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); opacity:.5; z-index:1; pointer-events:none; }
.rx-sign-line{ border-top:1px solid var(--ink); padding-top:3px; margin-top:2px; font-size:12px; color:var(--ink); }
.rx-notvalid{ color:var(--blue); font-weight:bold; font-size:12px; margin-top:3px; }

.rx-addr{ text-align:center; font-size:12px; margin-top:6px; }
.rx-addr .rx-a{ color:var(--red); font-weight:bold; }
.rx-addr .rx-m{ color:var(--blue); font-weight:bold; margin-left:16px; }

/* ── Print: single A4 page, 12mm margin ── */
@media print{
  @page{ size:A4; margin:12mm; }
  .rx-page{ position:static; background:#fff; overflow:visible; }
  .rx-sheet{ width:100%; height:calc(297mm - 24mm); margin:0; padding:0; box-shadow:none; overflow:hidden; }
  .rx-print-btn, .rx-overlay{ display:none !important; }
  .rx-page *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`
/* ── Eye OPD template ── */
.eye-sheet{ padding:0; display:flex; flex-direction:column; }
.eye-head{ display:flex; align-items:stretch; background:#1A237E; min-height:26mm; }
.eye-head-left{ background:#fff; display:flex; align-items:center; gap:10px; padding:0 18px 0 14px;
  clip-path:polygon(0 0, 100% 0, 78% 100%, 0 100%); min-width:52%; }
.eye-head-left img{ max-height:52px; max-width:70px; object-fit:contain; }
.eye-brand{ font-family:Georgia,'Times New Roman',serif; font-weight:bold; font-size:34px; color:#1A237E;
  letter-spacing:1px; }
.eye-head-right{ flex:1; display:flex; align-items:center; justify-content:flex-end; padding-right:12mm; }
.eye-h1{ color:#fff; font-family:Arial,sans-serif; font-weight:bold; font-size:24px; line-height:1.15;
  text-align:right; letter-spacing:.5px; }
.eye-docbar{ background:#1A237E; color:#fff; font-family:Georgia,'Times New Roman',serif; font-weight:bold;
  font-size:22px; padding:6px 12mm; margin-top:-1px; }

.eye-info{ display:flex; gap:10mm; padding:8px 12mm 0; }
.eye-quals{ flex:1; font-size:12px; line-height:1.55; font-weight:600; }
.eye-opd{ width:36mm; text-align:center; }
.eye-opd-title{ background:#1A237E; color:#fff; font-size:11px; font-weight:bold; padding:2px 0; }
.eye-opd-box{ border:1px solid #1A237E; height:22mm; display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:bold; color:#1A237E; }
.eye-opd-cap{ font-size:9px; font-weight:bold; color:#1A237E; margin-top:2px; }

.eye-ptrow{ display:flex; gap:8px; padding:8px 12mm 0; font-size:13px; align-items:baseline; }
.eye-f{ display:flex; align-items:baseline; gap:6px; flex:1; }
.eye-f-lg{ flex:2; }
.eye-f i{ font-family:Georgia,serif; font-style:italic; }
.eye-f u{ flex:1; text-decoration:none; border-bottom:1px solid #000; min-height:16px; padding:0 4px; }

.eye-body{ display:flex; gap:6mm; padding:6px 12mm 0; flex:1; min-height:0; }
.eye-invest{ width:52mm; }
.eye-invest-title{ font-size:12px; font-weight:bold; margin-bottom:2px; }
.eye-table{ border-collapse:collapse; width:100%; }
.eye-table td{ border:1px solid #000; font-size:11px; padding:2px 4px; }
.eye-td-l{ width:62%; }
.eye-td-r{ text-align:center; font-size:10px; }
.eye-sub{ font-size:9px; }
.eye-write{ flex:1; }
.eye-rx-text{ margin:0; font-family:Arial,sans-serif; font-size:13px; line-height:1.7; white-space:pre-wrap; }

.eye-foot{ padding:0 12mm 4px; display:flex; justify-content:flex-end; }
.eye-foot-note{ text-align:right; font-size:12px; }
.eye-foot-phone{ font-size:15px; font-weight:bold; }
.eye-addr{ background:#1A237E; color:#fff; text-align:center; font-weight:bold; font-size:13px;
  padding:6px 12mm; line-height:1.35; }

`;
