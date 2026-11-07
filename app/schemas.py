"""Pydantic request and response models for the API."""

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Priority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class TaskStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    BLOCKED = "Blocked"
    COMPLETED = "Completed"


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Project name cannot be blank")
        return value


class Project(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    assigned_to: str = Field(min_length=1, max_length=120)
    priority: Priority = Priority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    due_date: date

    @field_validator("title", "assigned_to")
    @classmethod
    def required_text_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    assigned_to: str | None = Field(default=None, min_length=1, max_length=120)
    priority: Priority | None = None
    status: TaskStatus | None = None
    due_date: date | None = None

    @field_validator("title", "assigned_to")
    @classmethod
    def updated_required_text_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class Task(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    assigned_to: str
    priority: Priority
    status: TaskStatus
    due_date: date
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ProjectReport(BaseModel):
    project_id: int
    project_name: str
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    blocked_tasks: int
    overdue_tasks: int
