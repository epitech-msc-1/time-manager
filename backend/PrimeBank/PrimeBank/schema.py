import graphene
from PrimeBankApp.schema_user import UserQuery, UserMutation
from PrimeBankApp.schema_team import TeamQuery, TeamMutation
from PrimeBankApp.schema_timeClock import TimeClockQuery, TimeClockMutation

class Query(UserQuery, TeamQuery, TimeClockQuery, graphene.ObjectType):
    pass

class Mutation(UserMutation, TeamMutation, TimeClockMutation, graphene.ObjectType):
    pass

schema = graphene.Schema(query=Query, mutation=Mutation)
