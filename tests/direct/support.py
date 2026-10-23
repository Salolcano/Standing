"""Runs contracts/standing.py against the offline SDK stand-in in tests/shim.

A failed call rolls the contract's storage back, as a reverted transaction
does on the network, so tests can assert that a refusal changed nothing."""
import copy
import datetime
import importlib.util
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests" / "shim"))

import genlayer as gl  # noqa: E402
from genlayer.types import Address, u256  # noqa: E402

BUYER = "0x1111111111111111111111111111111111111111"
SUPPLIER = "0x2222222222222222222222222222222222222222"
STRANGER = "0x3333333333333333333333333333333333333333"
T0 = 1_792_000_000  # a fixed "now" so the windows are reproducible
GEN = 10 ** 18


def load_module():
    spec = importlib.util.spec_from_file_location("standing_contract", ROOT / "contracts" / "standing.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Chain:
    def __init__(self):
        self.mod = load_module()
        cls = self.mod.Standing
        self.c = cls.__new__(cls)
        for name, ann in cls.__annotations__.items():
            if ann is gl.storage.TreeMap:
                setattr(self.c, name, gl.storage.TreeMap())
            elif ann is u256:
                setattr(self.c, name, u256(0))
            else:
                setattr(self.c, name, "")
        self.c.__init__()
        self.mod._wall_clock = lambda: None
        self.now = T0
        gl.TRANSFERS.clear()
        gl.nondet.web.pages = {}
        gl.nondet.prompts = []
        gl.nondet.reply = ""

    def _snapshot(self):
        return copy.deepcopy(self.c.__dict__)

    def send(self, method, *args, sender=BUYER, value=0, at=None, no_clock=False, clock="both"):
        gl.message.sender_address = Address(sender)
        gl.message.value = value
        when = self.now if at is None else at
        stamp = datetime.datetime.fromtimestamp(when, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        clock = "none" if no_clock else clock
        gl.message.datetime = stamp if clock in ("both", "message") else None
        gl.message_raw["datetime"] = stamp if clock in ("both", "raw") else None
        self.mod._wall_clock = (lambda: datetime.datetime.fromtimestamp(when, datetime.timezone.utc)) if clock == "wall" else (lambda: None)
        gl.TRANSFERS.clear()
        before = self._snapshot()
        try:
            return getattr(self.c, method)(*args)
        except gl.UserError:
            self.c.__dict__.clear()
            self.c.__dict__.update(before)
            raise

    def view(self, method, *args):
        return json.loads(getattr(self.c, method)(*args))

    @property
    def transfers(self):
        return list(gl.TRANSFERS)


def definition(**over):
    base = {
        "title": "Acme Components ISO 27001 standing",
        "description": "Acme must be able to show a current certificate and a filed audit.",
        "supplier": SUPPLIER,
        "requirements": [
            {"text": "A current ISO 27001 certificate is published.", "mandatory": True},
            {"text": "An audit report dated this year is filed.", "mandatory": True},
            {"text": "The policy page states a data retention limit.", "mandatory": False},
        ],
        "policy": {"min_publishers": 1, "challenge_seconds": 300, "allowed_domains": []},
        "payout_bps": {},
        "bond": str(GEN // 100),
        "deadline": T0 + 7200,
    }
    base.update(over)
    return json.dumps(base)


def reply(answers):
    """answers: {"R1": ("SATISFIED", "quote"), ...} -> what the model would say."""
    return json.dumps({"answers": [{"id": k, "status": v[0], "quote": v[1]} for k, v in answers.items()]})


PAGE = ("Acme Components certificate register. ISO 27001 certificate number 4411 is current until 2027. "
        "Audit report 2026 filed on 3 March 2026. Data is retained for no more than 90 days. "
        "Archive notice: certificate number 4411 expired on 30 June 2024 for the old site. "
        "No retention limit applies to archived records.")
Q1 = "ISO 27001 certificate number 4411 is current"
Q2 = "Audit report 2026 filed on 3 March 2026"
Q3 = "Data is retained for no more than 90 days"
N1 = "certificate number 4411 expired on 30 June 2024"
N3 = "No retention limit applies to archived records"
URL_A = "https://registry.example.org/acme/cert"
URL_B = "https://audits.example.net/acme/2026"


def active_standing(chain, **over):
    sid = chain.send("create_standing", definition(**over), sender=BUYER)
    chain.send("freeze_standing", sid, sender=BUYER)
    bond = int(json.loads(definition(**over))["bond"])
    chain.send("post_bond", sid, sender=SUPPLIER, value=bond)
    return sid


def with_evidence(chain, sid, urls=(URL_A,), sender=SUPPLIER):
    for url in urls:
        chain.send("submit_evidence", sid, json.dumps({"url": url, "kind": "CERTIFICATE", "label": "reg"}),
                   sender=sender)
