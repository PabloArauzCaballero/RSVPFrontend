import { describe, expect, it } from 'vitest';
import { componentStates } from './index';
describe('component state contract', () => { it('exposes every required UI state', () => expect(componentStates).toEqual(['default', 'loading', 'error', 'empty', 'disabled'])); });
