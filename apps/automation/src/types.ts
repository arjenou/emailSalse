export interface ProductBrief {
  name: string;
  description: string;
  advantages?: string | null;
  service_type?: string | null;
}

export interface DiscoveryJobPayload {
  campaignId: string;
  campaignRunId: string;
  workspaceId: string;
  context: string;
  region: string;
  queries: string[];
  sourceUrls: string[];
  maxLeads: number;
  products: ProductBrief[];
}

export interface QualificationJobPayload extends DiscoveryJobPayload {
  leadId: string;
  companyId: string;
  companyName: string;
  websiteUrl: string;
  description: string;
  sourceUrl: string;
}

export interface SenderSnapshot {
  companyName?: string | null;
  companyNameEn?: string | null;
  companyNameJa?: string | null;
  contactName?: string | null;
  contactNameKana?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  address?: string | null;
}

export interface OutreachJobPayload {
  outreachId: string;
  companyId: string;
  companyName: string;
  contactFormUrl: string;
  subject: string;
  message: string;
  sender: SenderSnapshot;
}
