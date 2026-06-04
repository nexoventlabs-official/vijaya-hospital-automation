const mongoose = require('mongoose');

/**
 * Singleton document holding hospital-wide config the admin can edit.
 * Stored with `key: 'main'`. Used everywhere (PDFs, contact CTA, Maps URL, etc.)
 */
const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },

    hospitalName: { type: String, default: 'Vijya Hospital' },
    hospitalNameTe: { type: String, default: 'విజయ హాస్పిటల్' },
    contactPhone: { type: String, default: '' },
    contactPhoneAlt: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },

    addressLine: { type: String, default: '' },
    addressLineTe: { type: String, default: '' },

    /** Google Maps link for "Get Directions" — paste the share URL from Google Maps. */
    googleMapsUrl: { type: String, default: '' },
    locationLabel: { type: String, default: '' },
    googleMapsPlaceId: { type: String, default: '' },

    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },

    /** Stamps overlaid on appointment PDFs based on status. */
    stampConfirmedUrl: { type: String, default: '' },
    stampConfirmedPublicId: { type: String, default: '' },
    stampCompletedUrl: { type: String, default: '' },
    stampCompletedPublicId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', SettingsSchema);
