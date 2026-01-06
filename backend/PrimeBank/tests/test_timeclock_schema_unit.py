"""Unit tests for `schema_time_clock.py` (unique filename to avoid collisions)."""
from datetime import date, time

import pytest

from graphql import GraphQLError

import os
import django

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
