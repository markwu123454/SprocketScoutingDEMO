import csv
from typing import Dict
import random
import string


# Load Team Data from CSV
def load_team_data(file_path: str) -> Dict[int, str]:
    """
    Loads team data from a CSV file into a dictionary with team number as the key and nickname as the value.

    Args:
        file_path: Path to the CSV file containing team data.

    Returns:
        Dictionary of team numbers and their respective nicknames.
    """
    team_data = {}
    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            number = int(row["team_number"])
            nickname = row["nickname"]
            team_data[number] = nickname
    return team_data


def generate_frc_password(team_number: int, nickname: str, desired_length: int | None = None, randomness: float = 1.0) -> str:
    randomness = max(0.0, min(1.0, randomness))

    # === Helper: best in-order subset of words that fits ===
    def best_word_subset(nickname: str, max_len: int) -> str:
        words = [w for w in nickname.split() if w.isalnum()]
        best = ""
        n = len(words)
        for i in range(1, n + 1):
            for start in range(n - i + 1):
                subset = words[start:start + i]
                total_len = sum(len(w) for w in subset)
                if total_len <= max_len and total_len > len(best):
                    best = ''.join(subset)
        return best or "Team"

    # === Helper: leetify characters ===
    LEET_MAP = {'a': '@', 'A': '@', 'e': '3', 'E': '3', 'i': '1', 'I': '1',
                'l': '!', 'L': '!', 'o': '0', 'O': '0', 's': '$', 'S': '$', 't': '7', 'T': '7'}
    def leetify_char(c: str, p: float) -> str:
        return LEET_MAP[c] if c in LEET_MAP and random.random() < p else c

    # === Helper: scramble string ===
    def scramble_string(s: str, r: float) -> str:
        leetified = [leetify_char(c, r) for c in s]
        n_shuffle = round(len(leetified) * r)
        indices = random.sample(range(len(leetified)), k=n_shuffle)
        shuffled = [leetified[i] for i in indices]
        random.shuffle(shuffled)
        for i, idx in enumerate(indices):
            leetified[idx] = shuffled[i]
        return ''.join(leetified)

    # === Helper: scatter digits ===
    def scatter_digits(base: str, digits: list[str]) -> str:
        base_chars = list(base)
        insertion_indices = random.sample(range(len(base_chars) + 1), k=len(digits))
        for idx, digit in sorted(zip(insertion_indices, digits), reverse=True):
            base_chars.insert(idx, digit)
        return ''.join(base_chars)

    team_digits = list(str(team_number))

    if randomness == 1.0:
        final_len = desired_length or 14
        body_len = final_len - len(team_digits)
        rand_chars = ''.join(random.choices(string.ascii_letters + "!@#$%&*", k=body_len))
        return scatter_digits(rand_chars, random.choices(team_digits, k=len(team_digits)))[:final_len]

    # Reserve space for digits
    max_base_len = (desired_length - len(team_digits)) if desired_length else 999
    base = best_word_subset(nickname, max_base_len)
    scrambled = scramble_string(base.capitalize(), randomness)
    password = scatter_digits(scrambled, team_digits)

    if desired_length and len(password) < desired_length:
        filler = ''.join(random.choices(string.ascii_letters, k=desired_length - len(password)))
        password += filler

    return password[:desired_length] if desired_length else password
