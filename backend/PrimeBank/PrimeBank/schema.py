import graphene
from PrimeBankApp.schema_auth import AuthDevQuery, Mutation
from PrimeBankApp.schema_team import TeamMutation, TeamQuery
from PrimeBankApp.schema_time_clock import TimeClockMutation, ModifyClockQuery
from PrimeBankApp.schema_user import UserMutation, UserQuery
from PrimeBankApp.schema_kpi import TimeClockQuery


class Query(
    UserQuery, TeamQuery, TimeClockQuery, AuthDevQuery, ModifyClockQuery, graphene.ObjectType
):
    pass


class Mutation(UserMutation, TeamMutation, TimeClockMutation, Mutation, graphene.ObjectType):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)
