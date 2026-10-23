"""A small stand-in for the genlayer SDK, so the contract's logic can be run
with nothing but Python. It models only what contracts/standing.py touches.
It is not GenVM: consensus, storage persistence and gas are not simulated."""
import re
import typing


class UserError(Exception):
    pass


class _Vm:
    UserError = UserError


vm = _Vm()


class _Storage:
    class TreeMap(dict):
        def __class_getitem__(cls, item):
            return cls

    class DynArray(list):
        def __class_getitem__(cls, item):
            return cls


storage = _Storage()


class _Message:
    def __init__(self):
        self.value = 0
        self.sender_address = None
        self.datetime = None


message = _Message()
message_raw = {"datetime": "2026-10-18T10:00:00Z"}


class _Contract:
    pass


class _Public:
    @staticmethod
    def view(fn):
        fn._gl = "view"
        return fn

    class _Write:
        def __call__(self, fn):
            fn._gl = "write"
            return fn

        @staticmethod
        def payable(fn):
            fn._gl = "payable"
            return fn

    write = _Write()


class _ContractNs:
    Contract = _Contract


contract = _ContractNs()
public = _Public()

TRANSFERS: list = []


class _Evm:
    @staticmethod
    def contract_interface(cls):
        class _Proxy:
            def __init__(self, addr):
                self.addr = addr

            def emit_transfer(self, *, value):
                TRANSFERS.append((self.addr.as_hex.lower(), int(value)))
        return _Proxy


evm = _Evm()


class _Web:
    pages: dict = {}

    @classmethod
    def render(cls, url, mode="text"):
        if url not in cls.pages:
            raise RuntimeError("unreachable")
        return cls.pages[url]


class _Nondet:
    web = _Web
    reply = ""
    prompts: list = []

    @classmethod
    def exec_prompt(cls, task):
        cls.prompts.append(task)
        value = cls.reply
        return value(task) if callable(value) else value


nondet = _Nondet


class _Eq:
    @staticmethod
    def prompt_comparative(fn, criteria):
        return fn()

    @staticmethod
    def strict_eq(fn):
        return fn()


eq_principle = _Eq()
