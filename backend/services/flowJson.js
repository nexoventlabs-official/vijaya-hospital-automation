/**
 * Multi-screen WhatsApp Flow JSON for Vijya Hospital.
 *
 * Screen flow:
 *
 *   SERVICE_SELECT  →  BOOK_DEPT, MY_APPTS, RESCHEDULE_PICK, CANCEL_PICK, INFO
 *   BOOK_DEPT       →  BOOK_DOCTOR
 *   BOOK_DOCTOR     →  BOOK_FORM
 *   BOOK_FORM       →  BOOK_PAYMENT
 *   BOOK_PAYMENT    →  COMPLETE   (terminal — webhook sends PDF + directions CTA)
 *
 *   MY_APPTS        →  APPT_DETAILS
 *   APPT_DETAILS    →  COMPLETE   (close)
 *
 *   RESCHEDULE_PICK →  RESCHEDULE_SLOTS
 *   RESCHEDULE_SLOTS→  COMPLETE   (terminal — webhook performs the reschedule)
 *
 *   CANCEL_PICK     →  COMPLETE   (terminal — webhook cancels)
 *
 * All non-terminal transitions use `data_exchange` so the backend supplies
 * the next screen's data. Terminal screens fire `complete` and the webhook
 * dispatches the appropriate WhatsApp follow-up.
 */
function buildFlowJSON() {
  return {
    version: '7.0',
    data_api_version: '3.0',
    routing_model: {
      SERVICE_SELECT: ['BOOK_DEPT', 'MY_APPTS', 'RESCHEDULE_PICK', 'CANCEL_PICK', 'INFO'],
      BOOK_DEPT: ['BOOK_DOCTOR', 'INFO'],
      BOOK_DOCTOR: ['BOOK_FORM', 'INFO'],
      BOOK_FORM: ['BOOK_PAYMENT', 'INFO'],
      BOOK_PAYMENT: [],
      MY_APPTS: ['APPT_DETAILS'],
      APPT_DETAILS: [],
      RESCHEDULE_PICK: ['RESCHEDULE_SLOTS', 'INFO'],
      RESCHEDULE_SLOTS: [],
      CANCEL_PICK: [],
      INFO: [],
    },
    screens: [
      // ─── SERVICE_SELECT ─────────────────────────────────────────────────
      {
        id: 'SERVICE_SELECT',
        title: 'Choose Service',
        data: {
          welcome_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_welcome_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'How can we help?' },
          subheading: { type: 'string', __example__: 'Tap a service.' },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'book', title: 'Book Appointment', description: 'New visit' },
              { id: 'my', title: 'My Appointments', description: 'View bookings' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.welcome_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Vijya Hospital',
              visible: '${data.has_welcome_banner}',
            },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_service',
              label: 'Services',
              required: true,
              'data-source': '${data.services}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: { screen_action: 'service_pick', selected_service: '${form.selected_service}' },
              },
            },
          ],
        },
      },

      // ─── BOOK: pick department ─────────────────────────────────────────
      {
        id: 'BOOK_DEPT',
        title: 'Department',
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Pick a department' },
          subheading: { type: 'string', __example__: '' },
          departments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [{ id: 'd1', title: 'Neurology', description: 'Brain & nerves' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'Departments', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_department',
              label: 'Departments',
              required: true,
              'data-source': '${data.departments}',
            },
            {
              type: 'Footer',
              label: 'Next',
              'on-click-action': {
                name: 'data_exchange',
                payload: { screen_action: 'dept_pick', selected_department: '${form.selected_department}' },
              },
            },
          ],
        },
      },

      // ─── BOOK: pick doctor ─────────────────────────────────────────────
      {
        id: 'BOOK_DOCTOR',
        title: 'Doctor',
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Pick a doctor' },
          subheading: { type: 'string', __example__: '' },
          department_id: { type: 'string', __example__: '' },
          doctors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [{ id: 'doc1', title: 'Dr. Reddy', description: 'Neurologist • ₹500' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'Doctors', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_doctor',
              label: 'Doctors',
              required: true,
              'data-source': '${data.doctors}',
            },
            {
              type: 'Footer',
              label: 'Next',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  screen_action: 'doctor_pick',
                  department_id: '${data.department_id}',
                  selected_doctor: '${form.selected_doctor}',
                },
              },
            },
          ],
        },
      },

      // ─── BOOK: appointment form (with slot dropdown) ───────────────────
      {
        id: 'BOOK_FORM',
        title: 'Appointment',
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Appointment details' },
          subheading: { type: 'string', __example__: '' },
          init_phone: { type: 'string', __example__: '919999999999' },
          init_name: { type: 'string', __example__: '' },
          doctor_id: { type: 'string', __example__: '' },
          department_id: { type: 'string', __example__: '' },
          slot_options: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
            __example__: [{ id: '2026-06-01|10:00', title: '01 Jun 2026 — 10:00 AM' }],
          },
          gender_options: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
            __example__: [
              { id: 'male', title: 'Male' },
              { id: 'female', title: 'Female' },
              { id: 'other', title: 'Other' },
            ],
          },
          name_label: { type: 'string', __example__: 'Patient Name' },
          phone_label: { type: 'string', __example__: 'WhatsApp Number' },
          age_label: { type: 'string', __example__: 'Age' },
          gender_label: { type: 'string', __example__: 'Gender' },
          reason_label: { type: 'string', __example__: 'Reason for visit' },
          slot_label: { type: 'string', __example__: 'Available slot' },
          continue_label: { type: 'string', __example__: 'Continue' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'Appointment', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'TextInput',
              name: 'patient_name',
              label: '${data.name_label}',
              required: true,
              'input-type': 'text',
              'init-value': '${data.init_name}',
            },
            {
              type: 'TextInput',
              name: 'patient_phone',
              label: '${data.phone_label}',
              required: true,
              'input-type': 'phone',
              enabled: false,
              'init-value': '${data.init_phone}',
            },
            {
              type: 'TextInput',
              name: 'patient_age',
              label: '${data.age_label}',
              required: true,
              'input-type': 'number',
            },
            {
              type: 'Dropdown',
              name: 'patient_gender',
              label: '${data.gender_label}',
              required: true,
              'data-source': '${data.gender_options}',
            },
            {
              type: 'TextArea',
              name: 'reason',
              label: '${data.reason_label}',
              required: false,
              'helper-text': 'Briefly describe your symptoms.',
            },
            {
              type: 'Dropdown',
              name: 'slot',
              label: '${data.slot_label}',
              required: true,
              'data-source': '${data.slot_options}',
            },
            {
              type: 'Footer',
              label: '${data.continue_label}',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  screen_action: 'form_submit',
                  doctor_id: '${data.doctor_id}',
                  department_id: '${data.department_id}',
                  patient_name: '${form.patient_name}',
                  patient_phone: '${data.init_phone}',
                  patient_age: '${form.patient_age}',
                  patient_gender: '${form.patient_gender}',
                  reason: '${form.reason}',
                  slot: '${form.slot}',
                },
              },
            },
          ],
        },
      },

      // ─── BOOK: payment method (terminal) ───────────────────────────────
      {
        id: 'BOOK_PAYMENT',
        title: 'Payment',
        terminal: true,
        success: true,
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Choose payment method' },
          subheading: { type: 'string', __example__: 'Consultation fee: ₹500' },
          payment_methods: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'pay_at_hospital', title: 'Pay at hospital', description: 'Pay at reception' },
              { id: 'online', title: 'Pay online', description: 'UPI / cards' },
            ],
          },
          /** Hidden — passed through `complete` payload so webhook can finish booking */
          booking_token: { type: 'string', __example__: '' },
          confirm_label: { type: 'string', __example__: 'Confirm Booking' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'Payment', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'RadioButtonsGroup',
              name: 'payment_mode',
              label: 'Payment',
              required: true,
              'data-source': '${data.payment_methods}',
            },
            {
              type: 'Footer',
              label: '${data.confirm_label}',
              'on-click-action': {
                name: 'complete',
                payload: {
                  kind: 'book_confirm',
                  booking_token: '${data.booking_token}',
                  payment_mode: '${form.payment_mode}',
                },
              },
            },
          ],
        },
      },

      // ─── MY_APPTS: list ────────────────────────────────────────────────
      {
        id: 'MY_APPTS',
        title: 'My Appointments',
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Your appointments' },
          subheading: { type: 'string', __example__: '' },
          appointments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
              },
            },
            __example__: [{ id: 'a1', title: '01 Jun 2026 — 10:00 AM', description: 'Dr. Reddy • Booked' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'My Appointments', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_appt',
              label: 'Tap an appointment',
              required: true,
              'data-source': '${data.appointments}',
            },
            {
              type: 'Footer',
              label: 'View Details',
              'on-click-action': {
                name: 'data_exchange',
                payload: { screen_action: 'appt_view', selected_appt: '${form.selected_appt}' },
              },
            },
          ],
        },
      },

      // ─── APPT_DETAILS (table-like body) ────────────────────────────────
      {
        id: 'APPT_DETAILS',
        title: 'Appointment',
        terminal: true,
        success: true,
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Appointment VH-XXXXXX' },
          status_line: { type: 'string', __example__: 'Status: Booked' },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } },
            },
            __example__: [
              { id: 'r1', title: 'Doctor', description: 'Dr. Reddy' },
              { id: 'r2', title: 'Date', description: '01 Jun 2026' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'Appointment', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextSubheading', text: '${data.status_line}' },
            {
              type: 'RadioButtonsGroup',
              name: '_unused',
              label: 'Details',
              required: false,
              'data-source': '${data.rows}',
            },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': { name: 'complete', payload: { kind: 'appt_view_close' } },
            },
          ],
        },
      },

      // ─── RESCHEDULE_PICK ───────────────────────────────────────────────
      {
        id: 'RESCHEDULE_PICK',
        title: 'Reschedule',
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Reschedule' },
          subheading: { type: 'string', __example__: '' },
          appointments: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } },
            },
            __example__: [{ id: 'a1', title: '01 Jun 2026 — 10:00 AM', description: 'Dr. Reddy' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'Reschedule', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_appt',
              label: 'Appointments',
              required: true,
              'data-source': '${data.appointments}',
            },
            {
              type: 'Footer',
              label: 'Next',
              'on-click-action': {
                name: 'data_exchange',
                payload: { screen_action: 'reschedule_pick', selected_appt: '${form.selected_appt}' },
              },
            },
          ],
        },
      },

      // ─── RESCHEDULE_SLOTS (terminal) ───────────────────────────────────
      {
        id: 'RESCHEDULE_SLOTS',
        title: 'New slot',
        terminal: true,
        success: true,
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Pick a new slot' },
          subheading: { type: 'string', __example__: '' },
          appt_id: { type: 'string', __example__: '' },
          slot_options: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
            __example__: [{ id: '2026-06-02|11:00', title: '02 Jun — 11:00 AM' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'Slots', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'Dropdown',
              name: 'new_slot',
              label: 'Available slots',
              required: true,
              'data-source': '${data.slot_options}',
            },
            {
              type: 'Footer',
              label: 'Confirm Reschedule',
              'on-click-action': {
                name: 'complete',
                payload: {
                  kind: 'reschedule_confirm',
                  appt_id: '${data.appt_id}',
                  new_slot: '${form.new_slot}',
                },
              },
            },
          ],
        },
      },

      // ─── CANCEL_PICK (terminal) ────────────────────────────────────────
      {
        id: 'CANCEL_PICK',
        title: 'Cancel',
        terminal: true,
        success: true,
        data: {
          banner: { type: 'string', __example__: '' },
          has_banner: { type: 'boolean', __example__: false },
          heading: { type: 'string', __example__: 'Cancel appointment' },
          subheading: { type: 'string', __example__: '' },
          appointments: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } },
            },
            __example__: [{ id: 'a1', title: '01 Jun 2026 — 10:00 AM', description: 'Dr. Reddy' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'Image', src: '${data.banner}', width: 1000, height: 125, 'scale-type': 'cover', 'alt-text': 'Cancel', visible: '${data.has_banner}' },
            { type: 'TextHeading', text: '${data.heading}' },
            { type: 'TextBody', text: '${data.subheading}' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_appt',
              label: 'Appointments',
              required: true,
              'data-source': '${data.appointments}',
            },
            {
              type: 'Footer',
              label: 'Confirm Cancel',
              'on-click-action': {
                name: 'complete',
                payload: { kind: 'cancel_confirm', selected_appt: '${form.selected_appt}' },
              },
            },
          ],
        },
      },

      // ─── INFO (terminal — generic message) ─────────────────────────────
      {
        id: 'INFO',
        title: 'Info',
        terminal: true,
        success: true,
        data: {
          info_title: { type: 'string', __example__: 'Thank you' },
          info_body: { type: 'string', __example__: 'We will reach out shortly.' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '${data.info_title}' },
            { type: 'TextBody', text: '${data.info_body}' },
            { type: 'Footer', label: 'Close', 'on-click-action': { name: 'complete', payload: {} } },
          ],
        },
      },
    ],
  };
}

module.exports = { buildFlowJSON };
