"""Test."""


class Test:
    day: str = "default"

    def __init__(self, day: str = day) -> None:
        """Init."""
        self.day = day


a = Test()

print(a.day)
