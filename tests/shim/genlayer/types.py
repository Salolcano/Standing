import re


class u256(int):
    pass


class Address:
    def __init__(self, value):
        if isinstance(value, Address):
            value = value.as_hex
        if not re.fullmatch(r"0x[0-9a-fA-F]{40}", str(value)):
            raise ValueError("bad address")
        self._hex = str(value)

    @property
    def as_hex(self):
        return self._hex

    def __str__(self):
        return self._hex

    def __eq__(self, other):
        return isinstance(other, Address) and self._hex.lower() == other._hex.lower()

    def __hash__(self):
        return hash(self._hex.lower())
