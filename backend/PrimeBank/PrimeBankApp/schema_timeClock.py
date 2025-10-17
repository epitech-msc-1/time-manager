import graphene 
from graphene_django import DjangoObjectType
from django.db.models import Count
from graphql import GraphQLError
from .models import TimeClock  
from django.utils import timezone
from datetime import timedelta, datetime

class TimeClockType(DjangoObjectType):

    class Meta:
        model = TimeClock
        fields = ("id", "user", "day", "clock_in", "clock_out")


# Query to import in schema.py
class TimeClockQuery(graphene.ObjectType):
    time_clocks = graphene.List(TimeClockType)
    time_clock = graphene.Field(
        TimeClockType,
        id=graphene.ID(),
        user_id=graphene.ID(required=True),
        day=graphene.Date(),
    )
    kpi_clock = graphene.Float(
        user_id=graphene.ID(required=False),
        period=graphene.Int(required=False)
    )

    def resolve_kpi_clock(self, info, user_id=None, period=None):
        user = info.context.user

        # check if the period is valid
        if period is None or period <= 0:
            raise GraphQLError("Period need to be a positive integer.")
        if period > 365:
            raise GraphQLError("Period too long, max is 365 days.")

        # We do that to allow user to fetch there own data if no user_id is provided
        if user_id is None:
            if not user or not user.is_authenticated:
                raise GraphQLError("Authentication required")
            user_id = user.id

        # Calculate the date range, between the start date and today 
        today = timezone.localdate()
        start = today - timedelta(days=(period - 1))

        tcl = TimeClock.objects.filter(
            user_id=user_id, 
            day__range=(start, today)
        ).order_by("day", "clock_in")
        
        count = 0

        for entry in tcl:
            if not entry.clock_in or not entry.clock_out:
                    continue
            
            start_dt = datetime.combine(entry.day, entry.clock_in)
            end_dt = datetime.combine(entry.day, entry.clock_out)

            # handle overnight shifts
            if end_dt < start_dt:
                end_dt += timedelta(days=1)

            count += (end_dt - start_dt).total_seconds() / 3600.0

        return round(count, 2)

    def resolve_time_clocks(self, info):
        return TimeClock.objects.all().order_by("id")
    

    def resolve_time_clock(self, info, user_id=None):
        if user_id:
            day = timezone.localdate()  
            tc = TimeClock.objects.filter(user_id=user_id, day=day).first()
            if not tc:
                raise GraphQLError(f"No entry user_id={user_id} for the {day}.")
            return tc


class ClockIn(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
        day = graphene.Date()

    time_clock = graphene.Field(TimeClockType)

    @classmethod
    def mutate(cls, root, info, user_id, day=None):
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