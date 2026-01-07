"""KPI Schema Logic."""

import math
from collections import defaultdict
from datetime import timedelta

import graphene
from .kpi_functions.kpi_functions import (
    _aggregate_timeclock_entries,
    _calculate_expected_hours,
    _calculate_expected_work_days,
    _calculate_presence_score,
    _collect_team_members,
    _determine_team_for_user,
)
from django.utils import timezone
from graphql import GraphQLError

from .models import CustomUser, TimeClock
from .schema_team import TeamMemberSnapshotType
from .schema_time_clock import (
    DAYS_PER_YEAR,
    SECONDS_PER_HOUR,
    TEAM_SCORE_DEFAULT_PERIOD_DAYS,
    TEAM_SCORE_MAX_PERIOD_DAYS,
    TimeClockType,
)


class KPIClockDailyTotalType(graphene.ObjectType):
    day = graphene.Date()
    total_seconds = graphene.Float()
    total_hours = graphene.Float()


class KPIClockMetricsType(graphene.ObjectType):
    total_seconds = graphene.Float()
    total_hours = graphene.Float()
    average_hours_per_day = graphene.Float()
    average_hours_per_workday = graphene.Float()
    presence_rate = graphene.Float()
    worked_days = graphene.Int()
    period_days = graphene.Int()
    previous_total_seconds = graphene.Float()
    previous_total_hours = graphene.Float()
    previous_presence_rate = graphene.Float()
    previous_average_hours_per_workday = graphene.Float()
    daily_totals = graphene.List(KPIClockDailyTotalType)


# pyright: ignore[reportCallIssue]
class TimeClockQuery(graphene.ObjectType):
    time_clocks = graphene.List(TimeClockType)
    time_clock = graphene.Field(
        TimeClockType,
        id=graphene.ID(),
        user_id=graphene.ID(required=True),
        day=graphene.Date(),
    )
    kpi_clock = graphene.Field(
        KPIClockMetricsType,
        user_id=graphene.ID(required=False),
        period=graphene.Int(required=True),
    )
    user_team_presence = graphene.List(
        lambda: TeamMemberSnapshotType,
        period=graphene.Int(required=False),
    )

    def resolve_kpi_clock(self, info, user_id=None, period=None):
        user = info.context.user

        if period is None or period <= 0:
            raise GraphQLError("Period need to be a positive integer.")
        if period > DAYS_PER_YEAR:
            raise GraphQLError("Period too long, max is 365 days.")

        if user_id is None:
            if not user or not user.is_authenticated:
                raise GraphQLError("Authentication required")
            user_id = user.id

        try:
            target_user = CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            raise GraphQLError("Requested user does not exist.")

        expected_hours = _calculate_expected_hours(target_user.hour_contract, period)
        expected_work_days = _calculate_expected_work_days(expected_hours, period)
        if expected_work_days is None:
            expected_work_days = period
        expected_seconds = (
            expected_hours * SECONDS_PER_HOUR if expected_hours is not None else None
        )
        has_contract = bool(expected_seconds and expected_seconds > 0)

        today = timezone.localdate()
        start = today - timedelta(days=(period - 1))
        current_entries = TimeClock.objects.filter(
            user_id=user_id,
            day__range=(start, today),
        ).order_by("day", "clock_in")

        current_total_seconds, current_worked_days, current_daily_totals = (
            _aggregate_timeclock_entries(current_entries)
        )

        daily_totals = []
        for offset in range(period):
            current_day = start + timedelta(days=offset)
            seconds = current_daily_totals.get(current_day, 0.0)
            daily_totals.append(
                KPIClockDailyTotalType(
                    day=current_day,  # pyright: ignore[reportCallIssue]
                    total_seconds=round(seconds, 2),  # pyright: ignore[reportCallIssue]
                    total_hours=round(seconds / 3600 if seconds else 0.0, 2),  # pyright: ignore[reportCallIssue]
                )
            )

        previous_end = start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=(period - 1))
        previous_entries = TimeClock.objects.filter(
            user_id=user_id,
            day__range=(previous_start, previous_end),
        ).order_by("day", "clock_in")

        previous_total_seconds, previous_worked_days, _ = _aggregate_timeclock_entries(
            previous_entries
        )

        current_total_hours = current_total_seconds / 3600 if current_total_seconds else 0.0
        current_average_hours_per_day = current_total_hours / period if period else 0.0
        current_average_hours_per_workday = (
            current_total_hours / current_worked_days if current_worked_days else 0.0
        )
        ratio_current = None
        if has_contract:
            ratio_current = (
                current_total_seconds / expected_seconds if expected_seconds else 0.0
            )
            capped_ratio = max(0.0, min(ratio_current, 1.0))
            current_presence_rate = capped_ratio * 100
        else:
            current_presence_rate = (current_worked_days / period) * 100 if period else 0.0

        previous_total_hours = previous_total_seconds / 3600 if previous_total_seconds else 0.0
        ratio_previous = None
        if has_contract:
            ratio_previous = (
                previous_total_seconds / expected_seconds if expected_seconds else 0.0
            )
            capped_previous_ratio = max(0.0, min(ratio_previous, 1.0))
            previous_presence_rate = capped_previous_ratio * 100
        else:
            previous_presence_rate = (previous_worked_days / period) * 100 if period else 0.0
        previous_average_hours = (
            previous_total_hours / previous_worked_days if previous_worked_days else 0.0
        )

        display_worked_days = current_worked_days
        if has_contract:
            capped_ratio = max(0.0, min(ratio_current or 0.0, 1.0))
            display_worked_days = max(
                0,
                min(
                    expected_work_days,
                    math.ceil(expected_work_days * capped_ratio),
                ),
            )
        return KPIClockMetricsType(
            total_seconds=round(current_total_seconds, 2),  # pyright: ignore[reportCallIssue]
            total_hours=round(current_total_hours, 2),  # pyright: ignore[reportCallIssue]
            average_hours_per_day=round(current_average_hours_per_day, 2),  # pyright: ignore[reportCallIssue]
            average_hours_per_workday=round(current_average_hours_per_workday, 2),  # pyright: ignore[reportCallIssue]
            presence_rate=round(current_presence_rate, 2),  # pyright: ignore[reportCallIssue]
            worked_days=display_worked_days,  # pyright: ignore[reportCallIssue]
            period_days=expected_work_days,  # pyright: ignore[reportCallIssue]
            previous_total_seconds=round(previous_total_seconds, 2),  # pyright: ignore[reportCallIssue]
            previous_total_hours=round(previous_total_hours, 2),  # pyright: ignore[reportCallIssue]
            previous_presence_rate=round(previous_presence_rate, 2),  # pyright: ignore[reportCallIssue]
            previous_average_hours_per_workday=round(previous_average_hours, 2),  # pyright: ignore[reportCallIssue]
            daily_totals=daily_totals,  # pyright: ignore[reportCallIssue]
        )

    def resolve_time_clocks(self, info):
        return TimeClock.objects.all().order_by("id")

    def resolve_time_clock(self, info, user_id=None):
        if user_id:
            day = timezone.localdate()
            return TimeClock.objects.filter(user_id=user_id, day=day).first()

    def resolve_user_team_presence(self, info, period=None):
        request_user = info.context.user
        if not request_user or not request_user.is_authenticated:
            raise GraphQLError("Authentication required")

        period_days = period or TEAM_SCORE_DEFAULT_PERIOD_DAYS
        if period_days <= 0:
            raise GraphQLError("Period needs to be a positive integer.")
        if period_days > TEAM_SCORE_MAX_PERIOD_DAYS:
            msg = f"Period too long, max is {TEAM_SCORE_MAX_PERIOD_DAYS} days."
            raise GraphQLError(msg)

        target_team = _determine_team_for_user(request_user)
        if target_team is None:
            return []

        today = timezone.localdate()
        members = _collect_team_members(target_team)

        if not members:
            return []

        member_ids = [member.id for member in members]
        start = today - timedelta(days=(period_days - 1))

        presence_today_ids = set(
            TimeClock.objects.filter(
                user_id__in=member_ids,
                day=today,
                clock_in__isnull=False,
                clock_out__isnull=True,
            ).values_list("user_id", flat=True)
        )

        days_present_map = defaultdict(int)
        for row in (
            TimeClock.objects.filter(
                user_id__in=member_ids,
                day__range=(start, today),
                clock_in__isnull=False,
            )
            .values("user_id", "day")
            .distinct()
        ):
            days_present_map[row["user_id"]] += 1

        snapshots = []
        team_manager_id = getattr(target_team, "team_manager_id", None)
        for member in members:
            presence_today = member.id in presence_today_ids
            score = _calculate_presence_score(
                member,
                period_days,
                days_present_map.get(member.id, 0),
            )
            manages_team = (
                team_manager_id == member.id
                or getattr(member, "team_managed_id", None) == target_team.id
            )
            status = "Manager" if manages_team else "Member"

            snapshots.append(
                TeamMemberSnapshotType(
                    id=member.id,  # pyright: ignore[reportCallIssue]
                    firstname=member.first_name,  # pyright: ignore[reportCallIssue]
                    lastname=member.last_name,  # pyright: ignore[reportCallIssue]
                    status=status,  # pyright: ignore[reportCallIssue]
                    presence=presence_today,  # pyright: ignore[reportCallIssue]
                    score=score,  # pyright: ignore[reportCallIssue]
                )
            )

        return snapshots
