import { NailDesigner } from './NailDesigner';

if (!customElements.get('nail-designer')) {
  customElements.define('nail-designer', NailDesigner);
}

export { NailDesigner };
export type { DesignState } from './types';
