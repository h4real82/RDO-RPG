import {DartsGame} from './DartsGame';
import type {Venue} from '../types';
export function create(parent:HTMLElement,variant:unknown,_venue:Venue){return new DartsGame(parent,variant);}
