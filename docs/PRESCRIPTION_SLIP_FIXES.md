# Prescription Slip — Concrete Fixes

**Date:** 24-Jun-2026
**Scope:** 4 bugs found during integration testing + minor cleanups from the Round 2 implementation.

---

## Fix 1 (HIGH) — UserAccountDialog `.update()` hits empty doctors row

### Root cause

The `create_user_account` RPC and its `handle_new_user` trigger **only** create a `profiles` row. The `createUserAccount` hook in `useAuth.tsx:283` tries a separate `doctors.insert()`, but if that **silently fails** (e.g. duplicate key, permissions, or a trigger race), the dialog's subsequent `.update()` finds zero rows and the doctor's specialisation/fee/license are **never saved**. No error surfaces to the user.

### Fix — use `.upsert()` instead of `.update()`

Replace this in `src/components/UserAccountDialog.tsx` (around line 55–60):

```ts
// BEFORE — silently misses when insert already failed:
if (formData.role === 'doctor' && userId) {
  const doctorUpdate: Record<string, any> = {};
  if (formData.specialization) doctorUpdate.specialization = formData.specialization;
  if (formData.license_number) doctorUpdate.license_number = formData.license_number;
  if (formData.consultation_fee > 0) doctorUpdate.consultation_fee = formData.consultation_fee;
  const template: Record<string, any> = {};
  if (formData.degrees) template.degrees = formData.degrees;
  if (formData.pa_phone) template.pa_phone = formData.pa_phone;
  if (Object.keys(template).length > 0) doctorUpdate.prescription_template = template;

  if (Object.keys(doctorUpdate).length > 0) {
    const { error: docError } = await supabase
      .from('doctors')
      .update(doctorUpdate)
      .eq('id', userId);

    if (docError) {
      console.error('Error updating doctor record:', docError);
    }
  }
}
```

```ts
// AFTER — upsert guarantees the row exists, surfaces errors:
if (formData.role === 'doctor' && userId) {
  const doctorUpsert: Record<string, any> = { id: userId };
  if (formData.specialization) doctorUpsert.specialization = formData.specialization;
  if (formData.license_number) doctorUpsert.license_number = formData.license_number;
  if (formData.consultation_fee > 0) doctorUpsert.consultation_fee = formData.consultation_fee;

  const template: Record<string, any> = {};
  if (formData.degrees) template.degrees = formData.degrees;
  if (formData.pa_phone) template.pa_phone = formData.pa_phone;
  if (Object.keys(template).length > 0) doctorUpsert.prescription_template = template;

  const { error: docError } = await supabase
    .from('doctors')
    .upsert(doctorUpsert, { onConflict: 'id' });

  if (docError) {
    toast({
      title: 'Doctor record failed',
      description: docError.message,
      variant: 'destructive',
    });
  }
}
```

---

## Fix 2 (HIGH) — Urdu text renders as disconnected characters

### Root cause

jsPDF's built-in fonts (Helvetica, Times, Courier) have **no Arabic/Urdu glyphs**. Even if you embed `NotoNastaliqUrdu.ttf` via `addFileToVFS` + `addFont`, **jsPDF does no Arabic shaping or bidirectional reordering** — each letter renders in its isolated form, disconnected and unreadable.

### Option A (recommended) — canvas-rendered Urdu block

Render the Urdu string on a hidden `<canvas>` (the browser's TextEncoder + Canvas2D shapes Urdu correctly), extract a data URL, and stamp it onto the PDF via `addImage`.

Add this helper to `src/utils/prescriptionSlipGenerator.ts`:

```ts
// --- Urdu rendering helper (canvas-based, handles Arabic shaping + RTL) ---
const URDU_FONT = 'Noto Nastaliq Urdu';
const urduCanvas = document.createElement('canvas');
urduCanvas.width = 400;
urduCanvas.height = 200;
const urduCtx = urduCanvas.getContext('2d')!;

function loadUrduFont(): Promise<void> {
  return new Promise((resolve) => {
    if (document.fonts?.check(`12px "${URDU_FONT}"`)) return resolve();
    // Trigger font load — assume the font is bundled in src/assets/fonts/
    // and loaded via CSS @font-face in index.html or a CSS file.
    urduCtx.font = `12px "${URDU_FONT}"`;
    document.fonts.ready.then(() => resolve());
  });
}

async function renderUrduText(
  lines: string[],
  fontSize: number,
  color: [number, number, number],
  maxWidthPx: number
): Promise<string | null> {
  try {
    await loadUrduFont();
    urduCtx.clearRect(0, 0, urduCanvas.width, urduCanvas.height);
    urduCtx.direction = 'rtl';
    urduCtx.textAlign = 'right';
    urduCtx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;

    let y = fontSize + 4;
    for (const line of lines) {
      urduCtx.font = `bold ${fontSize}px "${URDU_FONT}"`;
      urduCtx.fillText(line, maxWidthPx, y);
      y += fontSize * 1.6;
      if (y > urduCanvas.height - 10) break;
    }
    return urduCanvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
```

Then in `drawHeader`, replace the direct `doc.text(urduName, ...)` and `doc.text(urduLine, ...)` calls with:

```ts
if (urduName || urduLines.length > 0) {
  const urduLines_total = [urduName, ...urduLines].filter(Boolean);
  const urduImage = await renderUrduText(
    urduLines_total as string[],
    10,
    [255, 255, 255],
    180  // max width in px ≈ 50mm at 96dpi
  );
  if (urduImage) {
    try { doc.addImage(urduImage, 'PNG', rightX - 50, 4, 50, urduLines_total.length * 7); } catch {}
  }
}
```

### Option B (interim) — hide Urdu inputs

If bundling Noto Nastaliq Urdu is deferred, prevent confusion by hiding the Urdu fields in `DoctorProfileSettings.tsx`:

```tsx
{/* Wrap the Urdu fields in a condition that checks a feature flag */}
{false && (
  <>
    {/* urdu_name, urdu_lines inputs */}
  </>
)}
```

---

## Fix 3 (MEDIUM) — fee-box collides with signature line

### Root cause

The fee box is drawn at `ph - 32` and the signature line at `ph - 16`. When prescription text is long, `y` pushes past `ph - 34` (the `break` guard at line 240), leaving only ~14 mm of space. The fee box and signature overlap.

### Fix — centre the signature, raise the fee box

Replace the signature block in `src/utils/prescriptionSlipGenerator.ts`:

```ts
// BEFORE (approx line 259-265):
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...DARK_GRAY);
doc.text(`Doctor's Signature / Stamp`, mx, ph - 18);
doc.setDrawColor(180, 180, 180);
doc.setLineWidth(0.4);
doc.line(mx, ph - 16, mx + 60, ph - 16);
```

```ts
// AFTER — centred signature, fee box raised to ph-38:
const sigY = ph - 18;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...DARK_GRAY);
doc.text(`Doctor's Signature / Stamp`, pw / 2, sigY, { align: 'center' });
doc.setDrawColor(180, 180, 180);
doc.setLineWidth(0.4);
doc.line(pw / 2 - 30, sigY + 2, pw / 2 + 30, sigY + 2);

// Also update the fee-box y from ph-32 to ph-38 in the fee section:
// const feeY = ph - 38;  // instead of ph - 32
```

And in the fee block:

```ts
// BEFORE:
const feeY = ph - 32;
// AFTER:
const feeY = ph - 38;
```

---

## Fix 4 (LOW) — token strip not gated on showToken

### Root cause

The token strip banner (`TOKEN NO: …` at the top of the page) is always drawn when `tokenNumber` is truthy, **ignoring** `tpl.show_token`. Meanwhile the boxed token row below the patient info block respects `tpl.show_token`. The display is inconsistent.

### Fix — gate both on the same flag

In `src/utils/prescriptionSlipGenerator.ts`, wrap the strip banner:

```ts
// BEFORE — strip always draws when tokenNumber exists (line ~135-138):
const headerLabel = data.tokenNumber
  ? `TOKEN NO: ${data.tokenNumber}  ·  ${data.bookingType === 'online' ? 'ONLINE BOOKING' : 'WALK-IN'}`
  : 'PRESCRIPTION SLIP';

// AFTER — gate on show_token:
const showTokenStrip = data.tokenNumber && tpl.show_token !== false;
const headerLabel = showTokenStrip
  ? `TOKEN NO: ${data.tokenNumber}  ·  ${data.bookingType === 'online' ? 'ONLINE BOOKING' : 'WALK-IN'}`
  : 'PRESCRIPTION SLIP';
```

Then at the boxed token row (around line 192), the gate is already `tpl.show_token !== false` — consistent.

---

## Fix 5 (minor cleanups)

### 5a. Deduplicate `headerH`

The `headerH` value is computed twice: once inside `drawHeader()` as a local `const` and once outside as `const headerH = …`. Pull it into a single `let headerH` at the top of the function body, assign it before `drawHeader()`, and let `drawHeader` read it as a closure. Or simply keep the outer computation and remove the inner one, since the inner one is only used for the `if` branch selection — the outer one already produces the identical value.

**Fix:** Remove the `const headerH` line inside `drawHeader()`. The closure already reads `headerH` from the outer scope.

### 5b. Bound Urdu lines width

`doc.splitTextToSize` is not called on Urdu lines before they are passed to `doc.text()`, so a very long Urdu credential could overflow the page right margin.

**Fix:** In the canvas-rendered version this is handled by `maxWidthPx`. For the direct `doc.text` fallback, add:

```ts
for (const ul of urduLines) {
  const wrapped = doc.splitTextToSize(ul, cw * 0.35);
  for (const wl of wrapped) { doc.text(wl, rightX, ulY, { align: 'right' }); ulY += 4; }
}
```

---

## Verification checklist

- [ ] Create a doctor via UserAccountDialog → specialisation/fee/license persist in DB.
- [ ] Edit the doctor's Prescription Slip Template in DoctorProfileSettings → save → reopen → all fields restored.
- [ ] Book a counter appointment → slip shows daily token (`TK-001`) in both the strip and the boxed row.
- [ ] Book a second appointment same doctor same day → token increments (`TK-002`).
- [ ] Set `show_token = false` → token strip falls back to "PRESCRIPTION SLIP", boxed row hidden.
- [ ] Set `show_fee = false` → fee box hidden.
- [ ] Set `show_qr = false` → QR hidden.
- [ ] Urdu text renders as connected Nastaliq glyphs (not isolated letters).
- [ ] Fee box and signature do not overlap even with a long prescription.
- [ ] `npx tsc --noEmit` passes.
