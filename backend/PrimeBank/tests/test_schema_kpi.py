"""Unit tests for `schema_kpi.py` error and guard branches."""
import pytest

from graphql import GraphQLError

import PrimeBankApp.schema_kpi as schema_kpi


def make_info(user):
    class Ctx:
        pass

    class Info:
        pass

    ctx = Ctx()
    ctx.user = user
    info = Info()
    info.context = ctx
    return info


def test_resolve_kpi_clock_invalid_period():
    q = schema_kpi.TimeClockQuery()
    info = make_info(None)
    with pytest.raises(GraphQLError):
        q.resolve_kpi_clock(info, user_id=1, period=0)


def test_resolve_kpi_clock_period_too_long():
    q = schema_kpi.TimeClockQuery()
    info = make_info(None)
    with pytest.raises(GraphQLError):
        q.resolve_kpi_clock(info, user_id=1, period=schema_kpi.DAYS_PER_YEAR + 1)


def test_resolve_kpi_clock_requires_auth_if_no_user_id():
    q = schema_kpi.TimeClockQuery()
    info = make_info(None)
    with pytest.raises(GraphQLError):
        q.resolve_kpi_clock(info, user_id=None, period=7)


def test_resolve_kpi_clock_user_does_not_exist(monkeypatch):
    q = schema_kpi.TimeClockQuery()
    class U:
        id = 1
        is_authenticated = True

    info = make_info(U)
    # force CustomUser.objects.get to raise
    class M:
        def get(self, pk):
            raise schema_kpi.CustomUser.DoesNotExist

    monkeypatch.setattr(schema_kpi, "CustomUser", type("C", (), {"objects": M(), "DoesNotExist": Exception}))
    with pytest.raises(GraphQLError):
        q.resolve_kpi_clock(info, user_id=99, period=7)


def test_resolve_user_team_presence_guards(monkeypatch):
    q = schema_kpi.TimeClockQuery()
    # unauthenticated
    info = make_info(None)
    with pytest.raises(GraphQLError):
        q.resolve_user_team_presence(info, period=7)

    # invalid period
    class U:
        id = 1
        is_authenticated = True

    info2 = make_info(U)
    # zero is treated as default (falsy), so use a negative value to trigger the validation
    with pytest.raises(GraphQLError):
        q.resolve_user_team_presence(info2, period=-1)

    # period too long
    with pytest.raises(GraphQLError):
        q.resolve_user_team_presence(info2, period=schema_kpi.TEAM_SCORE_MAX_PERIOD_DAYS + 1)

    # team None -> should return empty list
    monkeypatch.setattr(schema_kpi, "_determine_team_for_user", lambda u: None)
    res = q.resolve_user_team_presence(info2, period=7)
    assert res == []