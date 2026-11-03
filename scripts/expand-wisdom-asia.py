"""Thêm trích đoạn nguyên văn từ các bản dịch phạm vi công cộng của kinh điển và thánh nhân châu Á (v1.19.2+).

Quy tắc giống scripts/expand-wisdom.py: chỉ đưa vào câu đã đối chiếu nguyên văn với tệp nguồn trong sources/,
mỗi câu có bản dịch nghĩa tiếng Việt viết tay (scripts/*-vi.json), không trùng câu đã có. Chạy lại nhiều lần cho kết quả như nhau.
Chạy từ gốc kho mã bằng Python 3: python3 scripts/expand-wisdom-asia.py
"""
import collections
import hashlib
import json
import pathlib
import re
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = 2222  # mục tiêu số trích đoạn có nguồn do người dùng đặt từ v1.19.2 (trước đó 3.333)
BATCH = "asia-2026-11-03"


def read(path):
    return json.loads((ROOT / path).read_text())


def write(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def norm(s):
    return " ".join(unicodedata.normalize("NFC", s).casefold().split())


def identity(q):
    return hashlib.sha256((q["author"] + "|" + norm(q["vi"])).encode()).hexdigest()[:24]


def gutenberg_body(path):
    text = (ROOT / path).read_text(encoding="utf-8", errors="replace").replace("\r", "")
    return text[text.index("*** START OF") : text.index("*** END OF")]


def paragraph_after(lines, i):
    j = i + 1
    while j < len(lines) and not lines[j].strip():
        j += 1
    k = j
    while k < len(lines) and lines[k].strip():
        k += 1
    return " ".join(" ".join(lines[j:k]).split()), k


PARTS = {"First": 1, "Second": 2, "Third": 3, "Fourth": 4, "fourth": 4, "Fifth": 5, "Sixth": 6}


def upanishad_candidates():
    """Các mantra Isha, Katha, Kena trong bản Anh của Swami Paramananda (Project Gutenberg #3283)."""
    path = "sources/upanishads-paramananda.txt"
    lines = gutenberg_body(path).split("\n")
    title = part = None
    cands, i = [], 0
    while i < len(lines):
        s = lines[i].strip()
        m = re.fullmatch(r"([A-Z][a-z]+)[- ]Upanishad", s)
        if m and lines[i].startswith("   "):
            title, part = m[1], None
        elif re.fullmatch(r"Part (First|Second|Third|Fourth|Fifth|Sixth|fourth)", s):
            part = PARTS[s.split()[1]]
        elif re.fullmatch(r"[IVXLC]+", s) and title:
            para, i = paragraph_after(lines, i)
            cands.append(dict(up=title, part=part, num=s, text=para))
            continue
        i += 1
    assert len(cands) == 171, "Cấu trúc nguồn đã đổi, cần kiểm tra trước khi nhập."
    return cands


def upanishads():
    path = "sources/upanishads-paramananda.txt"
    cands = upanishad_candidates()
    names = {"Isa": "Isha", "Katha": "Katha", "Kena": "Kena"}
    rows = []
    for index, vi in read("scripts/upanishads-vi.json").items():
        c = cands[int(index)]
        name = names[c["up"]]
        where = name + " Upanishad · " + (f"phần {c['part']} · " if c["part"] else "") + f"mantra {c['num']}"
        rows.append(dict(
            author="Upanishad", text=c["text"], vi=vi,
            source=where + " · bản Anh Swami Paramananda",
            sourceRef=f"upanishads-paramananda:{name.lower()}.{c['part'] or 0}.{c['num']}",
            url="https://www.gutenberg.org/ebooks/3283", language="en", kind="excerpt",
            attribution=name + " Upanishad · các bậc thấy chân lý thời Veda, không rõ tên",
            translationNote="Bản dịch nghĩa tiếng Việt từ bản Anh Swami Paramananda · tham khảo",
            sourceFile=path, sourceChecked=True, batch=BATCH))
    return rows


def kabir_candidates():
    """Bài thơ của Kabir trong bản Anh của Rabindranath Tagore (Project Gutenberg #6519): từng khổ, và cả bài nếu ngắn."""
    lines = gutenberg_body("sources/songs-of-kabir-tagore.txt").split("\n")
    start = next(i for i, l in enumerate(lines) if l.strip() == "KABIR'S POEMS")
    poems, cur = [], None
    for l in lines[start + 1 :]:
        m = re.fullmatch(r"  ([IVXLC]+)", l.rstrip())
        if m:
            cur = dict(num=m[1], lines=[])
            poems.append(cur)
        elif cur is not None:
            cur["lines"].append(l)
    assert len(poems) == 100, "Cấu trúc nguồn đã đổi, cần kiểm tra trước khi nhập."
    cands = []
    for p in poems:
        blocks, block = [], []
        for l in p["lines"]:
            if re.match(r"\s+[IVX]+\.\s*\d+\.\s+_", l):
                continue  # dòng chỉ mục bài ở đầu mỗi bài
            if l.strip():
                block.append(l.strip())
            elif block:
                blocks.append(" ".join(" ".join(block).split()))
                block = []
        if block:
            blocks.append(" ".join(" ".join(block).split()))
        for i, b in enumerate(blocks):
            cands.append(dict(num=p["num"], stanza=i + 1, of=len(blocks), text=b))
        whole = " ".join(blocks)
        if len(blocks) > 1 and len(whole) <= 420:
            cands.append(dict(num=p["num"], stanza=0, of=len(blocks), text=whole))
    return cands


def kabir():
    path = "sources/songs-of-kabir-tagore.txt"
    cands = kabir_candidates()
    rows = []
    for index, vi in read("scripts/kabir-vi.json").items():
        c = cands[int(index)]
        part = "" if c["of"] == 1 or c["stanza"] == 0 else f" · khổ {c['stanza']}"
        rows.append(dict(
            author="Kabir", text=c["text"], vi=vi,
            source=f"Songs of Kabir · bài {c['num']}{part} · bản Anh Rabindranath Tagore (1915)",
            sourceRef=f"songs-of-kabir:{c['num']}.{c['stanza']}",
            url="https://www.gutenberg.org/ebooks/6519", language="en", kind="excerpt",
            attribution="Kabir · thi sĩ – thợ dệt, Ấn Độ thế kỷ XV",
            translationNote="Bản dịch nghĩa tiếng Việt từ bản Anh Rabindranath Tagore · tham khảo",
            sourceFile=path, sourceChecked=True, batch=BATCH))
    return rows


ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12,
         "XIII": 13, "XIV": 14, "XV": 15, "XVI": 16, "XVII": 17, "XVIII": 18}


def gita_candidates():
    """Các khổ thơ trong 'The Song Celestial' (Bhagavad Gita) bản Anh Edwin Arnold, 1885 (Project Gutenberg #2388)."""
    lines = gutenberg_body("sources/gita-arnold.txt").split("\n")
    chapter, block, cands = None, [], []

    def flush():
        nonlocal block
        if block and chapter:
            text = " ".join(" ".join(block).split())
            if 120 <= len(text) <= 520:
                cands.append(dict(num=str(chapter), stanza=len([c for c in cands if c["num"] == str(chapter)]) + 1, of=0, text=text))
        block = []

    for l in lines:
        m = re.fullmatch(r"\s*CHAPTER ([IVX]+)\s*", l)
        if m and m[1] in ROMAN:
            flush()
            chapter = ROMAN[m[1]]
        elif l.strip():
            block.append(l.strip())
        else:
            flush()
    flush()
    return cands


def gita():
    path = "sources/gita-arnold.txt"
    cands = gita_candidates()
    rows = []
    for index, vi in read("scripts/gita-vi.json").items():
        c = cands[int(index)]
        rows.append(dict(
            author="Bhagavad Gita", text=c["text"], vi=vi,
            source=f"Bhagavad Gita · chương {c['num']} · bản Anh Edwin Arnold, The Song Celestial (1885)",
            sourceRef=f"gita-arnold:{c['num']}.{c['stanza']}",
            url="https://www.gutenberg.org/ebooks/2388", language="en", kind="excerpt",
            attribution="Bhagavad Gita · lời Krishna dạy Arjuna trong sử thi Mahabharata",
            translationNote="Bản dịch nghĩa tiếng Việt từ bản thơ Anh Edwin Arnold · tham khảo",
            sourceFile=path, sourceChecked=True, batch=BATCH))
    return rows


CANDIDATES = dict(upanishads=upanishad_candidates, kabir=kabir_candidates, gita=gita_candidates)
TRANCHES = [upanishads, kabir, gita]

if len(sys.argv) > 2 and sys.argv[1] == "--list":
    for i, c in enumerate(CANDIDATES[sys.argv[2]]()):
        label = c.get("num", "") + (f".{c['stanza']}/{c['of']}" if "stanza" in c else "")
        print(i, label, len(c["text"]), c["text"][: int(sys.argv[3]) if len(sys.argv) > 3 else 300])
    sys.exit(0)

q = read("dist/wisdom.json")
additions = [row for tranche in TRANCHES for row in tranche()]

seen_vi = {norm(x["vi"]) for x in q}
seen_text = {(x["author"], norm(x.get("text", ""))) for x in q}
seen_ref = {x.get("sourceRef") for x in q if x.get("sourceRef")}
skipped = []
count = sum(x.get("kind") != "reflection" for x in q)
for row in additions:
    # Câu đã có trong một trích đoạn dài hơn (hoặc ngược lại) không phải nội dung mới.
    overlap = any(a == row["author"] and len(t) > 30 and (norm(row["text"]) in t or t in norm(row["text"])) for a, t in seen_text)
    if norm(row["vi"]) in seen_vi or overlap or row["sourceRef"] in seen_ref or count >= TARGET:
        skipped.append(row["sourceRef"])
        continue
    q.append(row)
    count += 1
    seen_vi.add(norm(row["vi"]))
    seen_text.add((row["author"], norm(row["text"])))
    seen_ref.add(row["sourceRef"])

for row in q:
    # Giữ nguyên mã đã gán; mã mới theo tác giả + bản dịch chuẩn hóa (cùng cách với các đợt trước).
    if not row.get("id"):
        row["id"] = identity(row)
write("dist/wisdom.json", q)

active = [x for x in q if x.get("kind") != "reflection"]
stats = dict(
    target=TARGET, totalEntries=len(q), sourcedExcerpts=len(active), editorialReflections=len(q) - len(active),
    remaining=max(0, TARGET - len(active)),
    sourceMatchedNewBatch=sum(x.get("sourceChecked") is True for x in active),
    allTranslationsHumanReviewed=False, complete=len(active) == TARGET,
    countsByAuthor=dict(collections.Counter(x["author"] for x in active)),
    note="Có nguồn không đồng nghĩa với đã thẩm định toàn bộ bản dịch. Dữ liệu cũ cần tiếp tục rà soát. Không tính đoạn thô hoặc lời biên soạn vào mục tiêu trích đoạn.",
)
write("dist/wisdom-status.json", stats)
print(json.dumps(dict(added=len(additions) - len(skipped), skipped=skipped, total=len(q), active=len(active), remaining=stats["remaining"]), ensure_ascii=False))
