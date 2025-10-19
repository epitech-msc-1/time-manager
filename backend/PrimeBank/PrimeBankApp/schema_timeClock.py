import math
import graphene
from graphene_django import DjangoObjectType
from graphql import GraphQLError
from collections import defaultdict
from datetime import datetime, timedelta
from django.utils import timezone
from .models import TimeClock, CustomUser, Team


SECONDS_PER_HOUR = 3600
DAYS_PER_WEEK = 7
DEFAULT_DAILY_WORK_HOURS = 7
TEAM_SCORE_DEFAULT_PERIOD_DAYS = 30
TEAM_SCORE_MAX_PERIOD_DAYS = 365


class TimeClockType(DjangoObjectType):
    class Meta:
        model = TimeClock
        fields = ("id", "user", "day", "clock_in", "clock_out")


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
        if period > 365:
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
                    day=current_day,
                    total_seconds=round(seconds, 2),
                    total_hours=round(seconds / 3600 if seconds else 0.0, 2),
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
            total_seconds=round(current_total_seconds, 2),
            total_hours=round(current_total_hours, 2),
            average_hours_per_day=round(current_average_hours_per_day, 2),
            average_hours_per_workday=round(current_average_hours_per_workday, 2),
            presence_rate=round(current_presence_rate, 2),
            worked_days=display_worked_days,
            period_days=expected_work_days,
            previous_total_seconds=round(previous_total_seconds, 2),
            previous_total_hours=round(previous_total_hours, 2),
            previous_presence_rate=round(previous_presence_rate, 2),
            previous_average_hours_per_workday=round(previous_average_hours, 2),
            daily_totals=daily_totals,
        )

    def resolve_time_clocks(self, info):
        return TimeClock.objects.all().order_by("id")

    def resolve_time_clock(self, info, user_id=None):
        if user_id:
            day = timezone.localdate()
            tc = TimeClock.objects.filter(user_id=user_id, day=day).first()
            if not tc:
                raise GraphQLError(f"No entry user_id={user_id} for the {day}.")
            return tc

    def resolve_user_team_presence(self, info, period=None):
        request_user = info.context.user
        if not request_user or not request_user.is_authenticated:
            raise GraphQLError("Authentication required")

        period_days = period or TEAM_SCORE_DEFAULT_PERIOD_DAYS
        if period_days <= 0:
            raise GraphQLError("Period needs to be a positive integer.")
        if period_days > TEAM_SCORE_MAX_PERIOD_DAYS:
            raise GraphQLError(f"Period too long, max is {TEAM_SCORE_MAX_PERIOD_DAYS} days.")

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
                    id=member.id,
                    firstname=member.first_name,
                    lastname=member.last_name,
                    status=status,
                    presence=presence_today,
                    score=score,
                )
            )

        return snapshots


class ClockIn(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
        day = graphene.Date()

    time_clock = graphene.Field(TimeClockType)

    @classmethod
    def mutate(cls, root, info, user_id, day=None):
        request_user = info.context.user
        if not request_user or not request_user.is_authenticated:
            raise GraphQLError("Authentication required")

        is_self_request = str(request_user.id) == str(user_id)
        is_authorized_proxy = getattr(request_user, "is_admin", False)
        if not (is_self_request or is_authorized_proxy):
            raise GraphQLError("You are not allowed to clock in for this user.")

        day = timezone.localdate()
        # cant create a time clock entry if one already exists for that user on that day
        if TimeClock.objects.filter(user_id=user_id, day=day).exists():
            raise GraphQLError("This user already clocked in today.")
        tc = TimeClock.objects.create(
            user_id=user_id,
            day=day,
            clock_in=timezone.localtime().time(),
            clock_out=None,
        )
        return ClockIn(time_clock=tc)


class ClockOut(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
        day = graphene.Date(required=False)

    time_clock = graphene.Field(TimeClockType)

    @classmethod
    def mutate(cls, root, info, user_id):
        request_user = info.context.user
        if not request_user or not request_user.is_authenticated:
            raise GraphQLError("Authentication required")

        is_self_request = str(request_user.id) == str(user_id)
        is_authorized_proxy = getattr(request_user, "is_admin", False)
        if not (is_self_request or is_authorized_proxy):
            raise GraphQLError("You are not allowed to clock out for this user.")

        day = timezone.localdate()
        tc = TimeClock.objects.filter(user_id=user_id, day=day).first()
        # verification if the user has clocked in today, and didnt clock out yet
        if not tc:
            raise GraphQLError("You have to clock in before clocking out.")
        if tc.clock_out:
            raise GraphQLError("You already clocked out today.")
        tc.clock_out = timezone.localtime().time()
        tc.save()
        return ClockOut(time_clock=tc)


# Mutation to import in schema.py
class TimeClockMutation(graphene.ObjectType):
    clock_in = ClockIn.Field()
    clock_out = ClockOut.Field()


class TeamMemberSnapshotType(graphene.ObjectType):
    id = graphene.ID()
    firstname = graphene.String()
    lastname = graphene.String()
    status = graphene.String()
    presence = graphene.Boolean()
    score = graphene.Int()


def _calculate_expected_hours(hour_contract, period_days):
    if hour_contract is None or hour_contract <= 0 or period_days <= 0:
        return None

    weeks = period_days / DAYS_PER_WEEK
    return hour_contract * weeks


def _calculate_expected_work_days(expected_hours, period_days):
    if expected_hours is None or expected_hours <= 0 or period_days <= 0:
        return None

    expected_days = int(round(expected_hours / DEFAULT_DAILY_WORK_HOURS))
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


def _determine_team_for_user(user):
    managed_team = getattr(user, "team_managed", None)
    if managed_team:
        return managed_team

    return getattr(user, "team", None)


def _collect_team_members(team: Team):
    members = list(team.members.all())
    manager = getattr(team, "team_manager", None)
    if manager:
        members.append(manager)

    unique_members = {member.id: member for member in members if member is not None}
    return sorted(
        unique_members.values(),
        key=lambda user: (user.first_name.lower(), user.last_name.lower()),
    )


def _calculate_presence_score(user: CustomUser, period_days: int, days_present: int) -> int:
    expected_hours = _calculate_expected_hours(user.hour_contract, period_days)
    expected_work_days = _calculate_expected_work_days(expected_hours, period_days)
    denominator = expected_work_days or period_days
    if denominator <= 0:
        return 0

    ratio = days_present / denominator
    capped_ratio = max(0.0, min(ratio, 1.0))
    return int(round(capped_ratio * 100))
