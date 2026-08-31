import { z } from "zod";

// Form #1 — field-for-field match of the live Beverly Law (CL1005) GHL
// intake form, so agents collect the same data over the phone as the
// prospect would on the real LP form (§6.6, docs/tools/PLAN.md). Yes/No
// questions use z.enum rather than boolean so "Unknown"/"Under
// Investigation" (present on several questions in the source form) have
// somewhere to go instead of being forced into true/false.
const yesNo = z.enum(["Yes", "No"]);
const yesNoUnknown = z.enum(["Yes", "No", "Unknown"]);

export const beverlyLawSchema = z.object({
  // 1. Claimant Information
  fullName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  email: z.string().email(),
  currentAddress: z.string().min(1, "Required"),
  preferredLanguage: z.string().optional().default(""),

  // 2. Accident
  dateOfAccident: z.string().min(1, "Required"),
  timeOfAccident: z.string().optional().default(""),
  state: z.string().min(1, "Required"),
  city: z.string().optional().default(""),
  locationOfAccident: z.string().optional().default(""),
  accidentWithinLast30Days: yesNo,
  accidentDescription: z.string().optional().default(""),
  claimantRole: z.enum(["Driver", "Passenger", "Pedestrian", "Cyclist", "Other"]),
  claimantRoleOther: z.string().optional().default(""),
  policeOfficerPresent: yesNo,
  vehiclesInvolved: z.string().optional().default(""),
  defendantAtFault: z.enum(["Yes", "No", "Under Investigation"]),
  liabilityAccepted: yesNoUnknown,

  // 3. Defendant insurance
  defendantInsuranceCompany: z.string().optional().default(""),
  defendantPolicyNumber: z.string().optional().default(""),

  // 4. Claimant insurance
  claimantInsuranceCompany: z.string().optional().default(""),
  claimantPolicyNumber: z.string().optional().default(""),
  hasUmUimCoverage: yesNoUnknown,

  // 5. Injuries / treatment
  injuriesDescription: z.string().optional().default(""),
  injuriesSustained: yesNo,
  receivedMedicalTreatment: yesNo,
  firstProviderFacility: z.string().optional().default(""),
  firstProviderPhysician: z.string().optional().default(""),
  firstTreatmentDate: z.string().optional().default(""),
  additionalProviderName: z.string().optional().default(""),
  additionalProviderTreatmentType: z.string().optional().default(""),
  treatmentContinuous: yesNo,
  willingToContinueTreatment: yesNo,
  hadPhysicalTherapy: yesNo,
  hadInjections: yesNo,
  hadSurgery: yesNo,

  // 6. Evidence / documents on hand
  hasPoliceReport: yesNo,
  policeReportNumber: z.string().optional().default(""),
  hasDashCamFootage: yesNo,
  hasVehicleDamagePhotos: yesNo,
  hasAccidentScenePhotos: yesNo,
  insuranceClaimNumber: z.string().optional().default(""),
  hasWitnessInfo: yesNo,
  otherSupportingDocuments: z.string().optional().default(""),

  representedByAnotherAttorney: yesNo,

  // 7. Final qualification checklist — mirrors the source form's own
  // scoring criteria, filled in by the agent as they go, not derived.
  qualAccidentWithin30DaysOrContinuousTreatment: yesNo,
  qualClaimantSustainedInjuries: yesNo,
  qualMedicalTreatmentReceived: yesNo,
  qualMedicalProviderIdentified: yesNo,
  qualDefendantAtFault: yesNo,
  qualDefendantInsuredOrClaimantHasUmUim: yesNo,
  qualUmUim: yesNo,
  qualObjectiveProofAvailable: yesNo,
  qualWillingToContinueTreatment: yesNo,

  // 8. Documents actually collected (vs. "exists" above — this is
  // "do we have it in hand")
  collectedSignedRetainer: z.boolean().default(false),
  collectedPoliceReport: z.boolean().default(false),
  collectedInsuranceCards: z.boolean().default(false),
  collectedMedicalRecords: z.boolean().default(false),
  collectedMedicalBills: z.boolean().default(false),
  collectedPhotos: z.boolean().default(false),
  collectedAccidentReport: z.boolean().default(false),
  collectedOtherDocuments: z.boolean().default(false),

  notes: z.string().optional().default(""),
  caseStatus: z.enum([
    "Qualified for Submission",
    "Needs Additional Information",
    "Does Not Meet Qualification Criteria",
  ]),
});

export type BeverlyLawAnswers = z.infer<typeof beverlyLawSchema>;

// Drives the form UI — one entry per rendered field. Keeping this
// separate from the Zod schema (rather than deriving one from the
// other) is deliberate: label text and grouping are UI concerns, and
// the source GHL form's own section headings are what agents already
// know, so labels intentionally echo it.
type FieldSpec =
  | { name: keyof BeverlyLawAnswers; label: string; type: "text" | "email" | "date" | "time" | "textarea" }
  | { name: keyof BeverlyLawAnswers; label: string; type: "select"; options: readonly string[] }
  | { name: keyof BeverlyLawAnswers; label: string; type: "checkbox" };

export const BEVERLY_LAW_SECTIONS: Array<{ title: string; fields: FieldSpec[] }> = [
  {
    title: "1. Claimant Information",
    fields: [
      { name: "fullName", label: "Full Name", type: "text" },
      { name: "dateOfBirth", label: "Date Of Birth", type: "date" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "currentAddress", label: "Current Address", type: "text" },
      { name: "preferredLanguage", label: "Preferred Language", type: "text" },
    ],
  },
  {
    title: "2. Accident",
    fields: [
      { name: "dateOfAccident", label: "Date of Accident", type: "date" },
      { name: "timeOfAccident", label: "Time of Accident", type: "time" },
      { name: "state", label: "State", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "locationOfAccident", label: "Location of Accident", type: "text" },
      { name: "accidentWithinLast30Days", label: "Was the accident within the last 30 days?", type: "select", options: ["Yes", "No"] },
      { name: "accidentDescription", label: "Brief description of how the accident occurred", type: "textarea" },
      { name: "claimantRole", label: "Was the claimant the", type: "select", options: ["Driver", "Passenger", "Pedestrian", "Cyclist", "Other"] },
      { name: "claimantRoleOther", label: "If Other, enter text here.", type: "text" },
      { name: "policeOfficerPresent", label: "Was a police officer present?", type: "select", options: ["Yes", "No"] },
      { name: "vehiclesInvolved", label: "Number of vehicles involved", type: "text" },
      { name: "defendantAtFault", label: "Was the defendant at fault?", type: "select", options: ["Yes", "No", "Under Investigation"] },
      { name: "liabilityAccepted", label: "Has the defendant or their insurance accepted liability?", type: "select", options: ["Yes", "No", "Unknown"] },
    ],
  },
  {
    title: "3. Defendant Insurance",
    fields: [
      { name: "defendantInsuranceCompany", label: "Insurance Company", type: "text" },
      { name: "defendantPolicyNumber", label: "Policy Number (if available)", type: "text" },
    ],
  },
  {
    title: "4. Claimant Insurance",
    fields: [
      { name: "claimantInsuranceCompany", label: "Insurance Company Name", type: "text" },
      { name: "claimantPolicyNumber", label: "Policy Number", type: "text" },
      { name: "hasUmUimCoverage", label: "Does the claimant have UM/UIM coverage?", type: "select", options: ["Yes", "No", "Unknown"] },
    ],
  },
  {
    title: "5. Injuries & Treatment",
    fields: [
      { name: "injuriesDescription", label: "Describe the injuries", type: "textarea" },
      { name: "injuriesSustained", label: "Were injuries sustained in the accident?", type: "select", options: ["Yes", "No"] },
      { name: "receivedMedicalTreatment", label: "Has the claimant received medical treatment?", type: "select", options: ["Yes", "No"] },
      { name: "firstProviderFacility", label: "First provider — Hospital/Urgent Care/Clinic", type: "text" },
      { name: "firstProviderPhysician", label: "First provider — Physician/Chiropractor", type: "text" },
      { name: "firstTreatmentDate", label: "Date of First Treatment", type: "date" },
      { name: "additionalProviderName", label: "Additional Provider Name", type: "text" },
      { name: "additionalProviderTreatmentType", label: "Additional Provider — Type of Treatment", type: "text" },
      { name: "treatmentContinuous", label: "Has treatment been continuous?", type: "select", options: ["Yes", "No"] },
      { name: "willingToContinueTreatment", label: "Is the claimant willing to continue treatment?", type: "select", options: ["Yes", "No"] },
      { name: "hadPhysicalTherapy", label: "Physical Therapy", type: "select", options: ["Yes", "No"] },
      { name: "hadInjections", label: "Injections", type: "select", options: ["Yes", "No"] },
      { name: "hadSurgery", label: "Surgery", type: "select", options: ["Yes", "No"] },
    ],
  },
  {
    title: "6. Evidence on Hand",
    fields: [
      { name: "hasPoliceReport", label: "Police Report", type: "select", options: ["Yes", "No"] },
      { name: "policeReportNumber", label: "Police Report Number", type: "text" },
      { name: "hasDashCamFootage", label: "Dash Cam Footage", type: "select", options: ["Yes", "No"] },
      { name: "hasVehicleDamagePhotos", label: "Photos of Vehicle Damage", type: "select", options: ["Yes", "No"] },
      { name: "hasAccidentScenePhotos", label: "Photos of Accident Scene", type: "select", options: ["Yes", "No"] },
      { name: "insuranceClaimNumber", label: "Insurance Claim Number", type: "text" },
      { name: "hasWitnessInfo", label: "Witness Information", type: "select", options: ["Yes", "No"] },
      { name: "otherSupportingDocuments", label: "Other Supporting Documents", type: "textarea" },
      { name: "representedByAnotherAttorney", label: "Is the claimant currently represented by another attorney?", type: "select", options: ["Yes", "No"] },
    ],
  },
  {
    title: "7. Final Qualification",
    fields: [
      { name: "qualAccidentWithin30DaysOrContinuousTreatment", label: "Accident within 30 days (or continuous treatment if older)", type: "select", options: ["Yes", "No"] },
      { name: "qualClaimantSustainedInjuries", label: "Claimant sustained injuries", type: "select", options: ["Yes", "No"] },
      { name: "qualMedicalTreatmentReceived", label: "Medical treatment received", type: "select", options: ["Yes", "No"] },
      { name: "qualMedicalProviderIdentified", label: "Medical provider identified", type: "select", options: ["Yes", "No"] },
      { name: "qualDefendantAtFault", label: "Defendant at fault", type: "select", options: ["Yes", "No"] },
      { name: "qualDefendantInsuredOrClaimantHasUmUim", label: "Defendant has valid insurance OR claimant has UM/UIM", type: "select", options: ["Yes", "No"] },
      { name: "qualUmUim", label: "UM/UIM", type: "select", options: ["Yes", "No"] },
      { name: "qualObjectiveProofAvailable", label: "Objective proof of accident available", type: "select", options: ["Yes", "No"] },
      { name: "qualWillingToContinueTreatment", label: "Claimant willing to continue treatment", type: "select", options: ["Yes", "No"] },
    ],
  },
  {
    title: "8. Documents Collected",
    fields: [
      { name: "collectedSignedRetainer", label: "Signed Retainer", type: "checkbox" },
      { name: "collectedPoliceReport", label: "Police Report", type: "checkbox" },
      { name: "collectedInsuranceCards", label: "Insurance Card(s)", type: "checkbox" },
      { name: "collectedMedicalRecords", label: "Medical Records (if available)", type: "checkbox" },
      { name: "collectedMedicalBills", label: "Medical Bills (if available)", type: "checkbox" },
      { name: "collectedPhotos", label: "Photos", type: "checkbox" },
      { name: "collectedAccidentReport", label: "Accident Report", type: "checkbox" },
      { name: "collectedOtherDocuments", label: "Additional Supporting Documents", type: "checkbox" },
    ],
  },
  {
    title: "9. Notes & Status",
    fields: [
      { name: "notes", label: "Notes", type: "textarea" },
      { name: "caseStatus", label: "Case Status", type: "select", options: ["Qualified for Submission", "Needs Additional Information", "Does Not Meet Qualification Criteria"] },
    ],
  },
];
