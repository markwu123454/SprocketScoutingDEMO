import os
import tkinter as tk
from tkinter import filedialog, messagebox
import pandas as pd
import psycopg2
from psycopg2 import sql
from urllib.parse import urlparse


def get_conn_from_env():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set.")

    # Parse connection URL
    parsed = urlparse(db_url)
    return psycopg2.connect(
        dbname=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port or 5432,
        sslmode="require",
    )


def upload_csv_to_neon():
    file_path = filedialog.askopenfilename(filetypes=[("CSV files", "*.csv")])
    if not file_path:
        return

    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        messagebox.showerror("Error", f"Failed to read CSV:\n{e}")
        return

    table_name = table_entry.get().strip()
    if not table_name:
        messagebox.showwarning("Input Error", "Enter a table name first.")
        return

    try:
        conn = get_conn_from_env()
        cur = conn.cursor()

        # Get table columns from Neon
        cur.execute(
            sql.SQL("SELECT column_name FROM information_schema.columns WHERE table_name = %s"),
            [table_name],
        )
        table_cols = [row[0] for row in cur.fetchall()]

        if not table_cols:
            raise ValueError(f"Table '{table_name}' does not exist or is not accessible.")

        # Align DataFrame columns to table columns
        missing = [c for c in table_cols if c not in df.columns]
        for c in missing:
            df[c] = None  # fill missing with NULL

        # Only keep columns that exist in table
        df = df[table_cols]

        # Insert data
        placeholders = ", ".join(["%s"] * len(table_cols))
        insert_query = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
            sql.Identifier(table_name),
            sql.SQL(", ").join(map(sql.Identifier, table_cols)),
            sql.SQL(placeholders),
        )

        for _, row in df.iterrows():
            cur.execute(insert_query, tuple(row))

        conn.commit()
        messagebox.showinfo("Success", f"Inserted {len(df)} rows into '{table_name}'.")
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        messagebox.showerror("Error", str(e))
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()


# --- GUI setup ---
root = tk.Tk()
root.title("Upload CSV to Neon")
root.geometry("420x220")

tk.Label(root, text="Target Table Name:").pack(pady=5)
table_entry = tk.Entry(root, width=45)
table_entry.pack()

tk.Button(root, text="Select CSV and Upload", command=upload_csv_to_neon).pack(pady=25)

root.mainloop()
