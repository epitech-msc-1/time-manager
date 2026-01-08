"""Tests unitaires pour les fonctions utilitaires KPI (nom de fichier consolidé pour éviter les collisions d'import)."""
from datetime import date, time

import pytest

from PrimeBankApp.kpi_functions.kpi_functions import (
    _aggregate_timeclock_entries,
    _calculate_expected_hours,
    _calculate_expected_work_days,
    _calculate_presence_score,
    _collect_team_members,
    _determine_team_for_user,
)


def test_calculate_expected_hours_and_work_days_edge_cases():
    # Cas limites pour le calcul des heures et jours attendus
    assert _calculate_expected_hours(None, 7) is None
    assert _calculate_expected_hours(35, 0) is None
    assert _calculate_expected_hours(-1, 7) is None
    assert _calculate_expected_hours(35, 14) == 70
    assert _calculate_expected_work_days(70, 14) == 10


def test_aggregate_timeclock_entries_normal_and_overnight():
    # Teste l'agrégation d'entrées normales et de nuit
    class Entry:
        def __init__(self, day, clock_in, clock_out):
            self.day = day
            self.clock_in = clock_in
            self.clock_out = clock_out

    e1 = Entry(date(2025, 1, 1), time(9, 0, 0), time(17, 0, 0))
    e2 = Entry(date(2025, 1, 2), time(22, 0, 0), time(2, 0, 0))
    total_seconds, worked_days, totals = _aggregate_timeclock_entries([e1, e2])
    assert int(total_seconds) == (8 + 4) * 3600
    assert worked_days == 2
    assert len(totals) == 2


def test_determine_team_for_user_and_collect_members():
    # Teste la détermination de l'équipe d'un utilisateur et la collecte des membres
    class User:
        def __init__(self, id_, first_name, last_name):
            self.id = id_
            self.first_name = first_name
            self.last_name = last_name

    manager = User(1, "Anna", "Smith")
    member = User(2, "Bob", "Jones")

    class Team:
        def __init__(self, members_list, manager=None):
            self._members = members_list
            self.team_manager = manager

        class MembersQuery:
            def __init__(self, members):
                self._members = members

            def all(self):
                return self._members

        @property
        def members(self):
            return Team.MembersQuery(self._members)

    team = Team([member], manager=manager)
    collected = _collect_team_members(team)
    assert len(collected) == 2
    assert collected[0].first_name.lower() <= collected[1].first_name.lower()

    class UserWithTeam:
        def __init__(self, team=None, team_managed=None):
            self.team = team
            self.team_managed = team_managed

    u1 = UserWithTeam(team=team)
    assert _determine_team_for_user(u1) == team
    u2 = UserWithTeam(team=None, team_managed=team)
    assert _determine_team_for_user(u2) == team


def test_calculate_presence_score():
    class User:
        def __init__(self, hour_contract):
            self.hour_contract = hour_contract

    user = User(35)
    score = _calculate_presence_score(user, period_days=7, days_present=4)
    assert score == 80
    score2 = _calculate_presence_score(user, period_days=7, days_present=10)
    assert score2 == 100
