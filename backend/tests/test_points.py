"""Test points system."""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestPointRecordModel:
    def test_point_record_creation(self):
        from app.models.point_record import PointRecord
        r = PointRecord(user_id=1, points=5, reason="registration", activity_id=1)
        assert r.points == 5
        assert r.reason == "registration"
        assert r.user_id == 1

    def test_total_points_on_user_model(self):
        from app.models.user import User
        assert "total_points" in User.__table__.columns

    def test_point_reason_values(self):
        valid_reasons = ["registration", "attendance", "feedback"]
        from app.models.point_record import PointRecord
        for reason in valid_reasons:
            r = PointRecord(user_id=1, points=10, reason=reason)
            assert r.reason == reason


class TestPointRecordSchema:
    def test_point_record_response(self):
        from app.schemas.point_record import PointRecordResponse
        from datetime import datetime
        r = PointRecordResponse(
            id=1, points=5, reason="registration",
            activity_id=1, activity_title="Test Activity",
            created_at=datetime.utcnow(),
        )
        assert r.points == 5

    def test_leaderboard_entry(self):
        from app.schemas.point_record import LeaderboardEntry
        entry = LeaderboardEntry(user_id=1, name="张三", total_points=100, rank=1)
        assert entry.rank == 1
        assert entry.total_points == 100
