import { ArchitectureMap } from './ArchitectureMap';
import { architectureMapData } from './data';

/**
 * Self-contained wrapper for lazy-loading.
 * Provides default data so the parent only needs <ArchitectureMapSection />.
 */
function ArchitectureMapSection() {
  return (
    <section className="py-16 px-4 max-w-6xl mx-auto" aria-label="Architecture overview">
      <ArchitectureMap
        nodes={architectureMapData.nodes}
        edges={architectureMapData.edges}
        title="Serverless Architecture"
        description="Interactive diagram of the cloud infrastructure powering this site"
      />
    </section>
  );
}

export default ArchitectureMapSection;
