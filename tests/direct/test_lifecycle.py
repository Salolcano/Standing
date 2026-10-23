import datetime
import json
import unittest

from tests.direct.support import *  # noqa: F401,F403
from tests.direct import support as S
import genlayer as gl


class Lifecycle(unittest.TestCase):
    def setUp(self):
        self.chain = S.Chain()

    def test_create_freeze_bond(self):
        c = self.chain
        sid = c.send("create_standing", S.definition(), sender=S.BUYER)
        self.assertEqual(sid, "S1")
        st = c.view("get_standing", sid)["standing"]
        self.assertEqual(st["state"], "DRAFT")
        self.assertEqual(st["buyer"], S.BUYER)
        self.assertEqual([r["id"] for r in st["requirements"]], ["R1", "R2", "R3"])
        self.assertEqual(c.send("freeze_standing", sid, sender=S.BUYER), "AWAITING_BOND")
        st = c.view("get_standing", sid)["standing"]
        self.assertEqual(len(st["fingerprint"]), 64)
        bond = S.GEN // 100
        self.assertEqual(c.send("post_bond", sid, sender=S.SUPPLIER, value=bond), "ACTIVE")
        self.assertEqual(c.view("get_summary")["custody"], str(bond))

    def test_only_buyer_freezes_and_only_a_draft(self):
        c = self.chain
        sid = c.send("create_standing", S.definition(), sender=S.BUYER)
        with self.assertRaises(gl.UserError):
            c.send("freeze_standing", sid, sender=S.STRANGER)
        c.send("freeze_standing", sid, sender=S.BUYER)
        with self.assertRaises(gl.UserError):
            c.send("freeze_standing", sid, sender=S.BUYER)

    def test_freeze_needs_a_deadline_ten_minutes_ahead(self):
        c = self.chain
        sid = c.send("create_standing", S.definition(deadline=S.T0 + 300), sender=S.BUYER)
        with self.assertRaises(gl.UserError):
            c.send("freeze_standing", sid, sender=S.BUYER)

    def test_wrong_bond_is_refunded_and_changes_nothing(self):
        c = self.chain
        sid = c.send("create_standing", S.definition(), sender=S.BUYER)
        c.send("freeze_standing", sid, sender=S.BUYER)
        bond = S.GEN // 100
        out = c.send("post_bond", sid, sender=S.SUPPLIER, value=bond - 1)
        self.assertTrue(out.startswith("[REFUNDED]"))
        self.assertEqual(c.transfers, [(S.SUPPLIER, bond - 1)])
        self.assertEqual(c.view("get_standing", sid)["standing"]["state"], "AWAITING_BOND")

    def test_a_stranger_cannot_post_the_bond(self):
        c = self.chain
        sid = c.send("create_standing", S.definition(), sender=S.BUYER)
        c.send("freeze_standing", sid, sender=S.BUYER)
        bond = S.GEN // 100
        out = c.send("post_bond", sid, sender=S.STRANGER, value=bond)
        self.assertTrue(out.startswith("[REFUNDED]"))
        self.assertEqual(c.transfers, [(S.STRANGER, bond)])
        self.assertEqual(c.view("get_summary")["custody"], "0")

    def test_bond_before_freeze_is_refunded(self):
        c = self.chain
        sid = c.send("create_standing", S.definition(), sender=S.BUYER)
        out = c.send("post_bond", sid, sender=S.SUPPLIER, value=S.GEN // 100)
        self.assertTrue(out.startswith("[REFUNDED]"))

    def test_cancel_before_a_bond_and_after(self):
        c = self.chain
        sid = c.send("create_standing", S.definition(), sender=S.BUYER)
        with self.assertRaises(gl.UserError):
            c.send("cancel_standing", sid, sender=S.STRANGER)
        self.assertEqual(c.send("cancel_standing", sid, sender=S.BUYER), "CANCELLED")
        sid2 = S.active_standing(c)
        self.assertEqual(c.send("cancel_standing", sid2, sender=S.BUYER), "CANCELLED")
        self.assertEqual(c.transfers, [(S.SUPPLIER, S.GEN // 100)])
        self.assertEqual(c.view("get_summary")["custody"], "0")

    def test_no_cancel_once_evidence_exists(self):
        c = self.chain
        sid = S.active_standing(c)
        S.with_evidence(c, sid)
        with self.assertRaises(gl.UserError):
            c.send("cancel_standing", sid, sender=S.BUYER)


class Definition(unittest.TestCase):
    def setUp(self):
        self.chain = S.Chain()

    def bad(self, **over):
        with self.assertRaises(gl.UserError):
            self.chain.send("create_standing", S.definition(**over), sender=S.BUYER)

    def test_rejections(self):
        self.bad(title="")
        self.bad(supplier="not-an-address")
        self.bad(requirements=[])
        self.bad(requirements=[{"text": "x", "mandatory": False}])
        self.bad(requirements=[{"text": "x <<< y", "mandatory": True}])
        self.bad(requirements=[{"text": "r", "mandatory": True}] * 9)
        self.bad(bond="1")
        self.bad(bond=str(10 ** 25))
        self.bad(deadline=S.T0 - 5)
        self.bad(deadline=S.T0 + 400 * 86400)
        self.bad(payout_bps={"VERIFIED": 10001})
        self.bad(payout_bps={"MADE_UP": 5})
        self.bad(payout_bps={"PROTOCOL_DEVIATION": 5})
        self.bad(policy={"min_publishers": 0})
        self.bad(policy={"min_publishers": 9})
        self.bad(policy={"challenge_seconds": 31 * 86400})
        self.bad(policy={"allowed_domains": ["notadomain"]})

    def test_not_json(self):
        with self.assertRaises(gl.UserError):
            self.chain.send("create_standing", "{oops", sender=S.BUYER)

    def test_a_refused_create_does_not_consume_an_id(self):
        c = self.chain
        self.bad(title="")
        self.assertEqual(c.send("create_standing", S.definition(), sender=S.BUYER), "S1")


class Clock(unittest.TestCase):
    def test_everything_that_needs_time_refuses_without_it(self):
        c = S.Chain()
        with self.assertRaises(gl.UserError):
            c.send("create_standing", S.definition(), sender=S.BUYER, no_clock=True)
        sid = c.send("create_standing", S.definition(), sender=S.BUYER)
        with self.assertRaises(gl.UserError):
            c.send("freeze_standing", sid, sender=S.BUYER, no_clock=True)
        c.send("freeze_standing", sid, sender=S.BUYER)
        out = c.send("post_bond", sid, sender=S.SUPPLIER, value=S.GEN // 100, no_clock=True)
        self.assertTrue(out.startswith("[REFUNDED]"))
        self.assertEqual(c.transfers, [(S.SUPPLIER, S.GEN // 100)])

    def test_accept_cannot_skip_the_challenge_period_without_a_clock(self):
        c = S.Chain()
        gl.nondet.web.pages = {S.URL_A: S.PAGE}
        sid = S.active_standing(c)
        S.with_evidence(c, sid)
        gl.nondet.reply = S.reply({"R1": ("SATISFIED", S.Q1), "R2": ("SATISFIED", S.Q2), "R3": ("SATISFIED", S.Q3)})
        c.send("request_verification", sid)
        with self.assertRaises(gl.UserError):
            c.send("accept_verification", sid, no_clock=True)
        with self.assertRaises(gl.UserError):
            c.send("recover_standing", sid, no_clock=True)

    def test_the_recorded_times_are_real(self):
        c = S.Chain()
        sid = S.active_standing(c)
        st = c.view("get_standing", sid)["standing"]
        self.assertEqual(st["created_at"], S.T0)
        self.assertEqual(st["frozen_at"], S.T0)


class ClockSources(unittest.TestCase):
    """The runtime may expose the transaction time in several places; any one is enough."""

    def created_at(self, clock):
        c = S.Chain()
        sid = c.send("create_standing", S.definition(), sender=S.BUYER, clock=clock)
        return c.view("get_standing", sid)["standing"]["created_at"]

    def test_each_source_is_enough_on_its_own(self):
        for clock in ("both", "message", "raw", "wall"):
            self.assertEqual(self.created_at(clock), S.T0, msg=clock)

    def test_no_source_means_refusal(self):
        with self.assertRaises(gl.UserError):
            self.created_at("none")

    def test_other_shapes_of_a_time_are_understood(self):
        mod = S.load_module()
        self.assertEqual(mod._as_unix(S.T0), S.T0)
        self.assertEqual(mod._as_unix(float(S.T0)), S.T0)
        self.assertEqual(mod._as_unix("2026-10-23T07:13:21Z"), 1792739601)
        self.assertEqual(mod._as_unix("2026-10-23T07:13:21+00:00"), 1792739601)
        self.assertEqual(mod._as_unix("2026-10-23 07:13:21.123456"), 1792739601)
        self.assertEqual(mod._as_unix(datetime.datetime(2026, 10, 23, 7, 13, 21, tzinfo=datetime.timezone.utc)), 1792739601)
        for bad in (None, "", "yesterday", 0, 5, True):
            self.assertEqual(mod._as_unix(bad), 0, msg=str(bad))


class Closure(unittest.TestCase):
    def test_the_consensus_blocks_use_no_module_level_function(self):
        """Module-level functions cannot be shipped into the validator sandbox. Every global name the
        consensus helpers touch must be a module (gl, json), never a function defined in the contract."""
        import dis
        mod = S.load_module()
        probe, judge = mod._make_toolkit()
        module_functions = {n for n, v in vars(mod).items() if callable(v) and getattr(v, "__module__", None) == mod.__name__}
        seen = set()
        stack = [probe, judge]
        while stack:
            fn = stack.pop()
            for ins in dis.get_instructions(fn):
                if ins.opname in ("LOAD_GLOBAL", "LOAD_NAME"):
                    seen.add(ins.argval)
            for const in fn.__code__.co_consts:
                if hasattr(const, "co_code"):
                    for ins in dis.get_instructions(const):
                        if ins.opname in ("LOAD_GLOBAL", "LOAD_NAME"):
                            seen.add(ins.argval)
            for cell in (fn.__closure__ or ()):
                value = cell.cell_contents
                if callable(value) and getattr(value, "__module__", None) == mod.__name__ and getattr(value, "__closure__", None) is not None and value not in stack:
                    stack.append(value)
        self.assertEqual(seen & module_functions, set(), msg=f"module-level functions used: {seen & module_functions}")
