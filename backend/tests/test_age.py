from datetime import date

from app.utils import calculate_age


def test_age_accounts_for_birthday_not_yet_reached():
    today = date(2026, 10, 25)
    assert calculate_age(date(2000, 10, 25), today=today) == 26
    assert calculate_age(date(2000, 10, 26), today=today) == 25
    assert calculate_age(date(2000, 12, 31), today=today) == 25
