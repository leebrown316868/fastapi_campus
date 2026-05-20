"""
BGE-M3 失物招领匹配效果评估测试。

构造已标注的匹配/不匹配物品对，使用 BGE-M3 嵌入模型 + 余弦相似度
计算语义相似度，按阈值 0.3 判定匹配/未匹配，
输出精确率(Precision)、召回率(Recall)和F1值。

运行方式: cd backend && python -m pytest tests/test_matching_evaluation.py -v -s
"""
import pytest
from app.core.embedding import EmbeddingModel


# ── 测试数据：8对正样本 + 8对负样本 ──

POSITIVE_PAIRS = [
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

SCORE_THRESHOLD = 0.6


def _make_text(item: dict) -> str:
    """拼接物品文本，与业务代码 embedding_service.index_lost_item() 一致。"""
    return f"{item['title']} {item['desc']} {item['location']}"


@pytest.mark.slow
def test_matching_evaluation_bge_m3():
    """
    使用 BGE-M3 嵌入模型对 8 对正样本 + 8 对负样本进行语义匹配评估。

    阈值 0.3 下统计 TP/FP/FN/TN，计算 Precision / Recall / F1，
    验证 BGE-M3 语义匹配在失物招领场景中的效果。
    """
    model = EmbeddingModel()

    all_pairs = POSITIVE_PAIRS + NEGATIVE_PAIRS

    # 批量编码所有源物品和候选物品的文本
    src_texts = [_make_text(p["src"]) for p in all_pairs]
    cand_texts = [_make_text(p["cand"]) for p in all_pairs]
    all_texts = src_texts + cand_texts
    vectors = model.encode_batch(all_texts)

    src_vecs = vectors[: len(all_pairs)]
    cand_vecs = vectors[len(all_pairs):]

    # 计算每对物品的 BGE-M3 余弦相似度
    results = []
    for i, pair in enumerate(all_pairs):
        score = EmbeddingModel.cosine_similarity(src_vecs[i], cand_vecs[i])
        predicted = "匹配" if score >= SCORE_THRESHOLD else "未匹配"
        results.append({
            "id": pair["id"],
            "label": pair["label"],
            "src_title": pair["src"]["title"],
            "cand_title": pair["cand"]["title"],
            "score": score,
            "predicted": predicted,
        })

    # 统计 TP / FP / FN / TN
    tp = sum(1 for r in results if r["label"] == "应匹配" and r["predicted"] == "匹配")
    fp = sum(1 for r in results if r["label"] == "不应匹配" and r["predicted"] == "匹配")
    fn = sum(1 for r in results if r["label"] == "应匹配" and r["predicted"] == "未匹配")
    tn = sum(1 for r in results if r["label"] == "不应匹配" and r["predicted"] == "未匹配")

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    # 正样本 / 负样本统计
    pos_scores = [r["score"] for r in results if r["label"] == "应匹配"]
    neg_scores = [r["score"] for r in results if r["label"] == "不应匹配"]
    pos_mean = sum(pos_scores) / len(pos_scores)
    neg_mean = sum(neg_scores) / len(neg_scores)

    # 打印详细结果
    print("\n" + "=" * 90)
    print("BGE-M3 失物招领语义匹配效果评估")
    print(f"阈值: {SCORE_THRESHOLD}  向量维度: 1024  模型: BAAI/bge-m3")
    print("=" * 90)
    print(f"\n{'ID':<5} {'标签':<10} {'源物品':<18} {'候选物品':<20} {'相似度':<8} {'预测':<6}")
    print("-" * 90)
    for r in results:
        print(f"{r['id']:<5} {r['label']:<10} {r['src_title']:<18} {r['cand_title']:<20} {r['score']:<8.4f} {r['predicted']:<6}")

    print("\n" + "-" * 90)
    print(f"正样本均值: {pos_mean:.4f}  负样本均值: {neg_mean:.4f}  差值: {pos_mean - neg_mean:.4f}")
    print(f"TP={tp}  FP={fp}  FN={fn}  TN={tn}")
    print(f"精确率 (Precision) = {precision:.2%}")
    print(f"召回率 (Recall)    = {recall:.2%}")
    print(f"F1值               = {f1:.2%}")
    print("=" * 90)

    # 断言：F1 应不低于 50%（论文预期）
    assert f1 >= 0.5, f"F1={f1:.2%} 低于 50% 阈值，BGE-M3 匹配效果不达标"
