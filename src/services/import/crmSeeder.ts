import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { importCrmData } from './crmImporter';

export interface SeedResult {
  success: boolean;
  companiesInserted: number;
  contactsInserted: number;
  dealsInserted: number;
  message: string;
  error?: string;
}

export async function seedSupabaseDatabase(): Promise<SeedResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      companiesInserted: 0,
      contactsInserted: 0,
      dealsInserted: 0,
      message: 'Supabase credentials not configured in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).',
    };
  }

  try {
    const { companies, contacts, importedFunnelDeals } = importCrmData();

    // 1. Seed Companies (Upsert to prevent duplicates)
    const companyPayload = companies.map((c) => ({
      id: c.id,
      domain: c.domain,
      name: c.name,
      industry: c.industry,
      city: c.city,
      postal_code: c.postalCode,
      employee_count: c.employeeCount,
    }));

    const { error: compErr } = await supabase
      .from('companies')
      .upsert(companyPayload, { onConflict: 'id' });

    if (compErr) {
      return {
        success: false,
        companiesInserted: 0,
        contactsInserted: 0,
        dealsInserted: 0,
        message: 'Error seeding companies into Supabase.',
        error: compErr.message,
      };
    }

    // 2. Seed Contacts
    const contactPayload = contacts.map((ct) => ({
      id: ct.id,
      company_id: ct.companyId,
      email: ct.email,
      first_name: ct.firstName,
      last_name: ct.lastName,
      job_title: ct.jobTitle,
    }));

    const { error: contErr } = await supabase
      .from('contacts')
      .upsert(contactPayload, { onConflict: 'id' });

    if (contErr) {
      return {
        success: false,
        companiesInserted: companies.length,
        contactsInserted: 0,
        dealsInserted: 0,
        message: 'Error seeding contacts into Supabase.',
        error: contErr.message,
      };
    }

    // 3. Seed Imported Funnel Deals
    const dealPayload = importedFunnelDeals.map((d) => ({
      id: d.id,
      deal_name: d.dealName,
      stage: d.stage,
      amount: d.amount,
      close_date: d.closeDate,
      pipeline: d.pipeline,
    }));

    const { error: dealErr } = await supabase
      .from('imported_funnel_deals')
      .upsert(dealPayload, { onConflict: 'id' });

    if (dealErr) {
      return {
        success: false,
        companiesInserted: companies.length,
        contactsInserted: contacts.length,
        dealsInserted: 0,
        message: 'Error seeding imported funnel deals into Supabase.',
        error: dealErr.message,
      };
    }

    return {
      success: true,
      companiesInserted: companies.length,
      contactsInserted: contacts.length,
      dealsInserted: importedFunnelDeals.length,
      message: `Successfully seeded ${companies.length} Companies, ${contacts.length} Contacts, and ${importedFunnelDeals.length} Funnel Deals into Supabase!`,
    };
  } catch (err) {
    return {
      success: false,
      companiesInserted: 0,
      contactsInserted: 0,
      dealsInserted: 0,
      message: 'Unexpected error during Supabase seeding.',
      error: (err instanceof Error ? err.message : '') || String(err),
    };
  }
}
