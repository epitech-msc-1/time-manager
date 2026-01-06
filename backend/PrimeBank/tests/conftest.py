import os
import sys
import django


def pytest_configure():
    # Ensure both the project package dir and the backend root are on sys.path
    # so imports like `import PrimeBank` and `import PrimeBankApp` work during tests.
    here = os.path.dirname(__file__)  # .../backend/PrimeBank/tests
    project_dir = os.path.abspath(os.path.join(here, ".."))  # .../backend/PrimeBank
    backend_dir = os.path.abspath(os.path.join(here, "..", ".."))  # .../backend

    if project_dir not in sys.path:
        sys.path.insert(0, project_dir)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    # Use a lightweight test settings module (SQLite in-memory) so TestCase
    # setup does not attempt to connect to the external Postgres 'db' host.
    # The module `PrimeBank.settings_test` is created alongside the real
    # settings and simply overrides DATABASES for tests. Note: the file
    # intentionally does NOT start with `test_` so pytest won't collect it.
    os.environ["DJANGO_SETTINGS_MODULE"] = "PrimeBank.settings_test"

    # Now setup Django.
    django.setup()
