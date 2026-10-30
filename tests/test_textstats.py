from token_tax_calculator.textstats import WHITESPACE, byte_count, char_count, stats, word_count, words


def test_arabic_clitics_are_one_word():
    assert word_count("وسيكتبونها") == 1
    assert word_count("والكتاب للطالب") == 2


def test_joiners():
    assert words("don't stop") == ["don't", "stop"]
    assert word_count("state-of-the-art") == 1
    assert word_count("1,000.50 riyals") == 2
    assert word_count("١٬٠٠٠٫٥") == 1
    assert word_count("a, b") == 2
    assert word_count("end-") == 1
    assert word_count("") == 0


def test_marks_stay_in_words():
    assert word_count("ذَهَبَ الطُّلَّابُ") == 2


def test_chars_and_bytes():
    assert char_count("مرحبا بالعالم\n") == 12
    assert char_count("a b c") == 3
    assert byte_count("مرحبا") == 10
    assert stats("abc")["sha256"].startswith("ba7816bf")


def test_whitespace_set_matches_python():
    expected = {chr(c) for c in range(0x110000) if chr(c).isspace()}
    assert WHITESPACE == expected
