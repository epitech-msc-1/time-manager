from types import SimpleNamespace
from PrimeBankApp.schema_user import CreateUser

def make_info_stub():
    # Stub le context, ici on le laisse à None pour simuler une requête non authentifiée
    return SimpleNamespace(context=SimpleNamespace(user=None))

def test_create_user_mutation_unit(mocker):
    # Utilisation du model perso User
    mock_user_class = mocker.patch("PrimeBankApp.schema_user.User")

    # Instancie le mock manager et simule un email existant qui return false
    mock_manager = mocker.Mock()
    mock_manager.filter.return_value.exists.return_value = False
    mock_user_class.objects = mock_manager

    # Prépare une instance mock représentant l'utilisateur créé
    # On s'assure que set_password et save existent et ne lèvent pas d'erreur
    mock_user_instance = mocker.Mock()
    mock_user_instance.set_password.return_value = None
    mock_user_instance.save.return_value = None

    mock_user_instance.email = "test@example.com"

    # Quand le code appelle User(...) pour instancier un user, on retourne notre mock_user_instance
    mock_user_class.return_value = mock_user_instance

    # Construire l'objet info que la mutation attend
    info = make_info_stub()

    # Appel direct de la méthode mutate de la mutation CreateUser
    # On fournit les arguments attendus (email, password, ...)
    result = CreateUser.mutate(
        None,
        info,
        email="test@example.com",
        password="secret",
        phone_number="123456",
        first_name="T",
        last_name="U",
    )

    # Assertions : la mutation doit renvoyer un objet contenant
    # l'instance utilisateur créée, avoir appelé set_password et save.
    assert result.user is mock_user_instance
    mock_user_instance.set_password.assert_called_once_with("secret")
    mock_user_instance.save.assert_called_once()