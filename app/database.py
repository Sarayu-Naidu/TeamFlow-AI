"""SQLite connection helpers and database setup."""

import sqlite3
from pathlib import Path
from typing import Generator

DATABASE_PATH = Path(__file__).resolve().parent.parent / "teamflow.db"


def get_connection() -> sqlite3.Connection:
    """Open a connection and return rows that can be read by column name."""
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Provide one database connection to an API request."""
    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()


def initialize_database() -> None:
    """Create the tables the first time the application starts."""
    connection = get_connection()
    try:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                assigned_to TEXT NOT NULL,
                priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
                status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Blocked', 'Completed')),
                due_date TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            );
            """
        )
    finally:
        connection.close()

