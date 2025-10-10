import graphene 
from graphene_django import DjangoObjectType
from django.db.models import Count
from graphql import GraphQLError
from .models import TimeClock  
from django.utils import timezone


class TimeClockType(DjangoObjectType):

    class Meta:
        model = TimeClock
        fields = ("id", "user", "day", "clock_in", "clock_out")


# Query to import in schema.py
class TimeClockQuery(graphene.ObjectType):
    time_clocks = graphene.List(TimeClockType)
    time_clock = graphene.Field(
        TimeClockType,
        id=graphene.ID(required=False),
        user_id=graphene.ID(required=False),
        day=graphene.Date(required=False),
    )

    def resolve_time_clocks(self, info):
        return TimeClock.objects.all().order_by("id")
    

    def resolve_time_clock(self, info, user_id=None):
        if user_id:
            from django.utils import timezone
            day = timezone.localdate()  
            tc = TimeClock.objects.filter(user_id=user_id, day=day).first()
            if not tc:
                raise GraphQLError(f"No entry user_id={user_id} for the {day}.")
            return tc


class ClockIn(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
        # if you provide a date, it will use it, otherwise it will use today's date
        day = graphene.Date()

    time_clock = graphene.Field(TimeClockType)

    @classmethod
    def mutate(cls, root, info, user_id, day=None):
        # if day isn't provided, use today's date
        day = timezone.localdate()
        # cant create a time clock entry if one already exists for that user on that day
        if TimeClock.objects.filter(user_id=user_id, day=day).exists():
            raise GraphQLError("This user already clocked in today.")
        tc = TimeClock.objects.create(
            user_id=user_id,
            day=day,
            clock_in=timezone.now(),
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
        tc.clock_out = timezone.now()
        tc.save()
        return ClockOut(time_clock=tc)
    

# Mutation to import in schema.py   
class TimeClockMutation(graphene.ObjectType):
    clock_in = ClockIn.Field()
    clock_out = ClockOut.Field()