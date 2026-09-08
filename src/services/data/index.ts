import { dataSourceRegistry } from './dataSourceRegistry';
import { simulatedCrmSource } from './sources/simulatedCrmSource';
import { makeBaselineFileSource, listBaselineFileVersions } from './sources/baselineFileSource';
import { makeHubSpotBaselineSource, listHubSpotBaselineVersions } from './sources/hubSpotBaselineSource';

dataSourceRegistry.register(simulatedCrmSource);
for (const v of listBaselineFileVersions()) {
  dataSourceRegistry.register(makeBaselineFileSource(v));
}
for (const v of listHubSpotBaselineVersions()) {
  dataSourceRegistry.register(makeHubSpotBaselineSource(v));
}

export { dataSourceRegistry };
export { simulatedCrmSource } from './sources/simulatedCrmSource';
export { makeBaselineFileSource, listBaselineFileVersions } from './sources/baselineFileSource';
export { makeHubSpotBaselineSource, listHubSpotBaselineVersions } from './sources/hubSpotBaselineSource';
