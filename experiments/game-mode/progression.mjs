// Experimental balance model only. No Kanban hooks or persisted rewards.
export const AXES = Object.freeze(['can-cot','tam-luc','tai-luoc','nhan-duyen','ngo-tinh','dinh-tam','gia-nghiep','tinh-nghiep','thien-duyen']);
export const REWARDS = Object.freeze({checklist:5,task:25,project:100});
export function xpToNext(level) {
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new RangeError('Cấp phải từ 1 đến 100');
  return level === 100 ? 0 : Math.ceil(50 * 1.06 ** (level - 1));
}
export function progression(xp) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new RangeError('Tu vi không hợp lệ');
  let level=1, remaining=xp;
  while(level<100 && remaining>=xpToNext(level)) remaining-=xpToNext(level++);
  const required=xpToNext(level);
  return {level,earned:level===100?0:remaining,required,percent:level===100?100:Math.floor(remaining/required*100),overflow:level===100?remaining:0};
}
export function axisAllocation(xp, primary, secondary=null) {
  if (!Number.isSafeInteger(xp)||xp<0||!AXES.includes(primary)||(secondary!==null&&(!AXES.includes(secondary)||secondary===primary))) throw new RangeError('Phân bổ không hợp lệ');
  if (secondary===null) return {[primary]:xp};
  const main=Math.ceil(xp*0.7);
  return {[primary]:main,[secondary]:xp-main};
}
