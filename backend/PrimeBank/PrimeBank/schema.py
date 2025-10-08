import graphene

class Query(graphene.ObjectType):
    test = graphene.String()

    def resolve_test(root, info):
        return "Hello, PrimeBank!"

schema = graphene.Schema(query=Query) 
