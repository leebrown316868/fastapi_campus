"""Test targeted notification push filtering."""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.notifications import _filter_target_users


class MockUser:
    def __init__(self, id, grade=None, department=None, major=None):
        self.id = id
        self.grade = grade
        self.department = department
        self.major = major


def make_users():
    return [
        MockUser(1, grade="2024级", department="计算机学院", major="计算机科学与技术"),
        MockUser(2, grade="2024级", department="经管学院", major="工商管理"),
        MockUser(3, grade="2025级", department="计算机学院", major="软件工程"),
        MockUser(4, grade="2023级", department="外语学院", major="英语"),
    ]


class TestFilterTargetUsers:
    def test_empty_targets_returns_all(self):
        users = make_users()
        result = _filter_target_users(users, [], [], [])
        assert len(result) == 4

    def test_none_targets_returns_all(self):
        users = make_users()
        result = _filter_target_users(users, None, None, None)
        assert len(result) == 4

    def test_filter_by_grade(self):
        users = make_users()
        result = _filter_target_users(users, ["2024级"], [], [])
        assert len(result) == 2
        assert {u.id for u in result} == {1, 2}

    def test_filter_by_department(self):
        users = make_users()
        result = _filter_target_users(users, [], ["计算机学院"], [])
        assert len(result) == 2
        assert {u.id for u in result} == {1, 3}

    def test_filter_by_major(self):
        users = make_users()
        result = _filter_target_users(users, [], [], ["英语"])
        assert len(result) == 1
        assert result[0].id == 4

    def test_and_logic_cross_dimensions(self):
        """Targeting grade=2024级 AND dept=计算机学院 -> only user 1 matches both."""
        users = make_users()
        result = _filter_target_users(users, ["2024级"], ["计算机学院"], [])
        assert len(result) == 1
        assert result[0].id == 1

    def test_and_logic_no_match_cross_dimensions(self):
        """Targeting grade=2025级 AND dept=外语学院 -> no one matches both."""
        users = make_users()
        result = _filter_target_users(users, ["2025级"], ["外语学院"], [])
        assert len(result) == 0

    def test_or_logic_within_dimension(self):
        """Targeting grade=2024级 OR 2025级 (same dimension = OR) -> users 1,2,3."""
        users = make_users()
        result = _filter_target_users(users, ["2024级", "2025级"], [], [])
        assert len(result) == 3
        assert {u.id for u in result} == {1, 2, 3}

    def test_no_match_returns_empty(self):
        users = make_users()
        result = _filter_target_users(users, ["2020级"], [], [])
        assert len(result) == 0

    def test_multiple_values_in_field(self):
        users = make_users()
        result = _filter_target_users(users, ["2024级", "2025级"], [], [])
        assert len(result) == 3
        assert {u.id for u in result} == {1, 2, 3}
