// Pure selection functions are embedded into welcome.js at build-authoring time.
// Every excerpt occurs exactly once in a complete cycle, including authors
// without a profile. Entries for each author are spread across the cycle.
// Priority authors (Osho + non-Chinese sages) appear more frequently in the cycle
// by using a compressed position range (0.0–0.5) so they cluster near the front
// of each half-cycle, interleaved with other authors.
const PRIORITY_AUTHORS = ['Osho'];
function welcomeAllowed(entry) {
  return !/marcus\s+aurelius|stoic|khắc\s*kỷ|khac\s*ky|epictetus|seneca/i.test([entry.author,entry.name,entry.id,entry.school,entry.theme,entry.source].filter(Boolean).join(' '));
}
function welcomeProfile(author, profiles) {
  return profiles.filter(p => welcomeAllowed(p) && (author === p.name || author.startsWith(p.name + ' ·')))
    .sort((a,b) => b.name.length - a.name.length)[0];
}
function welcomeHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function welcomeDeck(quotes, profiles) {
  const groups = new Map();
  for (const quote of quotes) {
    if (!welcomeAllowed(quote) || typeof quote.vi !== 'string' || !quote.vi.trim()) continue;
    const profile = welcomeProfile(quote.author, profiles);
    const key = profile?.id || quote.author;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({quote,profile});
  }
  const deck = [];
  for (const [key, entries] of groups) {
    const author = entries[0]?.quote?.author || '';
    const isPriority = PRIORITY_AUTHORS.some(p => author === p || author.startsWith(p + ' '));
    entries.sort((a,b) => welcomeHash(a.quote.id || a.quote.vi) - welcomeHash(b.quote.id || b.quote.vi)
      || a.quote.vi.localeCompare(b.quote.vi));
    entries.forEach((entry,i) => {
      // Priority authors: compress their positions into the 0.0–0.5 range so
      // they interleave with every other author at the front of each cycle half.
      const base = isPriority ? (i+0.5)/entries.length * 0.5 : (i+0.5)/entries.length;
      deck.push({...entry, position: base, key});
    });
  }
  return deck.sort((a,b) => a.position - b.position || a.key.localeCompare(b.key));
}
let welcomeDeckCache=null,welcomeDeckQuotes=null,welcomeDeckProfiles=null;
function welcomeSelection(time) {
  const profiles=teacherCache?.profiles||[];
  if(welcomeDeckQuotes!==wisdomCache||welcomeDeckProfiles!==profiles){
    welcomeDeckCache=welcomeDeck(wisdomCache,profiles);
    welcomeDeckQuotes=wisdomCache;welcomeDeckProfiles=profiles;
  }
  if(!welcomeDeckCache.length)return {};
  const epoch=Math.floor(Date.parse('2026-10-24T00:00:00Z')/86400000)*4;
  const index=((time.serial-epoch)%welcomeDeckCache.length+welcomeDeckCache.length)%welcomeDeckCache.length;
  return welcomeDeckCache[index];
}
