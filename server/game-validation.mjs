// Account-private workspace validation, not anti-cheat verification.
export function validGameWorkspace(g) {
  if (g === undefined) return true;
  try {
    if (!g || g.version !== 1 || JSON.stringify(g).length > 1100000)
      return false;
    if (
      !g.profile ||
      typeof g.profile.name !== 'string' ||
      g.profile.name.length > 60 ||
      !['male', 'female'].includes(g.profile.appearance)
    )
      return false;
    if (
      !g.prefs ||
      !Array.isArray(g.prefs.hiddenAxes) ||
      !g.prefs.hiddenAxes.every((x) => Number.isInteger(x) && x >= 0 && x < 9)
    )
      return false;
    for (const key of ['rest', 'motion', 'sound', 'rewards', 'widget'])
      if (typeof g.prefs[key] !== 'boolean') return false;
    for (const [key, limit] of [
      ['catalog', 200],
      ['assets', 500],
      ['transactions', 2000],
      ['cleared', 100],
      ['history', 500],
    ])
      if (!Array.isArray(g[key]) || g[key].length > limit) return false;
    if (
      !g.rewards ||
      Array.isArray(g.rewards) ||
      Object.keys(g.rewards).length > 6000 ||
      !g.sources ||
      !g.taskMeta
    )
      return false;
    const axis = (x) => Number.isInteger(x) && x >= 0 && x < 9;
    const amount = (x) => typeof x === 'string' && /^\d{1,45}$/.test(x);
    const ids = new Set();
    for (const t of g.transactions) {
      if (
        !t ||
        typeof t.id !== 'string' ||
        ids.has(t.id) ||
        !axis(t.axis) ||
        !amount(t.amount) ||
        !['spend', 'refund'].includes(t.type) ||
        typeof t.note !== 'string' ||
        t.note.length > 2000 ||
        !Number.isFinite(t.at)
      )
        return false;
      ids.add(t.id);
    }
    for (const r of Object.values(g.rewards))
      if (
        !r ||
        !['500', '2500', '10000'].includes(r.amount) ||
        typeof r.active !== 'boolean' ||
        !(r.primary === null || axis(r.primary)) ||
        !(r.secondary === null || axis(r.secondary))
      )
        return false;
    if (
      !g.cleared.every((x) => Number.isInteger(x) && x >= 1 && x <= 100) ||
      new Set(g.cleared).size !== g.cleared.length
    )
      return false;
    for (const a of g.assets)
      if (
        !a ||
        typeof a.name !== 'string' ||
        a.name.length > 120 ||
        !['item', 'book'].includes(a.kind) ||
        !['owned', 'used', 'learned', 'returned'].includes(a.status) ||
        !amount(a.amount) ||
        !Number.isInteger(a.quantity) ||
        a.quantity < 1 ||
        a.quantity > 10000
      )
        return false;
    for (const c of g.catalog)
      if (
        !c ||
        typeof c.id !== 'string' ||
        typeof c.name !== 'string' ||
        c.name.length > 120 ||
        !['item', 'book'].includes(c.kind) ||
        !axis(c.axis) ||
        !amount(c.price) ||
        !Number.isInteger(c.gate) ||
        c.gate < 0 ||
        c.gate > 100
      )
        return false;
    if (g.challenge) {
      const c = g.challenge;
      if (
        !['active', 'won', 'expired', 'cancelled', 'practiced'].includes(
          c.status,
        ) ||
        !Number.isFinite(c.startAt) ||
        !Number.isFinite(c.deadline) ||
        c.deadline <= c.startAt ||
        !Number.isInteger(c.boss) ||
        c.boss < 1 ||
        c.boss > 100 ||
        !Array.isArray(c.tasks) ||
        !c.tasks.length ||
        c.tasks.length > 10 ||
        !Array.isArray(c.edits)
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
