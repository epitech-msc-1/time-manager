"""Unit tests for `schema_timeclock_export.py` resolver."""
import json
from datetime import date

import pytest
from graphql import GraphQLError

import PrimeBankApp.schema_timeclock_export as schema_timeclock_export


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


def test_resolve_export_time_clock_csv_requires_auth():
    q = schema_timeclock_export.TimeClockExportQuery()
    info = make_info(None)
    with pytest.raises(GraphQLError):
        q.resolve_export_time_clock_csv(info)


def test_resolve_export_time_clock_csv_user_not_found(monkeypatch):
    q = schema_timeclock_export.TimeClockExportQuery()

    class U:
        id = 1
        is_authenticated = True

    info = make_info(U)

    class M:
        def get(self, pk):
            raise schema_timeclock_export.CustomUser.DoesNotExist

    monkeypatch.setattr(schema_timeclock_export, "CustomUser", type("C", (), {"objects": M(), "DoesNotExist": Exception}))

    with pytest.raises(GraphQLError):
        q.resolve_export_time_clock_csv(info, user_id=99)


def test_resolve_export_time_clock_csv_not_authorized(monkeypatch):
    q = schema_timeclock_export.TimeClockExportQuery()

    class Req:
        id = 1
        is_authenticated = True

    class Target:
        id = 2
        team_id = 10

    info = make_info(Req)

    # target exists
    class M:
        def get(self, pk):
            return Target()

    monkeypatch.setattr(schema_timeclock_export, "CustomUser", type("C", (), {"objects": M(), "DoesNotExist": Exception}))
    # manager check -> False
    monkeypatch.setattr(schema_timeclock_export, "is_manager_of", lambda user, team_id: False)

    with pytest.raises(GraphQLError):
        q.resolve_export_time_clock_csv(info, user_id=2)


def test_resolve_export_time_clock_csv_success_self_request():
    q = schema_timeclock_export.TimeClockExportQuery()

    class U:
        id = 1
        is_authenticated = True

    info = make_info(U)

    class Target:
        id = 1
        team_id = None

    class M:
        def get(self, pk):
            return Target()

    schema_timeclock_export.CustomUser = type("C", (), {"objects": M(), "DoesNotExist": Exception})

    res = q.resolve_export_time_clock_csv(info)
    assert res.download_url.startswith("/api/export/timeclock/csv/")
    assert res.filename.startswith("timeclocks_")
    assert res.expires_at is not None