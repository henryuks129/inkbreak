export const DEFAULT_BINDINGS = {
  forward:'KeyW', backward:'KeyS', left:'KeyA', right:'KeyD', fire:'KeyJ',
  jump:'Space', swim:'ShiftLeft', slide:'KeyX', ability:'KeyF', recenter:'KeyC',
  fighter1:'Digit1', fighter2:'Digit2', fighter3:'Digit3', fighter4:'Digit4', fighter5:'Digit5',
} as const;

export type ControlAction=keyof typeof DEFAULT_BINDINGS;
export type ControlBindings=Record<ControlAction,string>;
export const CONTROL_ACTIONS=Object.keys(DEFAULT_BINDINGS) as ControlAction[];
const usable=(code:string)=>/^(Key[A-Z]|Digit[0-9]|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(code);

/** Invalid or duplicate saved keys fall back to defaults, so every action stays reachable. */
export function normalizeBindings(value:unknown):ControlBindings{
  const raw=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
  const result={...DEFAULT_BINDINGS} as ControlBindings,used=new Set<string>();
  for(const action of CONTROL_ACTIONS){const candidate=raw[action];const keepsOtherDefault=typeof candidate==='string'&&CONTROL_ACTIONS.some(other=>other!==action&&DEFAULT_BINDINGS[other]===candidate);const code=typeof candidate==='string'&&usable(candidate)&&!used.has(candidate)&&!keepsOtherDefault?candidate:DEFAULT_BINDINGS[action];result[action]=code;used.add(code);}
  return result;
}

export function rebind(current:ControlBindings,action:ControlAction,code:string):ControlBindings|null{
  if(!usable(code))return null;
  const owner=CONTROL_ACTIONS.find(key=>key!==action&&current[key]===code);
  if(owner)return null;
  return {...current,[action]:code};
}

export function displayKey(code:string){return code==='Space'?'SPACE':code.startsWith('Key')?code.slice(3):code.startsWith('Digit')?code.slice(5):code.replace(/(Left|Right)$/,'').toUpperCase();}
