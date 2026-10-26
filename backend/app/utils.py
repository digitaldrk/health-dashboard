from datetime import date


def calculate_age(dob: date, today: date | None = None) -> int:
    today = today or date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


def format_long_date(value: date) -> str:
    return f"{value.strftime('%B')} {value.day}, {value.year}"
