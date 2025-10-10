import graphene
from PrimeBankApp.schema_user import UserQuery, UserMutation
from PrimeBankApp.schema_team import TeamQuery, TeamMutation

class Query(UserQuery, TeamQuery, graphene.ObjectType):
    pass

class Mutation(UserMutation, TeamMutation, graphene.ObjectType):
    pass

schema = graphene.Schema(query=Query, mutation=Mutation)
