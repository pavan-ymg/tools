export type FormRegistryEntry = {
  formType: string;
  clientName: string;
  caseType: string;
  href: string;
};

// One entry per intake form that's actually been built (§6.6 —
// "developer builds each form", never agent-configurable). Add a row
// here, plus its own route under app/(dashboard)/intake/new/, whenever a
// new client's form ships — nothing here should be invented ahead of a
// real field list.
export const FORM_REGISTRY: FormRegistryEntry[] = [
  {
    formType: "beverly_law",
    clientName: "Beverly Law",
    caseType: "Motor Vehicle Accident",
    href: "/intake/new/beverly-law",
  },
];
