"""Source alignment for Mencius and the literary work Zhuangzi.

The Vietnamese editorial selections are explicit; extraction alone publishes
nothing. The ancient Chinese text, not any modern commentary, is quoted.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
def load(path):
    return json.loads((ROOT/path).read_text())
def norm(text):
    return " ".join(text.split())
def chinese_number(text):
    digits = dict(zip("一二三四五六七八九", range(1,10)))
    if "十" not in text:
        return digits[text]
    a,b = text.split("十")
    return (digits[a] if a else 1)*10 + (digits[b] if b else 0)
def book_label(text):
    for original,vi in {
        "梁惠王":"Lương Huệ Vương", "公孫丑":"Công Tôn Sửu",
        "滕文公":"Đằng Văn Công", "離婁":"Ly Lâu", "萬章":"Vạn Chương",
        "告子":"Cáo Tử", "盡心":"Tận Tâm"
    }.items():
        if original in text:
            return vi + (" thượng" if text.endswith("上") else " hạ")
    raise ValueError(text)

def candidates_mencius():
    text = (ROOT/"sources/mencius-original.txt").read_text()
    marks = list(re.finditer(r"^卷[^\n]+$|^[　 ]+([一二三四五六七八九十]+)$",text,re.M))
    book = "卷之一梁惠王上"
    rows = []
    for m,n in zip(marks,marks[1:]+[None]):
        if m[0].startswith("卷"):
            book=m[0]
            continue
        passage=re.sub(r"\s+","",text[m.end():n.start() if n else text.index("*** END")])
        if passage.startswith("孟子曰：") and 25<=len(passage)<=210 and "譯" not in passage:
            rows.append(dict(book=book,section=m[1],text=passage))
    assert len(rows)==109,"Mencius source structure changed"
    return rows

def candidates_zhuangzi():
    text=(ROOT/"sources/zhuangzi-giles.txt").read_text()
    marks=list(re.finditer(r"^CHAPTER ([IVXLCDM]+)\.$",text,re.M))
    rows=[]
    for m,n in zip(marks,marks[1:]+[None]):
        block=text[m.end():n.start() if n else text.index("*** END")]
        for i,p in enumerate(re.split(r"\n\s*\n",block)):
            if not p or p[0].isspace() or re.match(r"^[A-Z .,;\-]+$",p):
                continue
            passage=norm(p)
            if 80<=len(passage)<=470 and re.search(r"\b(Tao|virtue|knowledge|nature|mind|life|death|wisdom|true|Heaven|perfect|understand)\b",passage,re.I):
                rows.append(dict(chapter=m[1],paragraph=i,text=passage))
    assert len(rows)==611,"Zhuangzi source structure changed"
    return rows

def passages():
    rows=[]
    text=(ROOT/"sources/xunzi-jijie.txt").read_text()
    titles=["勸學篇第一","修身篇第二","不苟篇第三"]
    chapters={i+1:re.sub(r"\s+","",text[text.index(titles[i]):text.index(titles[i+1])]) for i in range(2)}
    for chapter,excerpt,vi in load("scripts/xunzi-vi.json"):
        assert excerpt in chapters[chapter],("Xunzi",chapter,excerpt)
        rows.append(dict(author="Tuân Tử",text=excerpt,vi=vi,language="zh",
            source="Tuân Tử · "+("Khuyến học" if chapter==1 else "Tu thân")+" · bản Tuân Tử tập giải của Vương Tiên Khiêm",
            sourceRef="xunzi-jijie:"+str(chapter),
            url="https://www.gutenberg.org/ebooks/25314",
            sourceFile="sources/xunzi-jijie.txt",
            translationNote="Dịch nghĩa tiếng Việt từ Hán văn · trích chính văn, không trích lời chú giải",
            kind="excerpt",sourceChecked=True,batch="mencius-zhuangzi-2026-10-25"))
    original=candidates_mencius()
    for index,text,vi in load("scripts/mencius-vi.json"):
        parent=original[index]
        assert text in parent["text"],("Mencius",index,text)
        rows.append(dict(author="Mạnh Tử",text=text,vi=vi,language="zh",
            source="Mạnh Tử · "+book_label(parent["book"])+" · chương "+str(chinese_number(parent["section"])),
            sourceRef="mencius:"+parent["book"]+":"+parent["section"],
            url="https://www.gutenberg.org/ebooks/24178",
            sourceFile="sources/mencius-original.txt",
            translationNote="Dịch nghĩa tiếng Việt từ nguyên bản Hán văn · tham khảo",
            kind="excerpt",sourceChecked=True,batch="mencius-zhuangzi-2026-10-25"))
    original=candidates_zhuangzi()
    for index,text,vi in load("scripts/zhuangzi-vi.json"):
        parent=original[index]
        assert norm(text) in parent["text"],("Zhuangzi",index,text)
        rows.append(dict(author="Trang Tử",text=text,vi=vi,language="en",
            attribution="Nam Hoa Kinh · truyền thống gán cho Trang Tử",
            source="Nam Hoa Kinh · chương "+parent["chapter"]+" · đoạn "+str(parent["paragraph"]+1)+" · lời kể / nhân vật trong tác phẩm",
            sourceRef="zhuangzi-giles:"+parent["chapter"]+":"+str(parent["paragraph"]+1),
            url="https://www.gutenberg.org/ebooks/59709",
            sourceFile="sources/zhuangzi-giles.txt",
            translationNote="Dịch nghĩa từ bản H. A. Giles · trích tác phẩm, không xác nhận phát ngôn lịch sử",
            kind="excerpt",sourceChecked=True,batch="mencius-zhuangzi-2026-10-25"))
    return rows

if __name__=="__main__":
    print(json.dumps(passages(),ensure_ascii=False,indent=2))
