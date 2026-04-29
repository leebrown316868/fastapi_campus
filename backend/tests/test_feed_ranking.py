"""Test feed personalized ranking."""
import pytest
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.feed import _score_item


class MockUser:
    def __init__(self, grade=None, department=None, major=None):
        self.grade = grade
        self.department = department
        self.major = major


def make_item(item_type="notification", hours_ago=1, match_level=0, is_important=False):
    created = datetime.utcnow() - timedelta(hours=hours_ago)
    return {
        "id": f"{item_type}-1",
        "type": item_type,
        "tag": "重要" if is_important else "通知",
        "created_at": created.isoformat(),
        "_match_level": match_level,
    }


class TestScoreItem:
    def test_anonymous_user_gets_recency_only(self):
        item = make_item(hours_ago=1)
        score = _score_item(item, None)
        assert score > 0

    def test_newer_items_score_higher_anonymous(self):
        old = make_item(hours_ago=100)
        new = make_item(hours_ago=1)
        assert _score_item(new, None) > _score_item(old, None)

    def test_matched_item_scores_higher(self):
        user = MockUser(grade="2024级")
        item_matched = make_item(match_level=1)
        item_unmatched = make_item(match_level=0)
        assert _score_item(item_matched, user) > _score_item(item_unmatched, user)

    def test_important_gets_boost(self):
        user = MockUser()
        important = make_item(is_important=True)
        normal = make_item(is_important=False)
        important["_match_level"] = 0
        normal["_match_level"] = 0
        assert _score_item(important, user) > _score_item(normal, user)

    def test_double_match_beats_single(self):
        user = MockUser(grade="2024级")
        single = make_item(match_level=1)
        double = make_item(match_level=2)
        assert _score_item(double, user) > _score_item(single, user)

    def test_recency_beats_old_match(self):
        user = MockUser(grade="2024级")
        recent_unmatched = make_item(hours_ago=0.1, match_level=0)
        old_matched = make_item(hours_ago=240, match_level=2)  # 10 days old
        assert _score_item(recent_unmatched, user) > _score_item(old_matched, user)
