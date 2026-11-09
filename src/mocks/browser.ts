import { setupWorker } from 'msw/browser';
import { config } from '@/core/config';
import { handlers } from './handlers';
import { unknownRealModules, withoutRealModules } from './realModules';

const unknown = unknownRealModules(config.realModules);
if (unknown.length > 0) console.warn(`VITE_REAL_MODULES : module inconnu (${unknown.join(', ')}), il reste simulé`);

export const worker = setupWorker(...withoutRealModules(handlers, config.realModules));
