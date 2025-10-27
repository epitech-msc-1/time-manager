"""
GraphQL schema for TimeClock management.

This module provides GraphQL types, queries and mutations for:
- TimeClock entries (clock in/out operations)
- RequestModifyTimeClock (modification requests)
- Clock entry modifications by admins/managers
- Request approval/rejection workflows
"""

import graphene
from django.utils import timezone
from graphene_django import DjangoObjectType
from graphql import GraphQLError

from PrimeBankApp.models import CustomUser, RequestModifyTimeClock, TimeClock

from .roles import is_admin, is_manager_of, require_auth

DAYS_PER_YEAR = 365
SECONDS_PER_HOUR = 3600
DAYS_PER_WEEK = 7
DEFAULT_DAILY_WORK_HOURS = 7
TEAM_SCORE_DEFAULT_PERIOD_DAYS = 30
TEAM_SCORE_MAX_PERIOD_DAYS = 365


class RequestModifyTimeClockType(DjangoObjectType):
    class Meta:
        model = RequestModifyTimeClock
        fields = (
            "id",
            "user",
            "current_date",
            "day",
            "description",
            "old_clock_in",
            "old_clock_out",
            "new_clock_in",
            "new_clock_out",
        )


class ModifyClockQuery(graphene.ObjectType):
    all_requests = graphene.List(RequestModifyTimeClockType)

    def resolve_all_requests(root, info):
        return RequestModifyTimeClock.objects.all().order_by("-current_date")


class TimeClockType(DjangoObjectType):
    class Meta:
        model = TimeClock
        fields = ("id", "user", "day", "clock_in", "clock_out")


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
        return ClockIn(time_clock=tc)  # pyright: ignore[reportCallIssue]


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
        return ClockOut(time_clock=tc)  # pyright: ignore[reportCallIssue]


class ModifyClockEntry(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
        day = graphene.Date(required=False)
        clock_in = graphene.Time(required=False)
        clock_out = graphene.Time(required=False)

    time_clock = graphene.Field(TimeClockType)

    @classmethod
    def mutate(cls, root, info, user_id, day=None, clock_in=None, clock_out=None):
        user = info.context.user
        require_auth(user)
        try:
            u = CustomUser.objects.get(pk=user_id)
            u_team = getattr(u, "team_id", None)
        except CustomUser.DoesNotExist:
            raise GraphQLError("User not found.")

        if day is None:
            raise GraphQLError("Day is required to modify clock entry")

        if not (is_admin(user) or is_manager_of(user, u_team)):
            raise GraphQLError(
                "Not authorized to modify clock entry for this user. You are not admin or manager of the user's team."
            )

        if u.is_admin and not is_admin(user):
            raise GraphQLError("Managers cannot modify admin clock entry.")

        tc = TimeClock.objects.filter(user_id=user_id, day=day).first()
        if not tc:
            raise GraphQLError(f"No TimeClock entry for user {user_id} on {day}.")
        if clock_in is not None:
            tc.clock_in = clock_in
        if clock_out is not None:
            tc.clock_out = clock_out

        tc.save()
        return ModifyClockEntry(time_clock=tc)  # pyright: ignore[reportCallIssue]


class CreateRequestModifyTimeClock(graphene.Mutation):
    class Arguments:
        day = graphene.Date(required=True)
        description = graphene.String(required=False)
        new_clock_in = graphene.Time(required=True)
        new_clock_out = graphene.Time(required=True)

    request = graphene.Field(RequestModifyTimeClockType)

    @classmethod
    def mutate(cls, root, info, day, description=None, new_clock_in=None, new_clock_out=None):
        user = info.context.user
        require_auth(user)

        team_id = getattr(user, "team_id", None)
        if team_id is None:
            raise GraphQLError("User does not belong to any team.")

        tc = TimeClock.objects.filter(user_id=user.id, day=day).first()
        if not tc:
            raise GraphQLError(f"No TimeClock entry for user {user.id} on {day}.")

        if new_clock_in is None or new_clock_out is None:
            raise GraphQLError("Both new_clock_in and new_clock_out are required.")
        rmtc = RequestModifyTimeClock.objects.create(
            user=user,
            day=day,
            description=description,
            new_clock_in=new_clock_in,
            new_clock_out=new_clock_out,
        )
        return CreateRequestModifyTimeClock(request=rmtc)  # pyright: ignore[reportCallIssue]


class AcceptedChangeRequest(graphene.Mutation):
    class Arguments:
        request_id = graphene.ID(required=True)
        accepted = graphene.Boolean(required=True)

    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, request_id, accepted):
        user = info.context.user
        require_auth(user)
        try:
            rmtc = RequestModifyTimeClock.objects.get(pk=request_id)
        except RequestModifyTimeClock.DoesNotExist:
            raise GraphQLError("RequestModifyTimeClock not found.")

        user_team = getattr(rmtc.user, "team_id", None)
        if not (is_admin(user) or is_manager_of(user, int(user_team))):
            raise GraphQLError("Not authorized to accept this request.")

        if accepted == True:
            tc = TimeClock.objects.filter(user_id=rmtc.user.id, day=rmtc.day).first()  # pyright: ignore[reportCallIssue]
            if not tc:
                raise GraphQLError(f"No TimeClock entry for user {rmtc.user.id} on {rmtc.day}.")
            tc.clock_in = rmtc.new_clock_in
            tc.clock_out = rmtc.new_clock_out
            tc.save()
            rmtc.delete()
            return AcceptedChangeRequest(message="Change request accepted and applied.")
        else:
            rmtc.delete()
            return AcceptedChangeRequest(message="Change request rejected and deleted.")


# Mutation to import in schema.py
class TimeClockMutation(graphene.ObjectType):
    clock_in = ClockIn.Field()
    clock_out = ClockOut.Field()
    modify_clock_entry = ModifyClockEntry.Field()
    create_request_modify_time_clock = CreateRequestModifyTimeClock.Field()
    accepted_change_request = AcceptedChangeRequest.Field()
