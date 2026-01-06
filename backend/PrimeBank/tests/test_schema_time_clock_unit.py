"""Unit tests for `schema_time_clock.py` mutations (moved to central tests folder)."""
from datetime import date, time

import pytest

from graphql import GraphQLError

import os
import django

# Ensure Django settings are configured before importing modules that
# import graphene_django at import-time.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "PrimeBank.settings")
django.setup()

from PrimeBankApp import schema_time_clock


class FakeTC:
    def __init__(self, user_id=None, day=None, clock_in=None, clock_out=None):
        self.user_id = user_id
        self.day = day
        self.clock_in = clock_in
        self.clock_out = clock_out

    def save(self):
        self._saved = True


class FakeManager:
    def __init__(self, objs=None, exists=False, first_obj=None):
        self._map = {getattr(o, 'user_id', None): o for o in (objs or [])}
        self._exists = exists
        self._first = first_obj

    def filter(self, **kwargs):
        class Q:
            def __init__(self, exists, first):
                self._exists = exists
                self._first = first

            def exists(self):
                return self._exists

            def first(self):
                return self._first

        return Q(self._exists, self._first)

    def create(self, **kwargs):
        return FakeTC(**kwargs)


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


def test_clockin_unauthenticated():
    info = make_info(None)
    with pytest.raises(GraphQLError):
        schema_time_clock.ClockIn.mutate(None, info, user_id=1)


def test_clockin_not_authorized(monkeypatch):
    # request_user is not the same as target and not admin
    class U:
        id = 99
        is_authenticated = True
        is_admin = False
        is_superuser = False
        team_managed_id = None

    info = make_info(U)
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': FakeManager(exists=False)}))

    with pytest.raises(GraphQLError):
        schema_time_clock.ClockIn.mutate(None, info, user_id=1)


def test_clockin_already_clocked(monkeypatch):
    class U:
        id = 1
        is_authenticated = True
        is_admin = True
        is_superuser = False
        team_managed_id = None

    info = make_info(U)
    # TimeClock.objects.filter(...).exists() -> True
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': FakeManager(exists=True)}))

    with pytest.raises(GraphQLError):
        schema_time_clock.ClockIn.mutate(None, info, user_id=1)


def test_clockin_success(monkeypatch):
    class U:
        id = 1
        is_authenticated = True
        is_admin = False
        is_superuser = False
        team_managed_id = None

    # request as self
    info = make_info(U)
    # TimeClock.objects.filter.exists() False, create returns FakeTC
    mm = FakeManager(exists=False)
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': mm, 'objects_create': mm.create}))

    res = schema_time_clock.ClockIn.mutate(None, info, user_id=1)
    assert hasattr(res, 'time_clock')


def test_clockout_errors_and_success(monkeypatch):
    class U:
        id = 2
        is_authenticated = True
        is_admin = False
        is_superuser = False
        team_managed_id = None

    # not authorized
    info = make_info(None)
    with pytest.raises(GraphQLError):
        schema_time_clock.ClockOut.mutate(None, info, user_id=2)

    # no timeclock entry
    info = make_info(U)
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': FakeManager(first_obj=None)}))
    with pytest.raises(GraphQLError):
        schema_time_clock.ClockOut.mutate(None, info, user_id=2)

    # already clocked out
    tc = FakeTC(user_id=2, day=date(2025,1,1), clock_in=time(9,0), clock_out=time(17,0))
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': FakeManager(first_obj=tc)}))
    with pytest.raises(GraphQLError):
        schema_time_clock.ClockOut.mutate(None, info, user_id=2)

    # success (no previous clock_out)
    tc2 = FakeTC(user_id=2, day=date(2025,1,1), clock_in=time(9,0), clock_out=None)
    class M2(FakeManager):
        def __init__(self, first_obj):
            super().__init__(first_obj=first_obj)

    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': M2(tc2)}))
    res = schema_time_clock.ClockOut.mutate(None, info, user_id=2)
    assert hasattr(res, 'time_clock')


def test_modify_clock_entry_various_errors_and_success(monkeypatch):
    # prepare requester
    class Req:
        id = 10
        is_authenticated = True
        is_admin = True
        is_superuser = False
        team_managed_id = None

    info = make_info(Req)

    # CustomUser.get raises DoesNotExist
    class CM:
        def get(self, pk):
            raise schema_time_clock.CustomUser.DoesNotExist

    monkeypatch.setattr(schema_time_clock, 'CustomUser', type('C', (), {'objects': CM(), 'DoesNotExist': Exception}))
    with pytest.raises(GraphQLError):
        schema_time_clock.ModifyClockEntry.mutate(None, info, user_id=1, day=date(2025,1,1))

    # Now valid user but no day -> should raise
    class U:
        id = 1
        team_id = None
        is_admin = False
        is_superuser = False
        team_managed_id = None

    class CM2:
        def get(self, pk):
            return U()

    monkeypatch.setattr(schema_time_clock, 'CustomUser', type('C', (), {'objects': CM2(), 'DoesNotExist': Exception}))
    # day is None
    with pytest.raises(GraphQLError):
        schema_time_clock.ModifyClockEntry.mutate(None, info, user_id=1, day=None)

    # user not admin and not manager_of -> should raise
    class NonAdminRequester:
        id = 11
        is_authenticated = True
        is_admin = False
        is_superuser = False
        team_managed_id = None

    info_nonadmin = make_info(NonAdminRequester)
    with pytest.raises(GraphQLError):
        schema_time_clock.ModifyClockEntry.mutate(None, info_nonadmin, user_id=1, day=date(2025,1,1))

    # simulate tc not found
    class Req2:
        id = 10
        is_authenticated = True
        is_admin = True
        is_superuser = False
        team_managed_id = None

    info2 = make_info(Req2)
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': FakeManager(first_obj=None)}))
    # should raise because no TimeClock
    with pytest.raises(GraphQLError):
        schema_time_clock.ModifyClockEntry.mutate(None, info2, user_id=1, day=date(2025,1,1))

    # success path: tc exists and updated
    tc = FakeTC(user_id=1, day=date(2025,1,1), clock_in=time(8,0), clock_out=None)
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': FakeManager(first_obj=tc)}))
    # ensure require_auth doesn't block: pass a requester with is_authenticated True
    res = schema_time_clock.ModifyClockEntry.mutate(None, info2, user_id=1, day=date(2025,1,1), clock_in=time(7,0))
    assert hasattr(res, 'time_clock')


def test_create_request_modify_timeclock_errors_and_success(monkeypatch):
    class User:
        id = 3
        is_authenticated = True
        team_id = None
        is_superuser = False
        team_managed_id = None

    info = make_info(User)
    # user has no team
    with pytest.raises(GraphQLError):
        schema_time_clock.CreateRequestModifyTimeClock.mutate(None, info, day=date(2025,1,1), new_clock_in=time(9,0), new_clock_out=time(17,0))

    # user with team but no TimeClock
    class User2:
        id = 4
        is_authenticated = True
        team_id = 1
        is_superuser = False
        team_managed_id = None

    info2 = make_info(User2)
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': FakeManager(first_obj=None)}))
    with pytest.raises(GraphQLError):
        schema_time_clock.CreateRequestModifyTimeClock.mutate(None, info2, day=date(2025,1,1), new_clock_in=time(9,0), new_clock_out=time(17,0))

    # now tc exists but missing new_clock_in/out -> should raise
    tc = FakeTC(user_id=4, day=date(2025,1,1), clock_in=time(9,0), clock_out=time(17,0))
    monkeypatch.setattr(schema_time_clock, 'TimeClock', type('T', (), {'objects': FakeManager(first_obj=tc)}))
    with pytest.raises(GraphQLError):
        schema_time_clock.CreateRequestModifyTimeClock.mutate(None, info2, day=date(2025,1,1), new_clock_in=None, new_clock_out=None)

    # success: RequestModifyTimeClock.objects.create should be called and returned
    class RMTManager:
        def create(self, **kwargs):
            return object()

    monkeypatch.setattr(schema_time_clock, 'RequestModifyTimeClock', type('R', (), {'objects': RMTManager()}))
    res = schema_time_clock.CreateRequestModifyTimeClock.mutate(None, info2, day=date(2025,1,1), new_clock_in=time(9,0), new_clock_out=time(17,0))
    assert hasattr(res, 'request')
