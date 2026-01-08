"""Tests unitaires pour les branches d'erreur et de garde de `schema_kpi.py`."""
import pytest

from graphql import GraphQLError

import PrimeBankApp.schema_kpi as schema_kpi


def make_info(user):
    # Fabrique un objet info simulant le contexte GraphQL avec un user donné
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
    # Vérifie qu'une période invalide lève une erreur
    q = schema_kpi.TimeClockQuery()
    info = make_info(None)
    with pytest.raises(GraphQLError):
        q.resolve_kpi_clock(info, user_id=1, period=0)


def test_resolve_kpi_clock_period_too_long():
    # Vérifie qu'une période trop longue lève une erreur
    q = schema_kpi.TimeClockQuery()
    info = make_info(None)
    with pytest.raises(GraphQLError):
        q.resolve_kpi_clock(info, user_id=1, period=schema_kpi.DAYS_PER_YEAR + 1)


def test_resolve_kpi_clock_requires_auth_if_no_user_id():
    # Vérifie qu'une authentification est requise si user_id n'est pas fourni
    q = schema_kpi.TimeClockQuery()
    info = make_info(None)
    with pytest.raises(GraphQLError):
        q.resolve_kpi_clock(info, user_id=None, period=7)


def test_resolve_kpi_clock_user_does_not_exist(monkeypatch):
    # Vérifie que l'erreur est levée si l'utilisateur n'existe pas
    q = schema_kpi.TimeClockQuery()
    class U:
        id = 1
        is_authenticated = True

    info = make_info(U)
    # Force CustomUser.objects.get à lever une exception
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