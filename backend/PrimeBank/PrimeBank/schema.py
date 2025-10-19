import graphene
from PrimeBankApp.schema_user import UserQuery, UserMutation
from PrimeBankApp.schema_team import TeamQuery, TeamMutation
from PrimeBankApp.schema_timeClock import TimeClockQuery, TimeClockMutation
from PrimeBankApp.schema_auth import Mutation, AuthDevQuery


class Query(UserQuery, TeamQuery, TimeClockQuery, AuthDevQuery, graphene.ObjectType):
    pass


class Mutation(UserMutation, TeamMutation, TimeClockMutation, Mutation, graphene.ObjectType):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)
