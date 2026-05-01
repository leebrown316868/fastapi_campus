"""
TF-IDF失物招领匹配效果评估测试。

构造已标注的匹配/不匹配物品对，运行匹配算法，
计算精确率(Precision)、召回率(Recall)和F1值。

运行方式: cd backend && python -m pytest tests/test_matching_evaluation.py -v -s
"""
import math
import re
from collections import Counter

import pytest


# ── 直接复用匹配算法的纯函数（不依赖数据库）──

def _tokenize(text: str) -> list[str]:
    tokens = []
    segments = re.findall(r'[\u4e00-\u9fff]+|[a-zA-Z0-9]+', text.lower())
    for segment in segments:
        if re.match(r'[\u4e00-\u9fff]+', segment):
            if len(segment) >= 2:
                tokens.extend(segment[i:i + 2] for i in range(len(segment) - 1))
            else:
                tokens.append(segment)
        else:
            tokens.append(segment.lower())
    return tokens


def _compute_tf(token_list: list[str]) -> dict[str, float]:
    if not token_list:
        return {}
    counts = Counter(token_list)
    total = len(token_list)
    return {term: count / total for term, count in counts.items()}


def _compute_idf(documents: list[list[str]]) -> dict[str, float]:
    n = len(documents)
    if n == 0:
        return {}
    df: Counter = Counter()
    for doc in documents:
        for term in set(doc):
            df[term] += 1
    return {term: math.log((1 + n) / (1 + count)) + 1 for term, count in df.items()}


def _compute_tfidf(tf: dict[str, float], idf: dict[str, float]) -> dict[str, float]:
    return {term: tf_val * idf.get(term, 1.0) for term, tf_val in tf.items()}


def _cosine_similarity(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    common_terms = set(vec_a.keys()) & set(vec_b.keys())
    if not common_terms:
        return 0.0
    dot = sum(vec_a[t] * vec_b[t] for t in common_terms)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _location_similarity(loc1: str, loc2: str) -> float:
    if not loc1 or not loc2:
        return 0.0
    a, b = loc1.lower(), loc2.lower()
    if a == b:
        return 1.0
    if a in b or b in a:
        return 0.8
    for sep in ["楼", "室", "层", "区", "栋", "号"]:
        a = a.replace(sep, " ")
        b = b.replace(sep, " ")
    words_a = set(a.split())
    words_b = set(b.split())
    if words_a & words_b:
        return 0.5
    return 0.0


def _text_similarity(text_a: str, text_b: str, corpus: list[str]) -> float:
    all_tokenized = [_tokenize(text_a), _tokenize(text_b)] + [_tokenize(t) for t in corpus]
    idf = _compute_idf(all_tokenized)
    tfidf_a = _compute_tfidf(_compute_tf(all_tokenized[0]), idf)
    tfidf_b = _compute_tfidf(_compute_tf(all_tokenized[1]), idf)
    return _cosine_similarity(tfidf_a, tfidf_b)


def compute_match_score(
    src_title: str, src_desc: str, src_location: str, src_category: str,
    cand_title: str, cand_desc: str, cand_location: str, cand_category: str,
    corpus: list[str] | None = None,
) -> float:
    """计算一对物品的综合匹配分数。"""
    src_text = f"{src_title} {src_desc} {src_location}"
    cand_text = f"{cand_title} {cand_desc} {cand_location}"

    if corpus is None:
        corpus = []

    cosine_sim = _text_similarity(src_text, cand_text, corpus)
    category_match = 1.0 if src_category == cand_category else 0.0
    loc_sim = _location_similarity(src_location, cand_location)

    return 0.4 * category_match + 0.4 * cosine_sim + 0.2 * loc_sim


# ── 测试数据：8对正样本 + 8对负样本 ──

POSITIVE_PAIRS = [
    # (source, candidate, expected: 应该匹配)
    {
        "id": "P1", "label": "应匹配",
        "src": {"title": "白色蓝牙耳机", "desc": "白色蓝牙耳机，右侧耳机掉漆", "location": "图书馆二楼", "category": "电子数码"},
        "cand": {"title": "蓝牙耳机 白色", "desc": "捡到一个白色蓝牙耳机", "location": "图书馆", "category": "电子数码"},
    },
    {
        "id": "P2", "label": "应匹配",
        "src": {"title": "黑色钱包", "desc": "黑色折叠钱包，内有身份证和银行卡", "location": "食堂三楼", "category": "生活用品"},
        "cand": {"title": "钱包 黑色", "desc": "黑色钱包一个，内有证件", "location": "食堂", "category": "生活用品"},
    },
    {
        "id": "P3", "label": "应匹配",
        "src": {"title": "金士顿U盘 32G", "desc": "银色金士顿U盘 容量32G", "location": "教学楼A栋301", "category": "电子数码"},
        "cand": {"title": "U盘 金士顿", "desc": "银色金士顿U盘 32G", "location": "教学楼A栋", "category": "电子数码"},
    },
    {
        "id": "P4", "label": "应匹配",
        "src": {"title": "红色雨伞", "desc": "红色折叠伞", "location": "体育馆", "category": "生活用品"},
        "cand": {"title": "红色雨伞", "desc": "一把红色折叠雨伞", "location": "体育馆入口", "category": "生活用品"},
    },
    {
        "id": "P5", "label": "应匹配",
        "src": {"title": "不锈钢保温杯", "desc": "白色不锈钢保温杯500ml", "location": "图书馆一楼", "category": "生活用品"},
        "cand": {"title": "保温杯", "desc": "白色保温杯 不锈钢材质", "location": "图书馆", "category": "生活用品"},
    },
    {
        "id": "P6", "label": "应匹配",
        "src": {"title": "iPad Air5 蓝色", "desc": "蓝色iPad Air 第五代", "location": "宿舍楼", "category": "电子数码"},
        "cand": {"title": "iPad Air 5 蓝色", "desc": "蓝色平板电脑", "location": "宿舍区", "category": "电子数码"},
    },
    {
        "id": "P7", "label": "应匹配",
        "src": {"title": "高等数学课本", "desc": "同济第七版高等数学上下册", "location": "教学楼B栋", "category": "学习用品"},
        "cand": {"title": "高数教材", "desc": "同济大学高等数学上下册", "location": "教学楼", "category": "学习用品"},
    },
    {
        "id": "P8", "label": "应匹配",
        "src": {"title": "蓝色双肩包", "desc": "耐克蓝色双肩背包", "location": "操场", "category": "生活用品"},
        "cand": {"title": "蓝色双肩背包", "desc": "耐克蓝色背包一个", "location": "操场看台", "category": "生活用品"},
    },
]

NEGATIVE_PAIRS = [
    # (source, candidate, expected: 不应匹配)
    {
        "id": "N1", "label": "不应匹配",
        "src": {"title": "白色蓝牙耳机", "desc": "白色蓝牙耳机", "location": "图书馆", "category": "电子数码"},
        "cand": {"title": "红色雨伞", "desc": "红色折叠伞", "location": "体育馆", "category": "生活用品"},
    },
    {
        "id": "N2", "label": "不应匹配",
        "src": {"title": "黑色钱包", "desc": "黑色折叠钱包", "location": "食堂", "category": "生活用品"},
        "cand": {"title": "金士顿U盘 32G", "desc": "银色U盘", "location": "教学楼", "category": "电子数码"},
    },
    {
        "id": "N3", "label": "不应匹配",
        "src": {"title": "iPhone 15 Pro", "desc": "黑色iPhone", "location": "宿舍", "category": "电子数码"},
        "cand": {"title": "高等数学课本", "desc": "同济高数", "location": "教学楼", "category": "学习用品"},
    },
    {
        "id": "N4", "label": "不应匹配",
        "src": {"title": "不锈钢保温杯", "desc": "白色保温杯", "location": "图书馆", "category": "生活用品"},
        "cand": {"title": "篮球", "desc": "斯伯丁篮球7号", "location": "体育馆", "category": "体育用品"},
    },
    {
        "id": "N5", "label": "不应匹配",
        "src": {"title": "蓝色双肩包", "desc": "耐克背包", "location": "操场", "category": "生活用品"},
        "cand": {"title": "充电宝", "desc": "小米充电宝20000mAh", "location": "图书馆", "category": "电子数码"},
    },
    {
        "id": "N6", "label": "不应匹配",
        "src": {"title": "iPad Air5", "desc": "蓝色iPad", "location": "宿舍", "category": "电子数码"},
        "cand": {"title": "身份证", "desc": "一张身份证", "location": "食堂", "category": "证件"},
    },
    {
        "id": "N7", "label": "不应匹配",
        "src": {"title": "红色雨伞", "desc": "红色折叠伞", "location": "体育馆", "category": "生活用品"},
        "cand": {"title": "笔记本", "desc": "联想笔记本", "location": "教室", "category": "电子数码"},
    },
    {
        "id": "N8", "label": "不应匹配",
        "src": {"title": "校园卡", "desc": "重庆邮电大学校园卡", "location": "食堂一楼", "category": "证件"},
        "cand": {"title": "不锈钢保温杯", "desc": "白色保温杯", "location": "图书馆", "category": "生活用品"},
    },
]


def test_matching_evaluation():
    """运行匹配效果评估，计算P/R/F1。"""
    SCORE_THRESHOLD = 0.1
    all_results = []

    # 正样本：应匹配
    for pair in POSITIVE_PAIRS:
        s, c = pair["src"], pair["cand"]
        score = compute_match_score(
            s["title"], s["desc"], s["location"], s["category"],
            c["title"], c["desc"], c["location"], c["category"],
        )
        predicted = "匹配" if score > SCORE_THRESHOLD else "未匹配"
        all_results.append({
            "id": pair["id"], "label": pair["label"],
            "src_title": s["title"], "cand_title": c["title"],
            "score": score, "predicted": predicted,
        })

    # 负样本：不应匹配
    for pair in NEGATIVE_PAIRS:
        s, c = pair["src"], pair["cand"]
        score = compute_match_score(
            s["title"], s["desc"], s["location"], s["category"],
            c["title"], c["desc"], c["location"], c["category"],
        )
        predicted = "匹配" if score > SCORE_THRESHOLD else "未匹配"
        all_results.append({
            "id": pair["id"], "label": pair["label"],
            "src_title": s["title"], "cand_title": c["title"],
            "score": score, "predicted": predicted,
        })

    # 统计 TP / FP / FN / TN
    tp = sum(1 for r in all_results if r["label"] == "应匹配" and r["predicted"] == "匹配")
    fp = sum(1 for r in all_results if r["label"] == "不应匹配" and r["predicted"] == "匹配")
    fn = sum(1 for r in all_results if r["label"] == "应匹配" and r["predicted"] == "未匹配")
    tn = sum(1 for r in all_results if r["label"] == "不应匹配" and r["predicted"] == "未匹配")

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    # 打印详细结果
    print("\n" + "=" * 80)
    print("TF-IDF失物招领匹配效果评估")
    print("=" * 80)
    print(f"\n{'ID':<5} {'标签':<8} {'源物品':<20} {'候选物品':<20} {'得分':<8} {'预测':<6}")
    print("-" * 80)
    for r in all_results:
        print(f"{r['id']:<5} {r['label']:<8} {r['src_title']:<20} {r['cand_title']:<20} {r['score']:<8.4f} {r['predicted']:<6}")

    print("\n" + "-" * 80)
    print(f"TP={tp}  FP={fp}  FN={fn}  TN={tn}")
    print(f"精确率 (Precision) = {precision:.2%}")
    print(f"召回率 (Recall)    = {recall:.2%}")
    print(f"F1值               = {f1:.2%}")
    print(f"准确率 (Accuracy)  = {(tp + tn) / len(all_results):.2%}")
    print("=" * 80)

    # 断言：F1应不低于0.5
    assert f1 >= 0.5, f"F1={f1:.2%} 低于50%阈值，匹配效果不达标"
