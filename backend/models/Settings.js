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

    /** Used to build Google Maps "directions" URL from the patient location. */
    locationLat: { type: Number, default: 0 },
    locationLng: { type: Number, default: 0 },
    locationLabel: { type: String, default: '' },
    googleMapsPlaceId: { type: String, default: '' },

    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', SettingsSchema);
