/**
 * Build appointment PDFs entirely in memory — never written to disk and never
 * uploaded to Cloudinary. The caller (chatbot / admin) decides whether to:
 *   • upload as media to WhatsApp (`metaCloud.uploadMedia`) and send by `media_id`, or
 *   • stream the buffer back over HTTP (admin "View / Print" button).
 *
 * Layout is an Apollo-style appointment letter:
 *   • Hospital logo (top-right) — from Settings.logoUrl
 *   • "Appointment Details" + "Patient Details" two-column sections
 *   • Notes + disclaimer footer
 *   • A status stamp overlay:
 *       - status 'completed'                 → Settings.stampCompletedUrl
 *       - otherwise, when paymentStatus paid → Settings.stampConfirmedUrl
 */
const PDFDocument = require('pdfkit');
const axios = require('axios');

async function fetchImage(url) {
  if (!url) return null;
  try {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 12000, maxContentLength: 4 * 1024 * 1024 });
    return Buffer.from(r.data);
  } catch (err) {
    console.warn('[pdfGen] fetchImage failed', url, err.message);
    return null;
  }
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(`${d}T00:00:00`) : new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmt12(time) {
  if (!time) return '—';
  const [h, m] = time.split(':');
  let hh = parseInt(h, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${m || '00'} ${ampm}`;
}

function titleForStatus(status) {
  switch (status) {
    case 'completed': return 'Consultation Completed';
    case 'cancelled': return 'Appointment Cancelled';
    case 'rescheduled': return 'Appointment Rescheduled';
    case 'postponed': return 'Appointment Postponed';
    default: return 'Appointment Confirmation';
  }
}

/**
 * Build an appointment PDF in the Apollo-style layout.
 * @param {object} input
 * @param {object} input.appointment
 * @param {object} input.settings    — Settings doc (logo + stamps + hospital info)
 * @param {string} [input.title]     — header title (optional; defaults by status)
 * @returns {Promise<Buffer>}
 */
async function buildAppointmentPdf({ appointment, settings, title }) {
  const logoBuf = settings?.logoUrl ? await fetchImage(settings.logoUrl) : null;

  // Choose the stamp by status / payment.
  let stampUrl = '';
  if (appointment.status === 'completed') stampUrl = settings?.stampCompletedUrl || '';
  else if (appointment.paymentStatus === 'paid') stampUrl = settings?.stampConfirmedUrl || '';
  const stampBuf = stampUrl ? await fetchImage(stampUrl) : null;

  const heading = title || titleForStatus(appointment.status);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;
      const contentWidth = pageWidth - margin * 2;
      const hospitalName = settings?.hospitalName || 'Vijya Hospital';

      // ── Header: hospital name (left) + logo (right) ──
      const headerTop = 40;
      if (logoBuf) {
        try { doc.image(logoBuf, pageWidth - margin - 110, headerTop, { fit: [110, 60], align: 'right' }); } catch {}
      }
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(20)
        .text(hospitalName, margin, headerTop + 8, { width: contentWidth - 130 });
      if (settings?.addressLine) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748b')
          .text(settings.addressLine, margin, headerTop + 34, { width: contentWidth - 130 });
      }

      doc.y = headerTop + 78;

      // ── "NOT VALID FOR VISA"-style banner (appointment code) ──
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
        .text(`Appointment Code: ${appointment.code}`, margin, doc.y, { width: contentWidth, align: 'center', underline: true });
      doc.y += 24;

      // helper to draw a section title bar
      const sectionTitle = (text) => {
        const y = doc.y;
        doc.save();
        doc.rect(margin, y, contentWidth, 26).fill('#eef2f6');
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13)
          .text(text, margin, y + 7, { width: contentWidth, align: 'center' });
        doc.restore();
        doc.y = y + 36;
      };

      // helper: two-column field grid. rows = [[label, value], ...]
      const fieldGrid = (leftRows, rightRows) => {
        const colGap = 40;
        const colW = (contentWidth - colGap) / 2;
        const leftX = margin;
        const rightX = margin + colW + colGap;
        const startY = doc.y;
        const lineH = 22;

        const drawCol = (rows, x) => {
          let yy = startY;
          for (const [label, value] of rows) {
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
              .text(`${label} : `, x, yy, { width: colW, continued: true });
            doc.font('Helvetica').fontSize(10).fillColor('#334155').text(value || '—');
            // advance by measured height (multi-line safe)
            const h = doc.heightOfString(`${label} : ${value || '—'}`, { width: colW });
            yy += Math.max(lineH, h + 6);
          }
          return yy;
        };

        const leftEnd = drawCol(leftRows, leftX);
        const rightEnd = drawCol(rightRows, rightX);
        doc.y = Math.max(leftEnd, rightEnd) + 6;
      };

      // ── Appointment Details ──
      sectionTitle('Appointment Details');
      fieldGrid(
        [
          ['Appointment ID', appointment.code],
          ['Doctor Name', appointment.doctorName],
          ['Hospital', `${hospitalName}${settings?.locationLabel ? ' — ' + settings.locationLabel : ''}`],
          ['Payment Status', appointment.paymentStatus === 'paid' ? 'Paid' : 'Not Done'],
        ],
        [
          ['Appointment Date', fmtDate(appointment.date)],
          ['Preferred Time', appointment.timeLabel || fmt12(appointment.time)],
          ['Speciality', appointment.doctorSpeciality || appointment.departmentName || '—'],
          ['Consultation Fee', `INR ${appointment.fee || 0}`],
        ]
      );

      // ── Patient Details ──
      sectionTitle('Patient Details');
      fieldGrid(
        [
          ['Patient Name', appointment.patientName],
          ['Mobile Number', `+${appointment.patientPhone}`],
          ['Reason', appointment.reason || '—'],
        ],
        [
          ['Age', appointment.patientAge ? String(appointment.patientAge) : '—'],
          ['Gender', appointment.patientGender ? appointment.patientGender[0].toUpperCase() + appointment.patientGender.slice(1) : '—'],
          ['Payment Mode', appointment.paymentMode === 'online' ? 'Online' : 'Pay at Hospital'],
        ]
      );

      // ── Status-specific note (postpone / cancel reasons) ──
      if (appointment.postponeReason && appointment.status === 'postponed') {
        doc.y += 6;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#92400e').text('Postponed: ', margin, doc.y, { continued: true });
        doc.font('Helvetica').fillColor('#78350f').text(appointment.postponeReason, { width: contentWidth });
      }
      if (appointment.status === 'cancelled' && appointment.cancellationReason) {
        doc.y += 6;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#991b1b').text('Cancellation reason: ', margin, doc.y, { continued: true });
        doc.font('Helvetica').fillColor('#7f1d1d').text(appointment.cancellationReason, { width: contentWidth });
      }

      // ── Notes ──
      doc.y += 16;
      doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(
        'At the hospital, please contact the Helpdesk for assistance to meet your doctor. You are requested to be present at least 15 minutes before your appointment to complete the necessary paperwork. Please bring your Appointment Code or a printout of this confirmation while coming for consultation.',
        margin, doc.y, { width: contentWidth, align: 'left', lineGap: 3 }
      );
      doc.moveDown(0.8);
      doc.font('Helvetica').fontSize(9.5).fillColor('#334155')
        .text(`Thank you for choosing ${hospitalName}. Wishing you good health.`, { width: contentWidth });
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text('Administrator', { width: contentWidth });

      // ── Disclaimer ──
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Disclaimer: ', margin, doc.y, { continued: true });
      doc.font('Helvetica').fillColor('#64748b').text(
        `${hospitalName} will make all efforts to honour the appointment. However, in the event of any unforeseen circumstances beyond our control, the appointment may be delayed or rescheduled. A new appointment date and/or time, according to the patient's convenience and availability of the slot with the same specialist, or a new specialist, will be proposed.`,
        { width: contentWidth, lineGap: 2 }
      );

      // ── Status stamp overlay (bottom-right) ──
      if (stampBuf) {
        try {
          const stampSize = 120;
          const sx = pageWidth - margin - stampSize;
          const sy = doc.page.height - margin - stampSize - 20;
          doc.save();
          doc.opacity(0.9);
          doc.image(stampBuf, sx, sy, { fit: [stampSize, stampSize] });
          doc.opacity(1);
          doc.restore();
        } catch {}
      }

      // ── Footer line ──
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
        .text(`Generated on ${new Date().toLocaleString('en-GB')}`, margin, doc.page.height - 36, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildAppointmentPdf };
