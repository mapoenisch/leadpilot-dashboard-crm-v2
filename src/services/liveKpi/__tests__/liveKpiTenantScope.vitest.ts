import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLiveKpiOrganization,
  setLiveKpiOrganization,
  resetLiveKpiTenantScopeForTesting,
} from '../liveKpiTenantScope';
import { liveKpiStreamStore } from '../liveKpiStreamStore';

describe('liveKpiTenantScope', () => {
  beforeEach(() => {
    resetLiveKpiTenantScopeForTesting();
  });

  it('initial state is null', () => {
    expect(getLiveKpiOrganization()).toBeNull();
  });

  it('setLiveKpiOrganization sets the active organization and resets the stream store', () => {
    const resetSpy = vi.spyOn(liveKpiStreamStore, 'reset');
    setLiveKpiOrganization('org-a');
    expect(getLiveKpiOrganization()).toBe('org-a');
    expect(resetSpy).toHaveBeenCalledTimes(1);
    resetSpy.mockRestore();
  });

  it('setting the same organization does not trigger stream store reset', () => {
    setLiveKpiOrganization('org-a');
    const resetSpy = vi.spyOn(liveKpiStreamStore, 'reset');
    setLiveKpiOrganization('org-a');
    expect(resetSpy).not.toHaveBeenCalled();
    resetSpy.mockRestore();
  });

  it('setting null (logout) resets the stream store', () => {
    setLiveKpiOrganization('org-a');
    const resetSpy = vi.spyOn(liveKpiStreamStore, 'reset');
    setLiveKpiOrganization(null);
    expect(getLiveKpiOrganization()).toBeNull();
    expect(resetSpy).toHaveBeenCalledTimes(1);
    resetSpy.mockRestore();
  });
});
