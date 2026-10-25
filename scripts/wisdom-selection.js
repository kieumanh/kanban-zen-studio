// Pure selection functions are embedded into welcome.js at build-authoring time.
// Every excerpt occurs exactly once in a complete cycle, including authors
// without a profile. Entries for each author are spread across the cycle.
function welcomeProfile(author, profiles) {
  return profiles.filter(p => author === p.name || author.startsWith(p.name + ' ·'))
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
    if (typeof quote.vi !== 'string' || !quote.vi.trim()) continue;
    const profile = welcomeProfile(quote.author, profiles);
    const key = profile?.id || quote.author;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({quote,profile});
  }
  const deck = [];
  for (const [key, entries] of groups) {
    entries.sort((a,b) => welcomeHash(a.quote.id || a.quote.vi) - welcomeHash(b.quote.id || b.quote.vi)
      || a.quote.vi.localeCompare(b.quote.vi));
    entries.forEach((entry,i) => deck.push({...entry, position:(i+0.5)/entries.length,key}));
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
