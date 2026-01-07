"""Unit tests for `views_timeclock_export.py` helpers and view."""
from datetime import date, time

import json
import csv

import pytest

from django.http import HttpResponseBadRequest, HttpResponseForbidden

import PrimeBankApp.views_timeclock_export as views_export


def test_duration_seconds_normal_and_overnight():
    d = date(2025, 1, 1)
    t1 = time(9, 0)
    t2 = time(17, 0)
    assert views_export._duration_seconds(d, t1, t2) == 8 * 3600

    # overnight: clock_out earlier -> add one day
    t_in = time(22, 0)
    t_out = time(6, 0)
    assert views_export._duration_seconds(d, t_in, t_out) == 8 * 3600

    # missing times
    assert views_export._duration_seconds(d, None, t_out) == 0.0


def test_authenticate_request_with_jwt_monkeypatched(monkeypatch):
    class Req:
        META = {"HTTP_AUTHORIZATION": "JWT sometoken"}
        COOKIES = {}

    # monkeypatch get_payload & get_user_by_payload to return a fake user
    fake_user = type("U", (), {"id": 1, "is_authenticated": True})()
    monkeypatch.setattr(views_export, "get_payload", lambda token, context=None: {"user_id": 1})
    monkeypatch.setattr(views_export, "get_user_by_payload", lambda payload: fake_user)

    res = views_export._authenticate_request_with_jwt(Req)
    assert res is fake_user

    # no auth header and no cookie -> None
    class Req2:
        META = {}
        COOKIES = {}

    assert views_export._authenticate_request_with_jwt(Req2) is None


def test_export_timeclock_csv_bad_token_and_target(monkeypatch):
    # prepare a request with authenticated user
    class U:
        id = 1
        is_authenticated = True

    req = type("R", (), {"user": U(), "COOKIES": {}, "META": {}})()

    signer = views_export.TimestampSigner()
    # bad json payload -> signature ok but payload invalid
    bad_payload = "not a json"
    token = signer.sign(bad_payload)

    resp = views_export.export_timeclock_csv(req, token)
    # JSON decode error -> BadRequest
    assert isinstance(resp, HttpResponseBadRequest)

    # now create a valid payload but target missing
    payload = {
        "requester_id": "1",
        "target_user_id": "99",
        "start_date": date(2025, 1, 1).isoformat(),
        "end_date": date(2025, 1, 1).isoformat(),
        "sep": ";",
    }
    token2 = signer.sign(json.dumps(payload))

    class M:
        def get(self, pk):
            raise views_export.CustomUser.DoesNotExist

    monkeypatch.setattr(views_export, "CustomUser", type("C", (), {"objects": M(), "DoesNotExist": Exception}))

    resp2 = views_export.export_timeclock_csv(req, token2)
    assert isinstance(resp2, HttpResponseBadRequest)


def test_export_timeclock_csv_success_empty_qs(monkeypatch):
    class U:
        id = 1
        is_authenticated = True

    req = type("R", (), {"user": U(), "COOKIES": {}, "META": {}})()

    payload = {
        "requester_id": "1",
        "target_user_id": "1",
        "start_date": date(2025, 1, 1).isoformat(),
        "end_date": date(2025, 1, 1).isoformat(),
        "sep": ";",
    }
    signer = views_export.TimestampSigner()
    token = signer.sign(json.dumps(payload))

    # target exists
    class Target:
        id = 1
        team_id = None

    class M:
        def get(self, pk):
            return Target()

    monkeypatch.setattr(views_export, "CustomUser", type("C", (), {"objects": M(), "DoesNotExist": Exception}))

    # TimeClock.objects.filter(...).iterator() should yield nothing
    class Q:
        def order_by(self, *args, **kwargs):
            return self

        def iterator(self):
            return iter(())

    class TC:
        objects = type("O", (), {"filter": lambda *args, **kwargs: Q()})

    monkeypatch.setattr(views_export, "TimeClock", TC)

    resp = views_export.export_timeclock_csv(req, token)
    # must be a streaming response and have Content-Disposition
    assert hasattr(resp, "streaming_content")
    assert "Content-Disposition" in resp