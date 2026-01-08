"""Tests unitaires pour la logique de `schema_auth.py`."""
import pytest

from graphql import GraphQLError

import PrimeBankApp.schema_auth as schema_auth


class FakeUser:
    USERNAME_FIELD = "email"

    def __init__(self, **kwargs):
        # Initialise un faux utilisateur avec des attributs dynamiques
        for k, v in kwargs.items():
            setattr(self, k, v)


def test_jwt_payload_with_default_payload(monkeypatch):
    # Cas où le payload par défaut est présent
    monkeypatch.setattr(schema_auth, "_default_payload", lambda user, ctx: {"sub": "ok"})
    user = FakeUser(id=1, email="a@x.com", first_name="A", last_name="B", is_admin=True, team=type("T", (), {"id": 5})(), team_managed=None, hour_contract=35, phone_number="123")
    payload = schema_auth.jwt_payload(user)
    assert payload.get("user_id") == 1
    assert payload.get("email") == "a@x.com"
    assert payload.get("is_admin") is True
    assert payload.get("team_id") == 5


def test_jwt_payload_fallback_on_error(monkeypatch):
    # Simule une exception dans _default_payload et vérifie la présence des clés de secours
    def raise_exc(user, ctx):
        raise Exception("boom")

    monkeypatch.setattr(schema_auth, "_default_payload", raise_exc)
    # S'assure que le handler jwt_settings retourne le nom de la clé username
    monkeypatch.setattr(schema_auth.jwt_settings, "JWT_PAYLOAD_GET_USERNAME_HANDLER", lambda x: (lambda obj: "email"))
    user = FakeUser(id=2, email="b@x.com", first_name="C", last_name="D", is_admin=False, team=None, team_managed=None, hour_contract=None, phone_number=None)
    payload = schema_auth.jwt_payload(user)
    # Le fallback doit inclure username/email et user_id
    assert payload.get("email") == "b@x.com"
    assert payload.get("user_id") == 2