"""Test activity feedback system."""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestActivityFeedbackModel:
    def test_feedback_model_creation(self):
        from app.models.activity_feedback import ActivityFeedback
        f = ActivityFeedback(activity_id=1, user_id=1, rating=4, comment="不错")
        assert f.rating == 4
        assert f.comment == "不错"

    def test_feedback_unique_constraint_exists(self):
        from app.models.activity_feedback import ActivityFeedback
        from sqlalchemy import UniqueConstraint
        args = ActivityFeedback.__table_args__
        if isinstance(args, tuple):
            has_unique = any(isinstance(a, UniqueConstraint) for a in args)
        else:
            has_unique = isinstance(args, UniqueConstraint)
        assert has_unique, "UniqueConstraint should exist on (activity_id, user_id)"

    def test_feedback_rating_range(self):
        from app.models.activity_feedback import ActivityFeedback
        # Ratings should be 1-5
        for rating in [1, 3, 5]:
            f = ActivityFeedback(activity_id=1, user_id=1, rating=rating)
            assert 1 <= f.rating <= 5


class TestFeedbackSchema:
    def test_feedback_create_valid(self):
        from app.schemas.activity_feedback import FeedbackCreate
        fc = FeedbackCreate(rating=3, comment="还行")
        assert fc.rating == 3

    def test_feedback_create_invalid_rating_too_high(self):
        import pytest as pt
        from pydantic import ValidationError
        from app.schemas.activity_feedback import FeedbackCreate
        with pt.raises(ValidationError):
            FeedbackCreate(rating=6)

    def test_feedback_create_invalid_rating_too_low(self):
        import pytest as pt
        from pydantic import ValidationError
        from app.schemas.activity_feedback import FeedbackCreate
        with pt.raises(ValidationError):
            FeedbackCreate(rating=0)

    def test_feedback_aggregation_empty(self):
        from app.schemas.activity_feedback import FeedbackAggregation
        agg = FeedbackAggregation(
            avg_rating=0.0, count=0,
            distribution={"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
            recent_comments=[],
        )
        assert agg.count == 0
        assert agg.avg_rating == 0.0
