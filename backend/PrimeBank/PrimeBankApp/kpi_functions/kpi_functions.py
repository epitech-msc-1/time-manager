"""KPI Functions."""

from collections import defaultdict
from datetime import datetime, timedelta

from typing import Any

# Keep small numeric constants local so this module can be imported in
# unit tests without pulling in Graphene/Django at import time.
DAYS_PER_WEEK = 7
DEFAULT_DAILY_WORK_HOURS = 7


def _calculate_expected_hours(hour_contract, period_days):
    if hour_contract is None or hour_contract <= 0 or period_days <= 0:
        return None

    weeks = period_days / DAYS_PER_WEEK
    return hour_contract * weeks


def _calculate_expected_work_days(expected_hours, period_days):
    if expected_hours is None or expected_hours <= 0 or period_days <= 0:
        return None

    expected_days = round(expected_hours / DEFAULT_DAILY_WORK_HOURS)
    expected_days = max(1, expected_days)
    return min(period_days, expected_days)


def _aggregate_timeclock_entries(entries):
    totals = defaultdict(float)

    for entry in entries:
        if not entry.clock_in or not entry.clock_out:
            continue

        start_dt = datetime.combine(entry.day, entry.clock_in)
        end_dt = datetime.combine(entry.day, entry.clock_out)

        # handle overnight shifts
        if end_dt < start_dt:
            end_dt += timedelta(days=1)

        totals[entry.day] += (end_dt - start_dt).total_seconds()

    total_seconds = sum(totals.values())
    worked_days = sum(1 for seconds in totals.values() if seconds > 0)

    return total_seconds, worked_days, totals


def _determine_team_for_user(user: Any):
    managed_team = getattr(user, "team_managed", None)
    if managed_team:
        return managed_team

    return getattr(user, "team", None)


def _collect_team_members(team: Any):
    members = list(team.members.all())
    manager = getattr(team, "team_manager", None)
    if manager:
        members.append(manager)

    unique_members = {member.id: member for member in members if member is not None}
    return sorted(
        unique_members.values(),
        key=lambda user: (user.first_name.lower(), user.last_name.lower()),
    )


def _calculate_presence_score(user: Any, period_days: int, days_present: int) -> int:
    expected_hours = _calculate_expected_hours(user.hour_contract, period_days)
    expected_work_days = _calculate_expected_work_days(expected_hours, period_days)
    denominator = expected_work_days or period_days
    if denominator <= 0:
        return 0

    ratio = days_present / denominator
    capped_ratio = max(0.0, min(ratio, 1.0))
    return round(capped_ratio * 100)
