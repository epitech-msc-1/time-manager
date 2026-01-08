from types import SimpleNamespace

from PrimeBankApp.schema_team import SetTeamManager, AddUserToTeam


def make_info_admin():
    # Le requérant est authentifié et admin
    # Inclut is_superuser pour coller aux attributs utilisés en prod par is_admin()
    return SimpleNamespace(
        context=SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, is_admin=True, is_superuser=False)
        )
    )


def make_info_manager(team_id: int):
    # Le requérant est authentifié et manager de l'équipe team_id
    # Inclut is_superuser pour coller aux attributs utilisés en prod par is_admin()
    return SimpleNamespace(
        context=SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, is_admin=False, is_superuser=False, team_managed_id=team_id)
        )
    )


def test_set_team_manager_by_admin(mocker):
    # Patch les modèles utilisés dans le module testé
    mock_team_class = mocker.patch("PrimeBankApp.schema_team.Team")
    mock_user_class = mocker.patch("PrimeBankApp.schema_team.CustomUser")

    # Prépare une équipe avec un manager actuel
    current_manager = mocker.Mock()
    current_manager.id = 5
    current_manager.team_managed = mocker.Mock()
    current_manager.save = mocker.Mock()

    mock_team = mocker.Mock()
    mock_team.id = 10
    # team.team_manager retourne le manager actuel
    mock_team.team_manager = current_manager
    mock_team_class.objects.get.return_value = mock_team

    # Prépare le nouveau manager
    new_manager = mocker.Mock()
    new_manager.id = 2
    new_manager.save = mocker.Mock()
    mock_user_class.objects.get.return_value = new_manager

    info = make_info_admin()

    # Appel de la mutation
    result = SetTeamManager.mutate(None, info, team_id=mock_team.id, manager_user_id=new_manager.id)

    # Vérifie les valeurs de retour
    assert result.ok is True
    assert result.team_id_out == mock_team.id
    assert result.manager_user_id_out == new_manager.id

    # L'ancien manager doit être unset et sauvegardé
    assert current_manager.team_managed is None
    current_manager.save.assert_called_once()

    # Le nouveau manager doit avoir team_managed défini sur l'équipe et être sauvegardé
    assert new_manager.team_managed is mock_team
    new_manager.save.assert_called_once()


def test_add_user_to_team_by_admin_and_manager(mocker):
    # Patch les modèles utilisés dans le module testé
    mock_user_class = mocker.patch("PrimeBankApp.schema_team.CustomUser")
    mock_team_class = mocker.patch("PrimeBankApp.schema_team.Team")

    # Prépare l'utilisateur à ajouter
    user_to_add = mocker.Mock()
    user_to_add.is_admin = False
    # Au départ, l'utilisateur n'a pas d'équipe
    user_to_add.team_id = None
    user_to_add.save = mocker.Mock()
    mock_user_class.objects.get.return_value = user_to_add

    # Prépare l'équipe
    mock_team = mocker.Mock()
    # members.count() doit retourner un nombre ; on simule 3 membres après ajout
    mock_team.members.count.return_value = 3
    mock_team_class.objects.get.return_value = mock_team

    # --- Admin ajoute l'utilisateur ---
    info_admin = make_info_admin()
    result_admin = AddUserToTeam.mutate(None, info_admin, user_id=1, team_id=10)

    # La mutation doit retourner l'objet équipe
    assert result_admin.team is mock_team
    # user.team doit être défini et save appelé
    assert user_to_add.team is mock_team
    user_to_add.save.assert_called()
    # nr_members doit être défini à partir de members.count()
    assert getattr(mock_team, "nr_members", None) == mock_team.members.count.return_value

    # Reset des mocks pour le cas manager
    user_to_add.save.reset_mock()
    mock_team.nr_members = None

    # --- Manager (manager de l'équipe 10) ajoute l'utilisateur ---
    info_manager = make_info_manager(team_id=10)
    result_manager = AddUserToTeam.mutate(None, info_manager, user_id=1, team_id=10)

    assert result_manager.team is mock_team
    assert user_to_add.team is mock_team
    user_to_add.save.assert_called()
    assert getattr(mock_team, "nr_members", None) == mock_team.members.count.return_value
