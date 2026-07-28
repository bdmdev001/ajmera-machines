/* Client-safe enquiry pipeline constants (no server/mongoose imports) shared by
   the admin UI and the Enquiry model. */

export const ENQUIRY_STATUSES = ['New', 'Contacted', 'Qualified', 'Closed/Lost'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

/** Map any legacy status (Pending/Reviewed/Resolved) onto the new pipeline. */
export function normalizeEnquiryStatus(s: string | undefined | null): EnquiryStatus {
  switch (s) {
    case 'Pending': return 'New';
    case 'Reviewed': return 'Contacted';
    case 'Resolved': return 'Closed/Lost';
    default:
      return (ENQUIRY_STATUSES as readonly string[]).includes(s || '') ? (s as EnquiryStatus) : 'New';
  }
}
