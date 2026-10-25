"""Reproducible import of individually translated classical excerpts.

Only source-matched, curated rows are published. Downloaded raw text never
counts toward the target. Run from the repository root with Python 3.
"""
import collections
import hashlib
import json
import pathlib
import re
import unicodedata
import runpy

ROOT = pathlib.Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text())
def write(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
def norm(s):
    return " ".join(unicodedata.normalize("NFC", s).casefold().split())
def identity(q):
    return hashlib.sha256((q["author"] + "|" + norm(q["vi"])).encode()).hexdigest()[:24]

q = read("dist/wisdom.json")
analects = (ROOT / "sources/analects-legge.txt").read_text()
books = list(re.finditer(r"^BOOK ([IVXLCDM]+)\.[^\n]*", analects, re.M))
short = []
for b, n in zip(books, books[1:] + [None]):
    block = analects[b.end():n.start() if n else analects.index("*** END OF THE PROJECT")]
    chapters = list(re.finditer(r"CHAP(?:TER)?\.?(?:TER)?\s+([IVXLCDM]+)\.", block))
    for c, z in zip(chapters, chapters[1:] + [None]):
        text = " ".join(block[c.end():z.start() if z else None].split())
        if text.startswith("The Master said,") and len(text) < 440 and text.count("said") == 1 and "CHAP." not in text:
            short.append(dict(book=b[1], chapter=c[1], text=text))
assert len(short) == 188, "Source structure changed; inspect before importing."
additions = []
for index, vi in read("scripts/analects-vi.json").items():
    row = short[int(index)]
    additions.append(dict(author="Khổng Tử", text=row["text"], vi=vi,
        source="Luận Ngữ · thiên " + row["book"] + ", chương " + row["chapter"] + " · số chương theo bản James Legge",
        sourceRef="analects-legge:" + row["book"] + "." + row["chapter"],
        url="https://www.gutenberg.org/ebooks/3330", language="en",
        kind="excerpt", translationNote="Bản dịch tiếng Việt từ bản Anh James Legge · tham khảo",
        sourceChecked=True, batch="classics-2026-10-25"))

tao = (ROOT / "sources/tao-te-king-legge.txt").read_text()
tao = tao[tao.index("Ch. 1."):tao.index("*** END")]
marks = list(re.finditer(r"(?:^|\n\n\n)(?:Ch\. )?(\d+)\.(?: |\n)", tao))
assert [int(m[1]) for m in marks] == list(range(1, 82))
chapters = {int(m[1]): " ".join(tao[m.end():n.start() if n else None].split())
    for m, n in zip(marks, marks[1:] + [None])}
for chapter, text, vi in read("scripts/laozi-vi.json"):
    assert norm(text) in norm(chapters[chapter]), (chapter, text)
    additions.append(dict(author="Lão Tử", text=text, vi=vi,
        source=f"Đạo Đức Kinh · chương {chapter} · bản Anh James Legge",
        sourceRef=f"tao-te-king-legge:{chapter}", url="https://www.gutenberg.org/ebooks/216",
        language="en", kind="excerpt", translationNote="Bản dịch nghĩa tiếng Việt từ bản Anh James Legge · tham khảo",
        sourceChecked=True, batch="classics-2026-10-25"))

for author, text, vi, url, source in read("scripts/official-excerpts.json"):
    additions.append(dict(author=author, text=text, vi=vi, url=url, source=source,
        language="en", kind="excerpt", sourceChecked=True,
        translationNote="Bản dịch nghĩa tiếng Việt · tham khảo",
        batch="official-2026-10-25"))

additions.extend(runpy.run_path(str(ROOT/"scripts/classical-passages.py"))["passages"]())
for item in read("scripts/additional-sources.json"):
    additions.append(dict(item,kind="excerpt",sourceChecked=True,batch="additional-2026-10-25"))

seen_vi = {norm(x["vi"]) for x in q}
seen_text = {(x["author"], norm(x.get("text", ""))) for x in q}
skipped = []
published_count = sum(x.get("kind") != "reflection" for x in q)
assert published_count <= 9999, "Existing corpus exceeds target; review before publishing."
for row in additions:
    # A quotation already present inside a longer excerpt is not new content.
    overlap = any(a == row["author"] and len(t) > 30 and
        (norm(row["text"]) in t or t in norm(row["text"])) for a, t in seen_text)
    if norm(row["vi"]) in seen_vi or overlap:
        skipped.append(row.get("sourceRef", row["url"]))
        continue
    if row.get("kind") != "reflection" and published_count >= 9999:
        skipped.append(row.get("sourceRef", row["url"]))
        continue
    q.append(row)
    if row.get("kind") != "reflection":
        published_count += 1
    seen_vi.add(norm(row["vi"]))
    seen_text.add((row["author"], norm(row["text"])))
for row in q:
    row["id"] = identity(row)
    if row.get("kind") == "reflection":
        row["attribution"] = "Zen Studio · lời chiêm nghiệm biên soạn"
write("dist/wisdom.json", q)
active = [x for x in q if x.get("kind") != "reflection"]
stats = dict(target=9999, totalEntries=len(q), sourcedExcerpts=len(active),
    editorialReflections=len(q)-len(active), remaining=max(0,9999-len(active)),
    sourceMatchedNewBatch=sum(x.get("sourceChecked") is True for x in active),
    allTranslationsHumanReviewed=False, complete=len(active) == 9999,
    countsByAuthor=dict(collections.Counter(x["author"] for x in active)),
    note="Có nguồn không đồng nghĩa với đã thẩm định toàn bộ bản dịch. Dữ liệu cũ cần tiếp tục rà soát. Không tính đoạn thô hoặc lời biên soạn vào mục tiêu trích đoạn.")
write("dist/wisdom-status.json", stats)
print(json.dumps(dict(stats=stats, skipped=skipped), ensure_ascii=False))
