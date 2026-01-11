from types import SimpleNamespace

from PrimeBankApp.schema_team import CreateTeam


def make_info_with_admin():
    # Retourne un objet info avec un utilisateur admin authentifié
    user = SimpleNamespace(is_authenticated=True, is_admin=True)
    return SimpleNamespace(context=SimpleNamespace(user=user))


def test_create_team_mutation_unit(mocker):
    # Patch la classe Team utilisée dans le module schema_team
    mock_team_class = mocker.patch("PrimeBankApp.schema_team.Team")

    # Prépare l'objet team retourné par Team.objects.create
    mock_team = mocker.Mock()

    # Simule Team.objects.create(...) -> mock_team
    mock_team_class.objects.create.return_value = mock_team

    # Crée un info simulant un utilisateur admin authentifié
    info = make_info_with_admin()

    # Appel de la mutation CreateTeam
    result = CreateTeam.mutate(None, info, description="My new team")

    # La mutation doit renvoyer l'objet team créé
    assert result.team is mock_team

    # Après la création, la mutation fixe nr_members = 0 pour le type GraphQL
    assert getattr(mock_team, "nr_members", None) == 0

    # Vérifie que Team.objects.create a été appelé avec le bon argument
    mock_team_class.objects.create.assert_called_once_with(description="My new team")
