import json
import unittest

from tests.direct import support as S
import genlayer as gl


class Evidence(unittest.TestCase):
    def setUp(self):
        self.chain = S.Chain()
        self.sid = S.active_standing(self.chain)

    def put(self, url, sender=S.SUPPLIER, **extra):
        body = {"url": url, "kind": "CERTIFICATE", "label": "x"}
        body.update(extra)
        return self.chain.send("submit_evidence", self.sid, json.dumps(body), sender=sender)

    def rows(self):
        return self.chain.view("get_standing", self.sid)["evidence"]

    def test_registers_and_moves_state(self):
        self.assertEqual(self.put(S.URL_A), "E1")
        view = self.chain.view("get_standing", self.sid)
        self.assertEqual(view["standing"]["state"], "EVIDENCE_SUBMITTED")
        self.assertEqual(view["evidence"][0]["publisher"], "example.org")
        self.assertEqual(view["evidence"][0]["submitter"], S.SUPPLIER)

    def test_only_the_two_parties_may_register(self):
        with self.assertRaises(gl.UserError):
            self.put(S.URL_A, sender=S.STRANGER)
        self.assertEqual(self.put(S.URL_A, sender=S.BUYER), "E1")

    def test_refusals(self):
        for bad in ("http://registry.example.org/x", "https://127.0.0.1/x", "https://localhost/x",
                    "https://user@example.org/x", "https://example.org:8080/x", "ftp://example.org/x",
                    "https://nodot/x", ""):
            with self.assertRaises(gl.UserError, msg=bad):
                self.put(bad)
        with self.assertRaises(gl.UserError):
            self.put(S.URL_A, kind="NOPE")

    def test_duplicates_and_cap(self):
        self.put(S.URL_A)
        with self.assertRaises(gl.UserError):
            self.put(S.URL_A.upper().replace("HTTPS", "https"))
        for i in range(4):
            self.put(f"https://site{i}.example.com/p")
        with self.assertRaises(gl.UserError):
            self.put("https://one-too-many.example.com/p")

    def test_publisher_rules(self):
        self.put("https://raw.githubusercontent.com/acme/repo/main/CERT.md")
        self.put("https://github.com/acme/repo/blob/main/AUDIT.md")
        self.put("https://www.cert.example.co.uk/a")
        self.assertEqual([r["publisher"] for r in self.rows()], ["github:acme", "github:acme", "example.co.uk"])

    def test_allowed_domains(self):
        sid = S.active_standing(self.chain, policy={"allowed_domains": ["example.org"]})
        ok = json.dumps({"url": "https://www.example.org/a", "kind": "AUDIT"})
        self.chain.send("submit_evidence", sid, ok, sender=S.BUYER)
        with self.assertRaises(gl.UserError):
            self.chain.send("submit_evidence", sid, json.dumps({"url": "https://evil-example.org/a", "kind": "AUDIT"}),
                            sender=S.BUYER)

    def test_grace_window_after_the_deadline(self):
        body = json.dumps({"url": S.URL_A, "kind": "AUDIT"})
        self.chain.send("submit_evidence", self.sid, body, sender=S.SUPPLIER, at=S.T0 + 8000)  # inside the grace hour
        with self.assertRaises(gl.UserError):
            self.chain.send("submit_evidence", self.sid, json.dumps({"url": S.URL_B, "kind": "AUDIT"}),
                            sender=S.SUPPLIER, at=S.T0 + 7200 + 3601)

    def test_not_open_before_a_bond(self):
        sid = self.chain.send("create_standing", S.definition(), sender=S.BUYER)
        with self.assertRaises(gl.UserError):
            self.chain.send("submit_evidence", sid, json.dumps({"url": S.URL_A, "kind": "AUDIT"}))


class Replacement(unittest.TestCase):
    def setUp(self):
        self.chain = S.Chain()
        self.sid = S.active_standing(self.chain)
        S.with_evidence(self.chain, self.sid, (S.URL_A,), sender=S.BUYER)

    def swap(self, sender, url, eid="E1", **kw):
        return self.chain.send("replace_evidence", self.sid, eid, json.dumps({"url": url, "kind": "AUDIT"}),
                               sender=sender, **kw)

    def test_the_supplier_may_replace_an_item_the_buyer_registered(self):
        self.swap(S.SUPPLIER, S.URL_B)
        row = self.chain.view("get_standing", self.sid)["evidence"][0]
        self.assertEqual(row["url"], S.URL_B)
        self.assertEqual(row["previous"], [S.URL_A])

    def test_the_buyer_may_not_replace_the_suppliers_item(self):
        self.chain.send("submit_evidence", self.sid, json.dumps({"url": S.URL_B, "kind": "AUDIT"}), sender=S.SUPPLIER)
        with self.assertRaises(gl.UserError):
            self.swap(S.BUYER, "https://other.example.com/x", eid="E2")
        self.swap(S.BUYER, "https://other.example.com/x", eid="E1")

    def test_strangers_and_unknown_items_are_refused(self):
        with self.assertRaises(gl.UserError):
            self.swap(S.STRANGER, S.URL_B)
        with self.assertRaises(gl.UserError):
            self.swap(S.SUPPLIER, S.URL_B, eid="E9")

    def test_replacements_are_capped(self):
        for i in range(6):
            self.swap(S.SUPPLIER, f"https://swap{i}.example.com/p")
        with self.assertRaises(gl.UserError):
            self.swap(S.SUPPLIER, "https://swap-last.example.com/p")

    def test_replacing_may_not_collide_with_another_item(self):
        self.chain.send("submit_evidence", self.sid, json.dumps({"url": S.URL_B, "kind": "AUDIT"}), sender=S.SUPPLIER)
        with self.assertRaises(gl.UserError):
            self.swap(S.SUPPLIER, S.URL_B, eid="E1")
        self.swap(S.SUPPLIER, S.URL_A, eid="E1")  # the same address as it already has is not a collision
