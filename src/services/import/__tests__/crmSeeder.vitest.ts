import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedSupabaseDatabase } from '../crmSeeder';
import * as supabaseClientModule from '@/services/db/supabaseClient';

describe('crmSeeder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('bricht ab wenn Supabase nicht konfiguriert ist', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(false);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      null as unknown as typeof supabaseClientModule.supabase,
    );

    const result = await seedSupabaseDatabase();
    expect(result.success).toBe(false);
    expect(result.companiesInserted).toBe(0);
    expect(result.message).toContain('Supabase credentials not configured');
  });

  it('führt erfolgreichen Seed für Companies, Contacts und Deals durch', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
    const mockSupabase = { from: mockFrom };

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mockSupabase as unknown as typeof supabaseClientModule.supabase,
    );

    const result = await seedSupabaseDatabase();
    expect(result.success).toBe(true);
    expect(result.companiesInserted).toBe(20);
    expect(result.contactsInserted).toBe(100);
    expect(result.dealsInserted).toBe(40);
    expect(result.message).toContain('Successfully seeded');
    expect(mockFrom).toHaveBeenCalledWith('companies');
    expect(mockFrom).toHaveBeenCalledWith('contacts');
    expect(mockFrom).toHaveBeenCalledWith('imported_funnel_deals');
  });

  it('behandelt Fehler beim Seeding von Companies', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'companies') {
        return { upsert: vi.fn().mockResolvedValue({ error: { message: 'Table locked' } }) };
      }
      return { upsert: vi.fn().mockResolvedValue({ error: null }) };
    });
    const mockSupabase = { from: mockFrom };

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mockSupabase as unknown as typeof supabaseClientModule.supabase,
    );

    const result = await seedSupabaseDatabase();
    expect(result.success).toBe(false);
    expect(result.companiesInserted).toBe(0);
    expect(result.error).toBe('Table locked');
    expect(result.message).toContain('Error seeding companies');
  });

  it('behandelt Fehler beim Seeding von Contacts', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'contacts') {
        return { upsert: vi.fn().mockResolvedValue({ error: { message: 'Contacts FK failed' } }) };
      }
      return { upsert: vi.fn().mockResolvedValue({ error: null }) };
    });
    const mockSupabase = { from: mockFrom };

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mockSupabase as unknown as typeof supabaseClientModule.supabase,
    );

    const result = await seedSupabaseDatabase();
    expect(result.success).toBe(false);
    expect(result.companiesInserted).toBe(20);
    expect(result.contactsInserted).toBe(0);
    expect(result.error).toBe('Contacts FK failed');
    expect(result.message).toContain('Error seeding contacts');
  });

  it('behandelt Fehler beim Seeding von Deals', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'imported_funnel_deals') {
        return { upsert: vi.fn().mockResolvedValue({ error: { message: 'Deals constraint' } }) };
      }
      return { upsert: vi.fn().mockResolvedValue({ error: null }) };
    });
    const mockSupabase = { from: mockFrom };

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mockSupabase as unknown as typeof supabaseClientModule.supabase,
    );

    const result = await seedSupabaseDatabase();
    expect(result.success).toBe(false);
    expect(result.companiesInserted).toBe(20);
    expect(result.contactsInserted).toBe(100);
    expect(result.dealsInserted).toBe(0);
    expect(result.error).toBe('Deals constraint');
    expect(result.message).toContain('Error seeding imported funnel deals');
  });

  it('fängt unerwartete Exceptions während des Seeding-Prozesses ab', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue({
      from: () => {
        throw new Error('Supabase network down');
      },
    } as unknown as typeof supabaseClientModule.supabase);

    const result = await seedSupabaseDatabase();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Supabase network down');
    expect(result.message).toContain('Unexpected error');
  });

  it('behandelt nicht-Error Exceptions als String', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue({
      from: () => {
        throw 'Fatal non-error string';
      },
    } as unknown as typeof supabaseClientModule.supabase);

    const result = await seedSupabaseDatabase();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Fatal non-error string');
  });
});
