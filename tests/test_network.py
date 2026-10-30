"""Download the tokenizer files at their pinned revisions (SHA-256 checked) and re-count the
fixtures. Set TOKEN_TAX_NETWORK=1 to run."""
import json
import os

import pytest

from token_tax_calculator.calc import load_registry
from token_tax_calculator.cli import fixture_counts

pytestmark = [pytest.mark.network,
              pytest.mark.skipif(os.environ.get("TOKEN_TAX_NETWORK") != "1", reason="set TOKEN_TAX_NETWORK=1")]


@pytest.mark.parametrize("tid", [t["id"] for t in load_registry()["tokenizers"]])
def test_fixture_counts_match(tid, fixtures, root):
    with open(os.path.join(root, "fixtures", "expected_counts.json"), encoding="utf-8") as f:
        exp = json.load(f)["tokenizers"][tid]["counts"]
    got = fixture_counts(fixtures, [tid])["tokenizers"][tid]["counts"]
    assert got == exp
